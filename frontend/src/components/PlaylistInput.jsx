/**
 * PlaylistInput Component
 * URL input for parsing YouTube playlists
 */

import { useState } from 'react';

export function PlaylistInput({ onPlaylistLoaded, isLoading, setIsLoading, setError }) {
    const [url, setUrl] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!url.trim()) {
            setError('Please enter a playlist URL');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/playlist?url=${encodeURIComponent(url.trim())}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to parse playlist');
            }

            onPlaylistLoaded(data.playlist, data.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="playlist-input card animate-fadeIn">
            <div className="input-header">
                <h2>Enter Playlist URL</h2>
                <p className="text-secondary">
                    Paste a public YouTube playlist link to get started
                </p>
            </div>

            <form onSubmit={handleSubmit} className="input-form">
                <div className="input-group">
                    <input
                        type="url"
                        className="input"
                        placeholder="https://www.youtube.com/playlist?list=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading || !url.trim()}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner" />
                                Parsing...
                            </>
                        ) : (
                            <>
                                <span className="btn-icon-svg">🔍</span>
                                Parse
                            </>
                        )}
                    </button>
                </div>
            </form>

            <div className="supported-note">
                <span className="note-icon">ℹ️</span>
                <span className="text-muted">
                    Supports YouTube playlists only. Educational and personal use only.
                </span>
            </div>

            <style>{`
        .playlist-input {
          margin-bottom: var(--spacing-xl);
        }

        .input-header {
          margin-bottom: var(--spacing-lg);
        }

        .input-header h2 {
          font-size: var(--font-size-xl);
          margin-bottom: var(--spacing-xs);
        }

        .input-form {
          margin-bottom: var(--spacing-lg);
        }

        .input-form .btn {
          white-space: nowrap;
          min-width: 120px;
        }

        .btn-icon-svg {
          font-size: 1rem;
        }

        .supported-note {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: var(--font-size-sm);
        }

        .note-icon {
          font-size: 1rem;
        }
      `}</style>
        </div>
    );
}
