import React from 'react';

interface WarningBannerProps {
  title?: string;
  message: string;
  type?: 'warning' | 'condition' | 'exclusion';
}

export const WarningBanner: React.FC<WarningBannerProps> = ({
  title,
  message,
  type = 'warning',
}) => {
  const borderColor =
    type === 'condition'
      ? 'var(--accent-gold)'
      : type === 'exclusion'
      ? 'var(--text-muted)'
      : 'var(--verdict-refer)';

  return (
    <div
      style={{
        padding: '0.85rem 1.25rem',
        backgroundColor: 'var(--bg-subtle)',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      {title && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: borderColor,
            fontWeight: 600,
          }}
        >
          {title}
        </span>
      )}
      <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{message}</div>
    </div>
  );
};
