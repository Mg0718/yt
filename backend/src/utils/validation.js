/**
 * Input Validation Utilities
 * Validates URLs and user input for security
 */

// Supported platforms - YouTube playlists only for now
const SUPPORTED_PATTERNS = [
    // YouTube playlist URLs
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.*[?&]list=[a-zA-Z0-9_-]+/,
    // YouTube channel/playlist pages
    /^https?:\/\/(www\.)?youtube\.com\/(playlist|channel|c|user|@)/
];

/**
 * Validates a playlist URL
 * @param {string} url - URL to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePlaylistUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL is required' };
    }

    const trimmedUrl = url.trim();

    // Basic URL format check
    try {
        new URL(trimmedUrl);
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }

    // Check if URL matches supported patterns
    const isSupported = SUPPORTED_PATTERNS.some(pattern => pattern.test(trimmedUrl));

    if (!isSupported) {
        return {
            valid: false,
            error: 'Unsupported URL. Please provide a valid YouTube playlist URL.'
        };
    }

    return { valid: true };
}

/**
 * Validates download request parameters
 * @param {Object} params - Download parameters
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDownloadParams(params) {
    const { videos, mode, globalQuality } = params;

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
        return { valid: false, error: 'No videos selected for download' };
    }

    if (!mode || !['video+audio', 'video-only', 'audio-only'].includes(mode)) {
        return { valid: false, error: 'Invalid download mode. Must be "video+audio", "video-only", or "audio-only"' };
    }

    // Validate each video selection
    for (const video of videos) {
        if (!video.id || typeof video.id !== 'string') {
            return { valid: false, error: 'Invalid video ID in selection' };
        }
    }

    return { valid: true };
}

/**
 * Sanitizes a filename for safe filesystem use
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove illegal characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_{2,}/g, '_') // Remove duplicate underscores
        .replace(/^\.+/, '') // Remove leading dots
        .substring(0, 200); // Limit length
}
