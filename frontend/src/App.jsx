/**
 * App Component
 * Main application orchestrator for the video playlist downloader
 */

import { useState, useCallback } from 'react';
import './App.css';
import { PlaylistInput } from './components/PlaylistInput';
import { VideoList } from './components/VideoList';
import { QualitySelector } from './components/QualitySelector';
import { ProgressPanel } from './components/ProgressPanel';
import { useSSE } from './hooks/useSSE';

function App() {
    // Playlist state
    const [playlist, setPlaylist] = useState(null);
    const [playlistMessage, setPlaylistMessage] = useState(null);
    const [isParsingPlaylist, setIsParsingPlaylist] = useState(false);
    const [parseError, setParseError] = useState(null);

    // Selection state
    const [selectedVideos, setSelectedVideos] = useState([]);
    const [mode, setMode] = useState('video+audio'); // 'video+audio', 'video-only', or 'audio-only'
    const [globalQuality, setGlobalQuality] = useState('best');

    // Download state
    const [jobId, setJobId] = useState(null);
    const [isStartingDownload, setIsStartingDownload] = useState(false);
    const [downloadError, setDownloadError] = useState(null);

    // SSE hook for progress updates
    const {
        progress,
        isComplete,
        zipPath,
        error: sseError,
        reset: resetSSE
    } = useSSE(jobId);

    // Handle playlist loaded
    const handlePlaylistLoaded = useCallback((playlistData, message) => {
        setPlaylist(playlistData);
        setPlaylistMessage(message);
        setParseError(null);
        // Auto-select all videos
        setSelectedVideos(playlistData.videos.map(v => v.id));
    }, []);

    // Start download
    const handleStartDownload = async () => {
        if (selectedVideos.length === 0) return;

        setIsStartingDownload(true);
        setDownloadError(null);

        try {
            const videosToDownload = playlist.videos
                .filter(v => selectedVideos.includes(v.id))
                .map(v => ({
                    id: v.id,
                    title: v.title
                }));

            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videos: videosToDownload,
                    mode,
                    globalQuality,
                    playlistTitle: playlist.title
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start download');
            }

            setJobId(data.jobId);
        } catch (err) {
            setDownloadError(err.message);
        } finally {
            setIsStartingDownload(false);
        }
    };

    // Cancel download
    const handleCancelDownload = async () => {
        if (!jobId) return;

        try {
            await fetch(`/api/download/${jobId}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Failed to cancel:', err);
        }
    };

    // Reset for new download
    const handleReset = () => {
        setJobId(null);
        resetSSE();
        setDownloadError(null);
    };

    // Full reset to start over
    const handleNewPlaylist = () => {
        handleReset();
        setPlaylist(null);
        setPlaylistMessage(null);
        setSelectedVideos([]);
        setMode('video+audio');
        setGlobalQuality('best');
    };

    const isDownloading = jobId && !isComplete && progress?.status !== 'failed' && progress?.status !== 'cancelled';

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="container">
                    <div className="header-content">
                        <div className="logo">
                            <div className="logo-icon">📥</div>
                            <span className="logo-text">Playlist Downloader</span>
                        </div>
                        <span className="badge-edu">Educational Use Only</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="main">
                <div className="container">
                    {/* Playlist Input - always shown when no active download */}
                    {!jobId && (
                        <PlaylistInput
                            onPlaylistLoaded={handlePlaylistLoaded}
                            isLoading={isParsingPlaylist}
                            setIsLoading={setIsParsingPlaylist}
                            setError={setParseError}
                        />
                    )}

                    {/* Parse Error */}
                    {parseError && (
                        <div className="error-message animate-fadeIn">
                            <span className="error-icon">⚠️</span>
                            <span>{parseError}</span>
                        </div>
                    )}

                    {/* Download Error */}
                    {downloadError && (
                        <div className="error-message animate-fadeIn mt-md">
                            <span className="error-icon">⚠️</span>
                            <span>{downloadError}</span>
                        </div>
                    )}

                    {/* Playlist Info Message */}
                    {playlistMessage && !jobId && (
                        <div className="video-count-info animate-fadeIn">
                            <span className="info-icon">ℹ️</span>
                            <span>{playlistMessage}</span>
                        </div>
                    )}

                    {/* Main Content Grid */}
                    {playlist && (
                        <div className={`content-wrapper ${isDownloading || isComplete ? 'downloading' : ''}`}>
                            {/* Left Column - Video List */}
                            <div className="left-column">
                                {!jobId && (
                                    <div className="controls-row">
                                        <button
                                            className="btn"
                                            onClick={handleNewPlaylist}
                                        >
                                            ← Change Playlist
                                        </button>
                                        <h2 className="playlist-title">{playlist.title}</h2>
                                    </div>
                                )}

                                <VideoList
                                    videos={playlist.videos}
                                    selectedVideos={selectedVideos}
                                    setSelectedVideos={setSelectedVideos}
                                    isDownloading={isDownloading || isStartingDownload}
                                />
                            </div>

                            {/* Right Column - Quality Selector or Progress */}
                            <div className="right-column">
                                {jobId ? (
                                    <ProgressPanel
                                        progress={progress}
                                        isComplete={isComplete}
                                        zipPath={zipPath}
                                        error={sseError}
                                        onCancel={handleCancelDownload}
                                        onReset={handleNewPlaylist}
                                    />
                                ) : (
                                    <QualitySelector
                                        mode={mode}
                                        setMode={setMode}
                                        globalQuality={globalQuality}
                                        setGlobalQuality={setGlobalQuality}
                                        selectedCount={selectedVideos.length}
                                        totalCount={playlist.videos.length}
                                        onStartDownload={handleStartDownload}
                                        isDownloading={isStartingDownload}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!playlist && !isParsingPlaylist && !parseError && (
                        <div className="empty-state card">
                            <div className="empty-icon">🎬</div>
                            <h3 className="empty-title">No Playlist Loaded</h3>
                            <p className="empty-description">
                                Enter a YouTube playlist URL above to get started.
                                You can select videos, choose quality, and download them all as a ZIP file.
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <p className="footer-text">
                        For educational and personal use only. Only download content you have rights to access.
                    </p>
                </div>
            </footer>

            <style>{`
        .controls-row {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }

        .playlist-title {
          font-size: var(--font-size-xl);
          margin: 0;
          flex: 1;
        }

        .content-wrapper {
          display: grid;
          gap: var(--spacing-xl);
        }

        .content-wrapper.downloading {
          grid-template-columns: 1fr 400px;
        }

        .left-column {
          min-width: 0;
        }

        .right-column {
          min-width: 0;
        }

        @media (max-width: 1024px) {
          .content-wrapper.downloading {
            grid-template-columns: 1fr;
          }

          .right-column {
            order: -1;
          }
        }

        @media (min-width: 1025px) {
          .content-wrapper:not(.downloading) {
            grid-template-columns: 1fr 350px;
          }
        }
      `}</style>
        </div>
    );
}

export default App;
