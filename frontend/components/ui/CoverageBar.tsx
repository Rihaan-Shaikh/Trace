import React from 'react';
import { formatPercent } from '@/lib/formatters';

interface CoverageBarProps {
  title: string;
  currentValue: number;
  lapseThreshold: number;
  distancePercent: number;
  unit?: string;
  isBreached: boolean;
}

export const CoverageBar: React.FC<CoverageBarProps> = ({
  title,
  currentValue,
  lapseThreshold,
  distancePercent,
  unit = '',
  isBreached,
}) => {
  // Normalize percentage for visual width (cap at 100)
  const safeBuffer = Math.max(0, Math.min(100, distancePercent));
  const isUrgent = distancePercent < 20 || isBreached;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.85rem 1rem',
        backgroundColor: 'var(--bg-subtle)',
        border: `1px solid ${isBreached ? 'var(--verdict-decline)' : isUrgent ? 'var(--accent-gold)' : 'var(--border-dim)'}`,
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          {title}
        </span>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Current: </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {currentValue}
            {unit}
          </span>
          <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>Lapse at: </span>
          <span style={{ color: 'var(--accent-gold-light)', fontWeight: 600 }}>
            {lapseThreshold}
            {unit}
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div
        style={{
          height: '6px',
          backgroundColor: 'var(--border-dim)',
          borderRadius: 'var(--radius-full)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${safeBuffer}%`,
            backgroundColor: isBreached
              ? 'var(--verdict-decline)'
              : isUrgent
              ? 'var(--accent-gold)'
              : 'var(--verdict-recommended)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span style={{ color: isBreached ? 'var(--verdict-decline)' : 'var(--text-muted)' }}>
          {isBreached ? 'COVERAGE LAPSED' : `${safeBuffer.toFixed(1)}% distance to lapse`}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {isUrgent && !isBreached ? 'CRITICAL WATCH' : 'WITHIN BOUNDARY'}
        </span>
      </div>
    </div>
  );
};
