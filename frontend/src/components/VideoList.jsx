/**
 * VideoList Component
 * Displays videos with selection checkboxes and thumbnails
 */

import { useState } from 'react';

export function VideoList({
    videos,
    selectedVideos,
    setSelectedVideos,
    isDownloading
}) {
    const [showAll, setShowAll] = useState(false);
    const INITIAL_SHOW_COUNT = 10;

    const toggleVideo = (videoId) => {
        if (isDownloading) return;

        setSelectedVideos(prev => {
            if (prev.includes(videoId)) {
                return prev.filter(id => id !== videoId);
            }
            return [...prev, videoId];
        });
    };

    const toggleAll = () => {
        if (isDownloading) return;

        if (selectedVideos.length === videos.length) {
            setSelectedVideos([]);
        } else {
            setSelectedVideos(videos.map(v => v.id));
        }
    };

    const displayedVideos = showAll ? videos : videos.slice(0, INITIAL_SHOW_COUNT);
    const hasMore = videos.length > INITIAL_SHOW_COUNT;
    const allSelected = selectedVideos.length === videos.length && videos.length > 0;

    return (
        <div className="video-list card animate-fadeIn">
            <div className="list-header">
                <div className="header-left">
                    <h3>Videos</h3>
                    <span className="badge badge-primary">{videos.length} items</span>
                </div>
                <button
                    className="select-all-btn"
                    onClick={toggleAll}
                    disabled={isDownloading}
                >
                    <span className={`checkbox ${allSelected ? 'checked' : ''}`} />
                    <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
                </button>
            </div>

            <div className="video-grid">
                {displayedVideos.map((video, index) => {
                    const isSelected = selectedVideos.includes(video.id);
                    return (
                        <div
                            key={video.id}
                            className={`video-item ${isSelected ? 'selected' : ''} ${isDownloading ? 'disabled' : ''}`}
                            onClick={() => toggleVideo(video.id)}
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            <div className="video-checkbox">
                                <span className={`checkbox ${isSelected ? 'checked' : ''}`} />
                            </div>

                            <div className="video-thumbnail">
                                {video.thumbnail ? (
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="thumbnail-placeholder">🎬</div>
                                )}
                                <div className="duration-badge">{video.durationFormatted}</div>
                            </div>

                            <div className="video-info">
                                <h4 className="video-title" title={video.title}>
                                    {video.title}
                                </h4>
                                <p className="video-channel">{video.uploader}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {hasMore && !showAll && (
                <button
                    className="btn show-more-btn"
                    onClick={() => setShowAll(true)}
                >
                    Show {videos.length - INITIAL_SHOW_COUNT} more videos
                </button>
            )}

            {showAll && hasMore && (
                <button
                    className="btn show-more-btn"
                    onClick={() => setShowAll(false)}
                >
                    Show less
                </button>
            )}

            <style>{`
        .video-list {
          flex: 1;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .header-left h3 {
          font-size: var(--font-size-lg);
          margin: 0;
        }

        .select-all-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-glass-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: var(--font-size-sm);
        }

        .select-all-btn:hover:not(:disabled) {
          background: var(--color-bg-elevated);
          color: var(--color-text-primary);
        }

        .select-all-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .video-grid {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .video-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-glass-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
          animation: fadeIn 0.3s ease-out backwards;
        }

        .video-item:hover:not(.disabled) {
          background: var(--color-bg-elevated);
          transform: translateX(4px);
        }

        .video-item.selected {
          background: rgba(99, 102, 241, 0.1);
          border-color: var(--color-accent-primary);
        }

        .video-item.disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .video-checkbox {
          flex-shrink: 0;
        }

        .video-thumbnail {
          position: relative;
          width: 120px;
          height: 68px;
          border-radius: var(--radius-md);
          overflow: hidden;
          flex-shrink: 0;
          background: var(--color-bg-secondary);
        }

        .video-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          background: var(--color-bg-elevated);
        }

        .duration-badge {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          font-size: var(--font-size-xs);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-weight: var(--font-weight-medium);
        }

        .video-info {
          flex: 1;
          min-width: 0;
        }

        .video-title {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
          margin: 0 0 var(--spacing-xs) 0;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .video-channel {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          margin: 0;
        }

        .show-more-btn {
          width: 100%;
          margin-top: var(--spacing-md);
          background: var(--color-bg-tertiary);
        }

        @media (max-width: 640px) {
          .video-thumbnail {
            width: 80px;
            height: 45px;
          }

          .video-title {
            -webkit-line-clamp: 1;
          }
        }
      `}</style>
        </div>
    );
}
