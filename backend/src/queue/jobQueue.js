/**
 * Job Queue Service
 * Persistent job management for download tasks with file-based storage
 * 
 * Job states: pending → processing → completed | failed | cancelled
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory job storage
const jobs = new Map();

// Event emitter for job updates
export const jobEvents = new EventEmitter();
jobEvents.setMaxListeners(100); // Allow many SSE connections

// Persistence path
const JOBS_DIR = process.env.TEMP_DIR || join(__dirname, '..', '..', 'temp');
const JOBS_FILE = join(JOBS_DIR, 'jobs.json');

// Cleanup interval (remove completed jobs after 1 hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const JOB_RETENTION = 60 * 60 * 1000;    // 1 hour

// Save jobs to disk for persistence
async function persistJobs() {
    try {
        await mkdir(JOBS_DIR, { recursive: true });
        const jobsArray = Array.from(jobs.entries()).map(([id, job]) => ({ id, ...job }));
        await writeFile(JOBS_FILE, JSON.stringify(jobsArray, null, 2));
    } catch (err) {
        console.error('Failed to persist jobs:', err.message);
    }
}

// Load jobs from disk on startup
async function loadPersistedJobs() {
    try {
        if (existsSync(JOBS_FILE)) {
            const data = await readFile(JOBS_FILE, 'utf-8');
            const jobsArray = JSON.parse(data);
            for (const job of jobsArray) {
                // Only restore active jobs (not completed/failed/cancelled)
                if (['pending', 'processing'].includes(job.status)) {
                    // Mark as needing resume
                    job.needsResume = true;
                    jobs.set(job.id, job);
                } else if (['completed'].includes(job.status) && job.zipPath) {
                    // Keep completed jobs for download
                    jobs.set(job.id, job);
                }
            }
            console.log(`Loaded ${jobs.size} jobs from disk`);
        }
    } catch (err) {
        console.error('Failed to load persisted jobs:', err.message);
    }
}

// Load on module init
loadPersistedJobs();

/**
 * Creates a new download job
 * @param {Object} params - Job parameters
 * @returns {Object} Created job
 */
export function createJob(params) {
    const { videos, mode, globalQuality, playlistTitle, estimatedSize } = params;

    const jobId = uuidv4();
    const job = {
        id: jobId,
        status: 'pending',
        mode,
        globalQuality,
        playlistTitle,
        videos: videos.map(v => ({
            ...v,
            status: 'pending',
            progress: 0,
            downloadedBytes: 0,
            totalBytes: v.estimatedSize || 0
        })),
        totalVideos: videos.length,
        completedVideos: 0,
        currentVideoIndex: -1,
        currentVideoTitle: null,
        overallProgress: 0,
        phase: 'queued',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        startedAt: null,
        zipPath: null,
        error: null,
        // Size and speed tracking
        totalBytes: estimatedSize || 0,
        downloadedBytes: 0,
        currentSpeed: 0,    // bytes per second
        averageSpeed: 0,    // bytes per second
        estimatedTimeRemaining: null, // seconds
        speedSamples: []    // for calculating average
    };

    jobs.set(jobId, job);
    jobEvents.emit('job:created', { jobId, job });
    persistJobs();

    return job;
}

/**
 * Gets a job by ID
 * @param {string} jobId - Job ID
 * @returns {Object|null} Job or null if not found
 */
export function getJob(jobId) {
    return jobs.get(jobId) || null;
}

/**
 * Updates a job's status and progress
 * @param {string} jobId - Job ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated job
 */
