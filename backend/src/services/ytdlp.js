/**
 * yt-dlp Service
 * Wrapper around the yt-dlp CLI for video/playlist operations
 * 
 * Requires yt-dlp to be installed: brew install yt-dlp
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

/**
 * Executes yt-dlp with given arguments and returns JSON output
 * @param {string[]} args - Command line arguments
 * @returns {Promise<Object>} Parsed JSON output
 */
import { join } from 'path';

/**
 * Gets the path to the yt-dlp binary
 */
function getYtDlpPath() {
    if (process.env.ELECTRON_RESOURCES_PATH) {
        // In Electron (packaged or dev), uses the path passed from main process
        const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        return join(process.env.ELECTRON_RESOURCES_PATH, 'yt-dlp', binaryName);
    }
    // Fallback to system PATH
    return 'yt-dlp';
}

/**
 * Executes yt-dlp with given arguments and returns JSON output
 * @param {string[]} args - Command line arguments
 * @returns {Promise<Object>} Parsed JSON output
 */
async function execYtDlp(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(getYtDlpPath(), args);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                // Parse common error messages
                if (stderr.includes('Private video') || stderr.includes('Sign in to confirm')) {
                    reject(new Error('This playlist contains private videos or requires sign-in'));
                } else if (stderr.includes('not a valid URL')) {
                    reject(new Error('Invalid URL format'));
                } else if (stderr.includes('Incomplete YouTube ID')) {
                    reject(new Error('Invalid YouTube playlist ID'));
                } else {
                    reject(new Error(stderr || `yt-dlp exited with code ${code}`));
                }
                return;
            }

            try {
                // Handle multiple JSON objects (one per line)
                const lines = stdout.trim().split('\n').filter(Boolean);
                if (lines.length === 1) {
                    resolve(JSON.parse(lines[0]));
                } else {
                    resolve(lines.map(line => JSON.parse(line)));
                }
            } catch (e) {
                reject(new Error('Failed to parse yt-dlp output'));
            }
        });

        proc.on('error', (err) => {
            if (err.code === 'ENOENT') {
                reject(new Error('yt-dlp is not installed. Please install it with: brew install yt-dlp'));
            } else {
                reject(err);
            }
        });
    });
}

/**
 * Fetches playlist information including all videos
 * @param {string} url - Playlist URL
 * @returns {Promise<Object>} Playlist metadata and video list
 */
export async function getPlaylistInfo(url) {
    const args = [
        '--flat-playlist',      // Don't download, just get info
        '--dump-json',          // Output as JSON
        '--no-warnings',
        '--ignore-errors',      // Skip unavailable videos
        url
    ];

    const videos = await execYtDlp(args);
    const videoList = Array.isArray(videos) ? videos : [videos];

    // Extract playlist info from first video entry
    const playlistTitle = videoList[0]?.playlist_title || 'Playlist';

    return {
        title: playlistTitle,
        videoCount: videoList.length,
        videos: videoList.map(video => ({
            id: video.id,
            title: video.title || 'Untitled',
            duration: video.duration || 0,
            durationFormatted: formatDuration(video.duration),
            thumbnail: video.thumbnail || video.thumbnails?.[0]?.url || null,
            uploader: video.uploader || video.channel || 'Unknown'
        }))
    };
}

/**
 * Gets detailed format information for a specific video
 * @param {string} videoId - Video ID
 * @returns {Promise<Object>} Available formats
 */
