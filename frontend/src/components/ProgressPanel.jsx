/**
 * ProgressPanel Component
 * Real-time download progress with phase indicators
 */

export function ProgressPanel({
    progress,
    isComplete,
    zipPath,
    error,
    onCancel,
    onReset
}) {
    const getPhaseIndex = (phase) => {
        const phases = ['queued', 'downloading', 'zipping', 'complete'];
        return phases.indexOf(phase);
    };

    const currentPhaseIndex = getPhaseIndex(progress?.phase);

    const phases = [
        { key: 'downloading', label: 'Downloading', icon: '⬇️' },
        { key: 'zipping', label: 'Creating ZIP', icon: '📦' },
        { key: 'complete', label: 'Complete', icon: '✅' }
    ];

    const getStatusMessage = () => {
        if (error) return error;
        if (progress?.status === 'cancelled') return 'Download cancelled';
        if (isComplete) return 'Download ready!';
        if (progress?.phase === 'downloading') {
            return `Downloading: ${progress.currentVideoTitle || 'Preparing...'}`;
        }
        if (progress?.phase === 'zipping') return 'Creating ZIP archive...';
        return 'Starting download...';
    };

    const isFailed = progress?.status === 'failed' || error;
    const isCancelled = progress?.status === 'cancelled';

    return (
        <div className={`progress-panel card ${isComplete ? 'complete' : ''} ${isFailed ? 'failed' : ''}`}>
            <div className="panel-header">
                <h3>Download Progress</h3>
                {!isComplete && !isFailed && !isCancelled && (
                    <button className="btn btn-sm btn-danger" onClick={onCancel}>
                        Cancel
                    </button>
                )}
            </div>

            {/* Phase Indicator */}
            <div className="phase-indicator">
                {phases.map((phase, index) => {
                    const phaseIdx = getPhaseIndex(phase.key);
                    const isActive = currentPhaseIndex === phaseIdx;
                    const isCompleted = currentPhaseIndex > phaseIdx || isComplete;

                    return (
                        <div
                            key={phase.key}
                            className={`phase-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        >
                            <div className="phase-icon">
                                {isCompleted ? '✓' : phase.icon}
                            </div>
                            <div className="phase-label">{phase.label}</div>
                            {index < phases.length - 1 && <div className="phase-connector" />}
                        </div>
                    );
                })}
            </div>

            {/* Progress Bar */}
            {!isComplete && !isFailed && !isCancelled && (
                <div className="progress-section">
                    <div className="progress-header">
                        <span className="progress-label">Overall Progress</span>
                        <span className="progress-value">{Math.round(progress?.overallProgress || 0)}%</span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress?.overallProgress || 0}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Status Message */}
            <div className={`status-message ${isFailed ? 'error' : ''}`}>
                <span className="status-icon">
                    {isFailed ? '❌' : isComplete ? '🎉' : isCancelled ? '🚫' : '📥'}
                </span>
                <span className="status-text">{getStatusMessage()}</span>
            </div>

            {/* Current Video Info */}
            {progress?.phase === 'downloading' && progress.currentVideoTitle && !isFailed && (
                <div className="current-video">
                    <div className="video-progress-header">
                        <span className="text-secondary">
                            Video {(progress.currentVideoIndex || 0) + 1} of {progress.totalVideos}
                        </span>
                    </div>
                    <div className="current-video-title truncate">
                        {progress.currentVideoTitle}
                    </div>
                </div>
            )}

            {/* Download Link */}
            {isComplete && zipPath && (
                <div className="download-section">
                    <a
                        href={zipPath}
                        download
                        className="btn btn-primary btn-lg w-full"
                    >
                        <span>📥</span>
                        Download ZIP
                    </a>
                </div>
            )}

            {/* Reset Button */}
            {(isComplete || isFailed || isCancelled) && (
                <button
                    className="btn w-full mt-md"
                    onClick={onReset}
                >
                    Start New Download
                </button>
            )}

            <style>{`
        .progress-panel {
          position: sticky;
          top: calc(73px + var(--spacing-xl));
        }

        .progress-panel.complete {
          border-color: var(--color-success);
          background: var(--color-success-bg);
        }

        .progress-panel.failed {
          border-color: var(--color-error);
          background: var(--color-error-bg);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
        }

        .panel-header h3 {
          font-size: var(--font-size-lg);
          margin: 0;
        }

        .phase-indicator {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--spacing-xl);
          position: relative;
        }

        .phase-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .phase-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--color-bg-tertiary);
          border: 2px solid var(--color-glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          margin-bottom: var(--spacing-sm);
          transition: all var(--transition-normal);
        }

        .phase-step.active .phase-icon {
          background: rgba(99, 102, 241, 0.2);
          border-color: var(--color-accent-primary);
          animation: pulse 2s infinite;
        }

        .phase-step.completed .phase-icon {
          background: var(--color-success);
          border-color: var(--color-success);
          color: white;
        }

        .phase-label {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          text-align: center;
        }

        .phase-step.active .phase-label,
        .phase-step.completed .phase-label {
          color: var(--color-text-primary);
        }

        .phase-connector {
          position: absolute;
          top: 20px;
          left: calc(50% + 20px);
          right: calc(-50% + 20px);
          height: 2px;
          background: var(--color-glass-border);
          z-index: 0;
        }

        .phase-step.completed .phase-connector {
          background: var(--color-success);
        }

        .progress-section {
          margin-bottom: var(--spacing-lg);
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--spacing-sm);
        }

        .progress-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .progress-value {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-accent-primary);
        }

        .status-message {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
        }

        .status-message.error {
          background: var(--color-error-bg);
          color: var(--color-error);
        }

        .status-icon {
          font-size: 1.25rem;
        }

        .status-text {
          flex: 1;
          font-size: var(--font-size-sm);
        }

        .current-video {
          padding: var(--spacing-md);
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-lg);
        }

        .video-progress-header {
          font-size: var(--font-size-xs);
          margin-bottom: var(--spacing-xs);
        }

        .current-video-title {
          font-weight: var(--font-weight-medium);
          font-size: var(--font-size-sm);
        }

        .download-section {
          margin-top: var(--spacing-lg);
        }

        .download-section a {
          text-decoration: none;
        }

        .mt-md {
          margin-top: var(--spacing-md);
        }
      `}</style>
        </div>
    );
}
