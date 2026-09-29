import React from 'react';

export type StatusType =
  | 'draft'
  | 'pending'
  | 'running'
  | 'investigating'
  | 'completed'
  | 'failed'
  | 'underwritten'
  | 'recommended'
  | 'recommended_with_conditions'
  | 'refer'
  | 'decline'
  | 'confirmed'
  | 'suggested'
  | 'active'
  | 'sufficient'
  | 'insufficient'
  | 'blocked';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  labelOverride?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  labelOverride,
}) => {
  const norm = (status || '').toLowerCase().replace(/[\s-]+/g, '_');

  let bg = 'rgba(255, 255, 255, 0.04)';
  let border = 'var(--border-dim)';
  let text = 'var(--text-secondary)';
  let dot = 'var(--text-muted)';

  if (norm.includes('recommend') && !norm.includes('condition')) {
    bg = 'var(--verdict-recommended-bg)';
    border = 'var(--verdict-recommended-border)';
    text = 'var(--verdict-recommended)';
    dot = 'var(--verdict-recommended)';
  } else if (norm.includes('condition') || norm.includes('suggested')) {
    bg = 'var(--verdict-conditions-bg)';
    border = 'var(--verdict-conditions-border)';
    text = 'var(--verdict-conditions)';
    dot = 'var(--verdict-conditions)';
  } else if (norm.includes('refer') || norm.includes('running') || norm.includes('investigating')) {
    bg = 'var(--verdict-refer-bg)';
    border = 'var(--verdict-refer-border)';
    text = 'var(--verdict-refer)';
    dot = 'var(--verdict-refer)';
  } else if (norm.includes('decline') || norm.includes('failed') || norm.includes('insufficient') || norm.includes('blocked')) {
    bg = 'var(--verdict-decline-bg)';
    border = 'var(--verdict-decline-border)';
    text = 'var(--verdict-decline)';
    dot = 'var(--verdict-decline)';
  } else if (norm.includes('completed') || norm.includes('confirmed') || norm.includes('underwritten') || norm.includes('sufficient') || norm === 'active') {
    bg = 'var(--verdict-recommended-bg)';
    border = 'var(--verdict-recommended-border)';
    text = 'var(--verdict-recommended)';
    dot = 'var(--verdict-recommended)';
  } else if (norm === 'draft' || norm === 'pending') {
    bg = 'rgba(255, 255, 255, 0.03)';
    border = 'var(--border-subtle)';
    text = 'var(--text-muted)';
    dot = 'var(--text-muted)';
  }

  const isSmall = size === 'sm';
  const label = labelOverride || status.replace(/_/g, ' ').toUpperCase();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--font-mono)',
        fontSize: isSmall ? '0.7rem' : '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        padding: isSmall ? '1px 7px' : '3px 9px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: text,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
};
