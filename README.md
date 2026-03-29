# Video Playlist Downloader

A full-stack web application that downloads content from public YouTube playlists and packages it into a single ZIP file, with quality selection and real-time progress updates.

![Educational Use Only](https://img.shields.io/badge/Use-Educational%20Only-yellow)

## Features

- **Playlist Parsing** - Enter a YouTube playlist URL to fetch all video metadata
- **Quality Selection** - Choose video quality (360p to 4K) or audio-only mode (MP3)
- **Selective Downloads** - Pick individual videos or download all
- **Real-time Progress** - Live progress updates via Server-Sent Events
- **Streaming Architecture** - Memory-efficient streaming downloads and ZIP creation
- **Modern UI** - Dark theme with glassmorphism effects

## Prerequisites

- **Node.js** 18.0.0 or higher
- **yt-dlp** - Command-line video downloader

### Installing yt-dlp

```bash
# macOS
brew install yt-dlp

# Linux
sudo apt install yt-dlp
# or
pip install yt-dlp

# Windows
winget install yt-dlp
```

## Project Structure

```
yt/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── index.js        # Server entry point
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── queue/          # Job management
│   │   └── utils/          # Helpers
│   └── package.json
│
├── frontend/               # Vite + React
│   ├── src/
│   │   ├── App.jsx         # Main component
│   │   ├── components/     # UI components
│   │   └── hooks/          # Custom hooks
│   └── package.json
│
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start Development Servers

```bash
# Terminal 1 - Backend (runs on port 3001)
cd backend
npm run dev

# Terminal 2 - Frontend (runs on port 5173)
cd frontend
npm run dev
```

### 3. Open in Browser

Navigate to `http://localhost:5173`

## Usage

1. **Paste Playlist URL** - Enter a public YouTube playlist link
2. **Select Videos** - Choose which videos to download
3. **Choose Quality** - Select video quality or audio-only mode
4. **Download** - Click download and watch real-time progress
5. **Get ZIP** - Download the final ZIP archive

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/playlist?url=<url>` | Parse playlist metadata |
| GET | `/api/playlist/formats/:videoId` | Get format options |
| POST | `/api/download` | Start download job |
| GET | `/api/download/:jobId` | Get job status |
| DELETE | `/api/download/:jobId` | Cancel job |
| GET | `/api/progress/:jobId` | SSE progress stream |

## Environment Variables

Create `.env` file in `backend/`:

```env
PORT=3001
MAX_CONCURRENT_DOWNLOADS=3
TEMP_DIR=./temp
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30
```

## Tech Stack

**Frontend:**
- React 18
- Vite 5
- Server-Sent Events for real-time updates
- CSS Custom Properties for theming

**Backend:**
- Node.js 18+
- Express.js
- yt-dlp (CLI wrapper)
- archiver (streaming ZIP)

## Legal Notice

⚠️ **For Educational and Personal Use Only**

This tool is designed for downloading content you have rights to access. Only use with:
- Public playlists
- Content you own
- Content with appropriate licenses

Do not use for:
- Copyrighted content without permission
- Commercial redistribution
- Circumventing access controls

## License

MIT
# yt
# yt
