/**
 * Download Orchestrator Service
 * Manages the complete download workflow: parse → download → zip
 */

import { join, basename } from 'path';
import { mkdir, rm, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { downloadVideo } from './ytdlp.js';
import { createZipStream } from './zipper.js';
import {
    getJob,
    updateJob,
    updateVideoStatus,
    completeJob,
    failJob,
    jobEvents
} from '../queue/jobQueue.js';
import { sanitizeFilename } from '../utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMP_DIR = process.env.TEMP_DIR || join(__dirname, '..', '..', 'temp');
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS) || 3;

// Track active download processes for cancellation
const activeDownloads = new Map();

/**
 * Processes a download job
 * @param {string} jobId - Job ID to process
 */
export async function processJob(jobId) {
    const job = getJob(jobId);
    if (!job) {
        console.error(`Job not found: ${jobId}`);
        return;
    }

    const jobDir = join(TEMP_DIR, jobId);
    const downloadDir = join(jobDir, 'downloads');
    const zipPath = join(jobDir, `${sanitizeFilename(job.playlistTitle || 'playlist')}.zip`);

    try {
        // Create job directory
        await mkdir(downloadDir, { recursive: true });

        updateJob(jobId, {
            status: 'processing',
            phase: 'downloading'
        });

        // Download videos sequentially (simpler for progress tracking)
        for (let i = 0; i < job.videos.length; i++) {
            const video = job.videos[i];

            // Check if job was cancelled
            const currentJob = getJob(jobId);
            if (currentJob.status === 'cancelled') {
                console.log(`Job ${jobId} was cancelled, stopping downloads`);
                await cleanup(jobDir);
                return;
            }

            updateJob(jobId, {
                currentVideoIndex: i,
                currentVideoTitle: video.title,
                phase: 'downloading'
            });

            updateVideoStatus(jobId, i, {
                status: 'downloading',
                progress: 0
            });

            try {
                await downloadSingleVideo(jobId, i, video, downloadDir, job.mode, job.globalQuality);

                updateVideoStatus(jobId, i, {
                    status: 'completed',
                    progress: 100
                });

                updateJob(jobId, {
                    completedVideos: i + 1,
                    currentVideoProgress: 0
                });

            } catch (err) {
                console.error(`Failed to download video ${video.id}:`, err.message);

                updateVideoStatus(jobId, i, {
                    status: 'failed',
                    error: err.message
                });

                // Continue with next video instead of failing entire job
                updateJob(jobId, {
                    completedVideos: i + 1
                });
            }
        }

        // Check if job was cancelled before zipping
        const currentJob = getJob(jobId);
        if (currentJob.status === 'cancelled') {
            await cleanup(jobDir);
            return;
        }

        // ZIP phase
        updateJob(jobId, {
            phase: 'zipping',
            currentVideoTitle: 'Creating ZIP archive...'
        });

        await createZipFromDownloads(jobId, downloadDir, zipPath);

        // Success!
        const zipFilename = basename(zipPath);
        completeJob(jobId, `/downloads/${jobId}/${zipFilename}`);

        console.log(`Job ${jobId} completed successfully`);

    } catch (err) {
        console.error(`Job ${jobId} failed:`, err);
        failJob(jobId, err.message);
        await cleanup(jobDir).catch(() => { });
    }
}

/**
 * Downloads a single video with progress tracking
 */
async function downloadSingleVideo(jobId, videoIndex, video, downloadDir, mode, quality) {
    return new Promise((resolve, reject) => {
        const ext = mode === 'audio-only' ? 'mp3' : 'mp4';
        const filename = `${sanitizeFilename(video.title)}.${ext}`;
        const outputPath = join(downloadDir, filename);

        // Format selection
        let format = null;
        if (video.selectedFormat) {
            format = video.selectedFormat;
        } else if (quality && quality !== 'best') {
            // Map quality labels to format selectors
            const qualityMap = {
                '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
                '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
                '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
                '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
                '1440p': 'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
                '4k': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]'
            };
            format = qualityMap[quality] || null;
        }

        const downloader = downloadVideo(video.id, {
            outputPath,
            format,
            mode
        });

        // Store reference for cancellation
        activeDownloads.set(`${jobId}-${videoIndex}`, downloader);

        downloader.on('progress', ({ progress }) => {
            updateVideoStatus(jobId, videoIndex, { progress });
            updateJob(jobId, { currentVideoProgress: progress });
        });

        downloader.on('complete', () => {
            activeDownloads.delete(`${jobId}-${videoIndex}`);
            resolve();
        });

        downloader.on('error', (err) => {
            activeDownloads.delete(`${jobId}-${videoIndex}`);
            reject(err);
        });

        downloader.on('cancelled', () => {
            activeDownloads.delete(`${jobId}-${videoIndex}`);
            reject(new Error('Download cancelled'));
        });
    });
}

/**
 * Creates a ZIP archive from downloaded files
 */
async function createZipFromDownloads(jobId, downloadDir, zipPath) {
    return new Promise(async (resolve, reject) => {
        try {
            const files = await readdir(downloadDir);

            if (files.length === 0) {
                reject(new Error('No files to zip'));
                return;
            }

            const zipper = createZipStream(zipPath);

            zipper.emitter.on('progress', ({ entries, totalEntries }) => {
                const progress = (entries / totalEntries) * 100;
                jobEvents.emit('job:updated', {
                    jobId,
                    job: getJob(jobId),
                    updates: { zipProgress: progress }
                });
            });

            zipper.emitter.on('complete', () => {
                resolve();
            });

            zipper.emitter.on('error', (err) => {
                reject(err);
            });

            // Add all downloaded files
            for (const file of files) {
                const filePath = join(downloadDir, file);
                zipper.addFile(filePath, file);
            }

            await zipper.finalize();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Cancels all active downloads for a job
 * @param {string} jobId - Job ID
 */
export function cancelJobDownloads(jobId) {
    for (const [key, downloader] of activeDownloads.entries()) {
        if (key.startsWith(jobId)) {
            downloader.cancel();
            activeDownloads.delete(key);
        }
    }
}

/**
 * Cleans up job directory
 */
async function cleanup(dir) {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
    }
}
