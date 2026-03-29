/**
 * Progress Routes
 * Server-Sent Events (SSE) for real-time progress updates
 */

import { Router } from 'express';
import { getJob, jobEvents } from '../queue/jobQueue.js';

const router = Router();

/**
 * GET /api/progress/:jobId
 * SSE endpoint for real-time job progress
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

    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    // Send initial state
    sendEvent(res, 'connected', { jobId, status: job.status });
    sendEvent(res, 'state', formatJobState(job));

    // Event handlers
    const onJobUpdated = (data) => {
        if (data.jobId === jobId) {
            sendEvent(res, 'progress', formatJobState(data.job));
        }
    };

    const onVideoProgress = (data) => {
        if (data.jobId === jobId) {
            sendEvent(res, 'video-progress', {
                videoIndex: data.videoIndex,
                videoTitle: data.video?.title,
                progress: data.progress,
                status: data.status
            });
        }
    };

    const onJobCompleted = (data) => {
        if (data.jobId === jobId) {
            sendEvent(res, 'complete', {
                zipPath: data.zipPath,
                status: 'completed'
            });
            cleanup();
        }
    };

    const onJobFailed = (data) => {
        if (data.jobId === jobId) {
            sendEvent(res, 'error', {
                error: data.error,
                status: 'failed'
            });
            cleanup();
        }
    };

    const onJobCancelled = (data) => {
        if (data.jobId === jobId) {
            sendEvent(res, 'cancelled', {
                status: 'cancelled'
            });
            cleanup();
        }
    };

    // Subscribe to events
    jobEvents.on('job:updated', onJobUpdated);
    jobEvents.on('job:video-progress', onVideoProgress);
    jobEvents.on('job:completed', onJobCompleted);
    jobEvents.on('job:failed', onJobFailed);
    jobEvents.on('job:cancelled', onJobCancelled);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        sendEvent(res, 'heartbeat', { timestamp: Date.now() });
    }, 30000);

    // Cleanup function
    function cleanup() {
        clearInterval(heartbeat);
        jobEvents.off('job:updated', onJobUpdated);
        jobEvents.off('job:video-progress', onVideoProgress);
        jobEvents.off('job:completed', onJobCompleted);
        jobEvents.off('job:failed', onJobFailed);
        jobEvents.off('job:cancelled', onJobCancelled);
    }

    // Handle client disconnect
    req.on('close', () => {
        console.log(`SSE connection closed for job: ${jobId}`);
        cleanup();
    });
});

/**
 * Sends an SSE event
 */
function sendEvent(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Formats job state for client consumption
 */
function formatJobState(job) {
    return {
        status: job.status,
        phase: job.phase,
        totalVideos: job.totalVideos,
        completedVideos: job.completedVideos,
        currentVideoIndex: job.currentVideoIndex,
        currentVideoTitle: job.currentVideoTitle,
        overallProgress: Math.round(job.overallProgress * 10) / 10,
        zipPath: job.zipPath,
        error: job.error
    };
}

export default router;
