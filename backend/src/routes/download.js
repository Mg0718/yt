/**
 * Download Routes
 * Handles download job creation, status, and cancellation
 */

import { Router } from 'express';
import { createJob, getJob, cancelJob } from '../queue/jobQueue.js';
import { processJob, cancelJobDownloads } from '../services/downloader.js';
import { validateDownloadParams } from '../utils/validation.js';

const router = Router();

/**
 * POST /api/download
 * Creates a new download job
 */
router.post('/', async (req, res) => {
    try {
        const { videos, mode, globalQuality, playlistTitle } = req.body;

        // Validate request
        const validation = validateDownloadParams({ videos, mode, globalQuality });
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.error,
                code: 'INVALID_PARAMS'
            });
        }

        // Create job
        const job = createJob({
            videos,
            mode,
            globalQuality,
            playlistTitle
        });

        console.log(`Created download job: ${job.id} with ${videos.length} videos`);

        // Start processing in background
        setImmediate(() => {
            processJob(job.id).catch(err => {
                console.error(`Job processing error for ${job.id}:`, err);
            });
        });

        res.json({
            success: true,
            jobId: job.id,
            message: `Download job created for ${videos.length} video(s)`
        });

    } catch (err) {
        console.error('Download job creation error:', err);
        res.status(500).json({
            error: 'Failed to create download job',
            code: 'JOB_CREATION_ERROR'
        });
    }
});

/**
 * GET /api/download/:jobId
 * Gets job status
 */
router.get('/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
        return res.status(404).json({
            error: 'Job not found',
            code: 'JOB_NOT_FOUND'
        });
    }

    res.json({
        success: true,
        job: {
            id: job.id,
            status: job.status,
            phase: job.phase,
            totalVideos: job.totalVideos,
            completedVideos: job.completedVideos,
            currentVideoTitle: job.currentVideoTitle,
            overallProgress: job.overallProgress,
            zipPath: job.zipPath,
            error: job.error
        }
    });
});

/**
 * DELETE /api/download/:jobId
 * Cancels a download job
 */
router.delete('/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
        return res.status(404).json({
            error: 'Job not found',
            code: 'JOB_NOT_FOUND'
        });
    }

    // Cancel active downloads
    cancelJobDownloads(jobId);

    // Update job status
    const cancelled = cancelJob(jobId);

    if (!cancelled) {
        return res.status(400).json({
            error: 'Job cannot be cancelled (already finished)',
            code: 'CANNOT_CANCEL'
        });
    }

    console.log(`Cancelled job: ${jobId}`);

    res.json({
        success: true,
        message: 'Job cancelled'
    });
});

export default router;
