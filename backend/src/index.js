/**
 * Video Playlist Downloader - Backend Server
 * 
 * Express server providing:
 * - Playlist parsing via yt-dlp
 * - Download job management
 * - Real-time progress via SSE
 * - ZIP streaming
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

import playlistRoutes from './routes/playlist.js';
import downloadRoutes from './routes/download.js';
import progressRoutes from './routes/progress.js';
import { createRateLimiter } from './utils/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const TEMP_DIR = process.env.TEMP_DIR || join(__dirname, '..', 'temp');

// Ensure temp directory exists
await mkdir(TEMP_DIR, { recursive: true });

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // or any localhost origin
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Rate limiting
app.use('/api/', createRateLimiter());

// Routes
app.use('/api/playlist', playlistRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/progress', progressRoutes);

// Serve downloaded ZIP files
app.use('/downloads', express.static(TEMP_DIR));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'SERVER_ERROR'
  });
});

// 404 handler
// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve static frontend in production or Electron
if (process.env.NODE_ENV === 'production' || process.env.IS_ELECTRON === 'true') {
  const clientPath = join(__dirname, '../client');
  console.log(`Serving static files from: ${clientPath}`);
  app.use(express.static(clientPath));

  app.get('*', (req, res) => {
    res.sendFile(join(clientPath, 'index.html'));
  });
} else {
  // 404 for other routes in dev
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Temp directory: ${TEMP_DIR}`);
});

export { TEMP_DIR };
