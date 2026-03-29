/**
 * Playlist Routes
 * Handles playlist URL parsing and metadata fetching
 */

import { Router } from 'express';
import { getPlaylistInfo, getVideoFormats } from '../services/ytdlp.js';
import { validatePlaylistUrl } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/playlist
 * Parses a playlist URL and returns metadata
 */
router.get('/', async (req, res, next) => {
    try {
        const { url } = req.query;

        // Validate URL
        const validation = validatePlaylistUrl(url);
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.error,
                code: 'INVALID_URL'
            });
        }

        const normalizedUrl = validation.normalizedUrl || url;
        console.log(`Parsing: ${normalizedUrl}`);

        // Fetch playlist info
        const playlistInfo = await getPlaylistInfo(normalizedUrl);

        res.json({
            success: true,
            playlist: playlistInfo,
            message: playlistInfo.videoCount > 20
                ? `Found ${playlistInfo.videoCount} videos. This may take a while to download.`
                : null
        });

    } catch (err) {
        console.error('Playlist parsing error:', err);

        if (err.message.includes('private') || err.message.includes('sign-in')) {
            return res.status(403).json({
                error: 'This playlist is private or requires authentication',
                code: 'PRIVATE_PLAYLIST'
            });
        }

        if (err.message.includes('not installed')) {
            return res.status(500).json({
                error: err.message,
                code: 'YTDLP_NOT_INSTALLED'
            });
        }

        res.status(500).json({
            error: 'Failed to parse playlist: ' + err.message,
            code: 'PARSE_ERROR'
        });
    }
});

/**
 * GET /api/playlist/formats/:videoId
 * Gets available formats for a specific video
 */
router.get('/formats/:videoId', async (req, res, next) => {
    try {
        const { videoId } = req.params;

        if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return res.status(400).json({
                error: 'Invalid video ID',
                code: 'INVALID_VIDEO_ID'
            });
        }

        console.log(`Fetching formats for video: ${videoId}`);

        const formats = await getVideoFormats(videoId);

        res.json({
            success: true,
            formats
        });

    } catch (err) {
        console.error('Format fetching error:', err);
        res.status(500).json({
            error: 'Failed to fetch video formats: ' + err.message,
            code: 'FORMAT_ERROR'
        });
    }
});

export default router;