export function updateJob(jobId, updates) {
    const job = jobs.get(jobId);
    if (!job) return null;

    Object.assign(job, updates, { updatedAt: Date.now() });

    // Set startedAt on first processing
    if (updates.status === 'processing' && !job.startedAt) {
        job.startedAt = Date.now();
    }

    // Calculate overall progress
    if (updates.completedVideos !== undefined || updates.currentVideoProgress !== undefined) {
        const completedProgress = (job.completedVideos / job.totalVideos) * 100;
        const currentProgress = ((job.currentVideoProgress || 0) / job.totalVideos);
        job.overallProgress = Math.min(100, completedProgress + currentProgress);
    }

    // Calculate speed and ETA
    if (updates.currentSpeed !== undefined) {
        // Add to speed samples (keep last 10 for averaging)
        job.speedSamples.push(updates.currentSpeed);
        if (job.speedSamples.length > 10) {
            job.speedSamples.shift();
        }

        // Calculate average speed
        job.averageSpeed = job.speedSamples.reduce((a, b) => a + b, 0) / job.speedSamples.length;

        // Calculate ETA
        if (job.averageSpeed > 0 && job.totalBytes > 0) {
            const remainingBytes = job.totalBytes - job.downloadedBytes;
            job.estimatedTimeRemaining = Math.ceil(remainingBytes / job.averageSpeed);
        }
    }

    jobEvents.emit('job:updated', { jobId, job, updates });

    // Persist periodically (every 5 seconds worth of updates)
    if (!job._lastPersist || Date.now() - job._lastPersist > 5000) {
        job._lastPersist = Date.now();
        persistJobs();
    }

    return job;
}

/**
 * Updates a specific video's status within a job
 * @param {string} jobId - Job ID
 * @param {number} videoIndex - Video index
 * @param {Object} updates - Video updates
 */
export function updateVideoStatus(jobId, videoIndex, updates) {
    const job = jobs.get(jobId);
    if (!job || !job.videos[videoIndex]) return null;

    Object.assign(job.videos[videoIndex], updates);
    job.updatedAt = Date.now();

    // Update downloaded bytes
    if (updates.downloadedBytes !== undefined) {
        let totalDownloaded = 0;
        for (const video of job.videos) {
            totalDownloaded += video.downloadedBytes || 0;
        }
        job.downloadedBytes = totalDownloaded;
    }

    // Emit progress event with video-specific info
    jobEvents.emit('job:video-progress', {
        jobId,
        videoIndex,
        video: job.videos[videoIndex],
        ...updates
    });

    return job;
}

/**
 * Marks a job as completed
 * @param {string} jobId - Job ID
 * @param {string} zipPath - Path to generated ZIP file
 * @param {number} finalSize - Final ZIP file size in bytes
 */
export function completeJob(jobId, zipPath, finalSize) {
    const job = updateJob(jobId, {
        status: 'completed',
        phase: 'complete',
        overallProgress: 100,
        zipPath,
        finalSize: finalSize || 0,
        estimatedTimeRemaining: 0
    });

    if (job) {
        jobEvents.emit('job:completed', { jobId, job, zipPath });
        persistJobs();
    }

    return job;
}

/**
 * Marks a job as failed
 * @param {string} jobId - Job ID
 * @param {string} error - Error message
 */
export function failJob(jobId, error) {
    const job = updateJob(jobId, {
        status: 'failed',
        phase: 'error',
        error
    });

    if (job) {
        jobEvents.emit('job:failed', { jobId, job, error });
        persistJobs();
    }

    return job;
}

/**
 * Cancels a job
 * @param {string} jobId - Job ID
 * @returns {boolean} Whether cancellation was successful
 */
export function cancelJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'completed' || job.status === 'failed') {
        return false; // Can't cancel finished jobs
    }

    updateJob(jobId, {
        status: 'cancelled',
        phase: 'cancelled'
    });

    jobEvents.emit('job:cancelled', { jobId, job });
    persistJobs();

    return true;
}

/**
 * Gets all jobs (for debugging/monitoring)
 * @returns {Object[]} All jobs
 */
export function getAllJobs() {
    return Array.from(jobs.values());
}

/**
 * Gets active jobs (for reconnection)
 * @returns {Object[]} Active jobs
 */
export function getActiveJobs() {
    return Array.from(jobs.values()).filter(job =>
        ['pending', 'processing'].includes(job.status)
    );
}

/**
 * Deletes a job
 * @param {string} jobId - Job ID
 */
export function deleteJob(jobId) {
    jobs.delete(jobId);
    persistJobs();
}

// Cleanup old completed/failed jobs periodically
setInterval(() => {
    const now = Date.now();
    let cleaned = false;
    for (const [jobId, job] of jobs.entries()) {
        if (['completed', 'failed', 'cancelled'].includes(job.status)) {
            if (now - job.updatedAt > JOB_RETENTION) {
                jobs.delete(jobId);
                console.log(`Cleaned up old job: ${jobId}`);
                cleaned = true;
            }
        }
    }
    if (cleaned) persistJobs();
}, CLEANUP_INTERVAL);
