/**
 * QualitySelector Component
 * Global quality selection and download mode controls
 */

const QUALITY_OPTIONS = [
  { value: 'best', label: 'Best Quality', description: 'Highest available quality' },
  { value: '1080p', label: '1080p Full HD', description: 'High quality' },
  { value: '720p', label: '720p HD', description: 'Balanced quality & size' },
  { value: '480p', label: '480p SD', description: 'Standard quality' },
  { value: '360p', label: '360p', description: 'Low quality, smaller files' }
];

const AUDIO_QUALITY_OPTIONS = [
  { value: 'best', label: 'Best Quality', description: 'Highest audio bitrate' },
  { value: '320', label: '320 kbps', description: 'Premium quality' },
  { value: '192', label: '192 kbps', description: 'High quality' },
  { value: '128', label: '128 kbps', description: 'Standard quality' }
];

// Mode options for clearer download intent
const MODE_OPTIONS = [
  {
    value: 'video+audio',
    label: 'Video + Audio',
    icon: '🎬',
    description: 'Full video with sound (merged)'
  },
  {
    value: 'video-only',
    label: 'Video Only',
    icon: '📹',
    description: 'Video without audio track'
  },
  {
    value: 'audio-only',
    label: 'Audio Only',
    icon: '🎵',
    description: 'Extract audio as MP3'
  }
];

export function QualitySelector({
  mode,
  setMode,
  globalQuality,
  setGlobalQuality,
  selectedCount,
  totalCount,
  onStartDownload,
  isDownloading
}) {
  // Use video quality options for video modes, audio options for audio-only
  const qualityOptions = mode === 'audio-only' ? AUDIO_QUALITY_OPTIONS : QUALITY_OPTIONS;
  const qualityLabel = mode === 'audio-only' ? 'Audio Quality' : 'Video Quality';

  return (
    <div className="quality-selector card animate-fadeIn">
      <div className="selector-header">
        <h3>Download Settings</h3>
        <p className="text-secondary">Configure quality and format</p>
      </div>

      {/* Mode Selection - 3 tabs */}
      <div className="mode-section">
        <label className="mode-label">Download Mode</label>
        <div className="mode-tabs mode-tabs-3">
          {MODE_OPTIONS.map(option => (
            <button
              key={option.value}
              className={`mode-tab ${mode === option.value ? 'active' : ''}`}
              onClick={() => setMode(option.value)}
              disabled={isDownloading}
              title={option.description}
            >
              <span className="tab-icon">{option.icon}</span>
              <span className="tab-label">{option.label}</span>
            </button>
          ))}
        </div>
        <p className="mode-description">
          {MODE_OPTIONS.find(m => m.value === mode)?.description}
        </p>
      </div>

      {/* Quality Selection */}
      <div className="quality-section">
        <label className="quality-label">{qualityLabel}</label>
        <div className="quality-grid">
          {qualityOptions.map(option => (
            <button
              key={option.value}
              className={`quality-option ${globalQuality === option.value ? 'selected' : ''}`}
              onClick={() => setGlobalQuality(option.value)}
              disabled={isDownloading}
            >
              <span className="option-label">{option.label}</span>
              <span className="option-desc">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Download Summary */}
      <div className="download-summary">
        <div className="summary-info">
          <span className="summary-count">{selectedCount}</span>
          <span className="text-secondary">of {totalCount} videos selected</span>
        </div>
      </div>

      {/* Download Button */}
      <button
        className="btn btn-primary btn-lg w-full download-btn"
        onClick={onStartDownload}
        disabled={isDownloading || selectedCount === 0}
      >
        {isDownloading ? (
          <>
            <span className="spinner" />
            Processing...
          </>
        ) : (
          <>
            <span className="btn-icon-text">⬇️</span>
            Download {selectedCount} {mode === 'audio-only' ? 'Audio Files' : 'Videos'}
          </>
        )}
      </button>

      <style>{`
        .quality-selector {
          position: sticky;
          top: calc(73px + var(--spacing-xl));
        }

        .selector-header {
          margin-bottom: var(--spacing-lg);
        }

        .selector-header h3 {
          font-size: var(--font-size-lg);
          margin-bottom: var(--spacing-xs);
        }

        .mode-section {
          margin-bottom: var(--spacing-lg);
        }

        .mode-label {
          display: block;
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-sm);
        }

        .mode-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
        }

        .mode-tabs.mode-tabs-3 {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .mode-description {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          text-align: center;
          margin-top: var(--spacing-sm);
          margin-bottom: 0;
        }

        .mode-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-md);
          background: var(--color-bg-tertiary);
          border: 2px solid var(--color-glass-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
          color: var(--color-text-secondary);
        }

        .mode-tab:hover:not(:disabled) {
          background: var(--color-bg-elevated);
          border-color: var(--color-glass-hover);
        }

        .mode-tab.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: var(--color-accent-primary);
          color: var(--color-text-primary);
        }

        .mode-tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tab-icon {
          font-size: 1.5rem;
        }

        .tab-label {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
        }

        .quality-section {
          margin-bottom: var(--spacing-lg);
        }

        .quality-label {
          display: block;
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-sm);
        }

        .quality-grid {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .quality-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-glass-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
          color: var(--color-text-primary);
        }

        .quality-option:hover:not(:disabled) {
          background: var(--color-bg-elevated);
        }

        .quality-option.selected {
          background: rgba(99, 102, 241, 0.1);
          border-color: var(--color-accent-primary);
        }

        .quality-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .option-label {
          font-weight: var(--font-weight-medium);
        }

        .option-desc {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }

        .download-summary {
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
          text-align: center;
        }

        .summary-count {
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-accent-primary);
          margin-right: var(--spacing-sm);
        }

        .download-btn {
          font-size: var(--font-size-base);
        }

        .btn-icon-text {
          font-size: 1.25rem;
        }
      `}</style>
    </div>
  );
}
