/**
 * Input Validation Utilities
 * Validates URLs and user input for security
 */

// Supported platforms - YouTube playlists and single videos
const SUPPORTED_PATTERNS = [
    // YouTube playlist URLs (with or without www, http or https)
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.*[?&]list=[a-zA-Z0-9_-]+/,
    // YouTube channel/playlist pages
    /^https?:\/\/(www\.)?youtube\.com\/(playlist|channel|c|user|@)/,
    // YouTube single video URLs (watch?v=ID, possibly with extra params)
    /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=[a-zA-Z0-9_-]{11}/,
    // Short URL youtu.be/ID
    /^https?:\/\/(www\.)?youtu\.be\/[a-zA-Z0-9_-]+/,
    // YouTube Shorts
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]+/
];

/**
 * Normalizes a YouTube URL by adding https:// if missing
 * @param {string} url - Raw URL string
 * @returns {string} Normalized URL
 */
export function normalizeUrl(url) {
    let trimmed = url.trim();
    // Add https:// if user pasted without protocol
    if (/^(www\.)?youtu(\.be|be\.com)/i.test(trimmed)) {
        trimmed = 'https://' + trimmed;
    }
    return trimmed;
}

/**
 * Validates a video or playlist URL
 * @param {string} url - URL to validate
 * @returns {{ valid: boolean, error?: string, normalizedUrl?: string }}
 */
export function validatePlaylistUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL is required' };
    }

    const normalizedUrl = normalizeUrl(url);

    // Basic URL format check
    try {
        new URL(normalizedUrl);
    } catch {
        return { valid: false, error: 'Invalid URL format. Please paste a valid YouTube link.' };
    }

    // Check if URL matches supported patterns
    const isSupported = SUPPORTED_PATTERNS.some(pattern => pattern.test(normalizedUrl));

    if (!isSupported) {
        return {
            valid: false,
            error: 'Unsupported URL. Please provide a valid YouTube video or playlist URL.'
        };
    }

    return { valid: true, normalizedUrl };
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
