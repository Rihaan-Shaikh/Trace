import React from 'react';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading verified evidence...',
}) => (
  <div
    style={{
      padding: '3rem 2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      color: 'var(--text-secondary)',
    }}
  >
    <div
      style={{
        width: '28px',
        height: '28px',
        border: '2px solid var(--border-subtle)',
        borderTopColor: 'var(--accent-gold)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{message}</span>
    <style jsx>{`
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ title, description, actionText, onAction }) => (
  <div
    style={{
      padding: '3rem 2rem',
      textAlign: 'center',
      border: '1px dashed var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg-subtle)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
    }}
  >
    <div className="trace-kicker">Status</div>
    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
      {title}
    </div>
    <div style={{ maxWidth: '420px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
      {description}
    </div>
    {actionText && onAction && (
      <button
        onClick={onAction}
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1.25rem',
          backgroundColor: 'var(--accent-gold)',
          color: 'var(--text-inverse)',
          fontWeight: 600,
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
        }}
      >
        {actionText}
      </button>
    )}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    style={{
      padding: '2rem',
      border: '1px solid var(--verdict-decline-border)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--verdict-decline-bg)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}
  >
    <div style={{ color: 'var(--verdict-decline)', fontWeight: 600, fontSize: '0.9rem' }}>
      SYSTEM ERROR / DATA INTEGRITY FAILURE
    </div>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{message}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          alignSelf: 'flex-start',
          padding: '0.4rem 1rem',
          backgroundColor: 'transparent',
          border: '1px solid var(--verdict-decline)',
          color: 'var(--verdict-decline)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        RETRY CHECK
      </button>
    )}
  </div>
);
