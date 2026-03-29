/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting request frequency
 */

import rateLimit from 'express-rate-limit';

/**
 * Creates a rate limiter for the API
 * @returns {Function} Express middleware
 */
export function createRateLimiter() {
    return rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30, // 30 requests per minute
        message: {
            error: 'Too many requests, please try again later',
            code: 'RATE_LIMITED'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
}
