import React from 'react';

interface MetricDisplayProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  provenanceRef?: string;
  highlight?: boolean;
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  subValue,
  provenanceRef,
  highlight = false,
}) => {
  return (
    <div
      className="trace-metric-card"
      style={{
        backgroundColor: highlight ? 'var(--bg-surface-elevated)' : 'var(--bg-card)',
        border: `1px solid ${highlight ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="trace-kicker">{label}</span>
        {provenanceRef && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--accent-gold-dim)',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
            title="Traceable link into Evidence Chain"
          >
            {provenanceRef}
          </span>
        )}
      </div>
      <div
        className="trace-mono-num"
        style={{
          fontSize: '1.75rem',
          fontWeight: 600,
          color: highlight ? 'var(--accent-gold-light)' : 'var(--text-primary)',
        }}
      >
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {subValue}
        </div>
      )}
    </div>
  );
};