export async function getVideoFormats(videoId) {
    const args = [
        '--dump-json',
        '--no-download',
        '--no-warnings',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    const info = await execYtDlp(args);

    // Group formats by type
    const videoFormats = [];
    const audioFormats = [];

    for (const format of info.formats || []) {
        // Skip formats without proper info
        if (!format.format_id) continue;

        // Skip storyboard/mhtml formats
        if (format.format_note?.includes('storyboard')) continue;
        if (format.ext === 'mhtml') continue;

        const formatInfo = {
            formatId: format.format_id,
            ext: format.ext,
            filesize: format.filesize || format.filesize_approx || null,
            filesizeFormatted: formatFilesize(format.filesize || format.filesize_approx),
            codec: format.vcodec !== 'none' ? format.vcodec : format.acodec
        };

        if (format.vcodec && format.vcodec !== 'none') {
            // Video format
            videoFormats.push({
                ...formatInfo,
                type: 'video',
                resolution: format.resolution || `${format.width}x${format.height}`,
                height: format.height,
                fps: format.fps,
                quality: getQualityLabel(format.height)
            });
        } else if (format.acodec && format.acodec !== 'none') {
            // Audio format
            audioFormats.push({
                ...formatInfo,
                type: 'audio',
                bitrate: format.abr || format.tbr,
                bitrateFormatted: format.abr ? `${Math.round(format.abr)}kbps` : null
            });
        }
    }

    // Sort by quality (highest first)
    videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
    audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    // Remove duplicates and keep best options
    const uniqueVideoFormats = deduplicateFormats(videoFormats, 'height');
    const uniqueAudioFormats = deduplicateFormats(audioFormats, 'bitrate');

    return {
        videoId: info.id,
        title: info.title,
        duration: info.duration,
        videoFormats: uniqueVideoFormats.slice(0, 6), // Top 6 video qualities
        audioFormats: uniqueAudioFormats.slice(0, 4)  // Top 4 audio qualities
    };
}

/**
 * Downloads a video with progress tracking
 * @param {string} videoId - Video ID  
 * @param {Object} options - Download options
 * @returns {EventEmitter} Progress emitter
 */
export function downloadVideo(videoId, options) {
    const { outputPath, format, mode } = options;
    const emitter = new EventEmitter();

    const args = [
        '--no-warnings',
        '--newline',           // Progress on new lines for parsing
        '--progress-template', '%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
        '-o', outputPath
    ];

    // Format selection based on mode
    if (mode === 'audio-only') {
        // Audio only - extract and convert to MP3
        args.push('-x');                    // Extract audio
        args.push('--audio-format', 'mp3'); // Convert to MP3
        args.push('--audio-quality', '0');  // Best quality
        if (format) {
            args.push('-f', `bestaudio[ext=m4a]/bestaudio/best`);
        } else {
            args.push('-f', 'bestaudio/best');
        }
    } else if (mode === 'video-only') {
        // Video only - no audio track
        if (format) {
            args.push('-f', format);
        } else {
            args.push('-f', 'bestvideo[ext=mp4]/bestvideo/best');
        }
        args.push('--merge-output-format', 'mp4');
    } else {
        // video+audio mode (default) - merge video and audio into single file
        if (format) {
            // User selected specific format - still merge with best audio
            args.push('-f', `${format}+bestaudio/best`);
        } else {
            // Best video + audio merged - this ensures they're combined
            args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best');
        }
        args.push('--merge-output-format', 'mp4');
    }

    args.push(`https://www.youtube.com/watch?v=${videoId}`);

    const proc = spawn(getYtDlpPath(), args);
    let lastProgress = 0;

    proc.stdout.on('data', (data) => {
        const line = data.toString().trim();

        // Parse progress output
        if (line.includes('%')) {
            const match = line.match(/([\d.]+)%/);
            if (match) {
                const progress = parseFloat(match[1]);
                if (progress > lastProgress) {
                    lastProgress = progress;
                    emitter.emit('progress', { progress, line });
                }
            }
        }
    });

    proc.stderr.on('data', (data) => {
        const line = data.toString().trim();
        // Only emit actual errors, not warnings
        if (line.toLowerCase().includes('error')) {
            emitter.emit('error', new Error(line));
        }
    });

    proc.on('close', (code) => {
        if (code === 0) {
            emitter.emit('complete');
        } else {
            emitter.emit('error', new Error(`Download failed with code ${code}`));
        }
    });

    proc.on('error', (err) => {
        emitter.emit('error', err);
    });

    // Allow cancellation
    emitter.cancel = () => {
        proc.kill('SIGTERM');
        emitter.emit('cancelled');
    };

    return emitter;
}

// Helper functions

function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFilesize(bytes) {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
}

function getQualityLabel(height) {
    if (!height) return 'Unknown';
    if (height >= 2160) return '4K';
    if (height >= 1440) return '1440p';
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    if (height >= 360) return '360p';
    return `${height}p`;
}

function deduplicateFormats(formats, key) {
    const seen = new Set();
    return formats.filter(f => {
        const value = f[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}
