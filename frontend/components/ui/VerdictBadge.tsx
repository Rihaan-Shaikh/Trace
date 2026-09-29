import React from 'react';
import { UnderwritingVerdict } from '@/lib/types';

interface VerdictBadgeProps {
  verdict: UnderwritingVerdict | string;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, size = 'md' }) => {
  let badgeClass = 'verdict-recommended';
  let label = verdict;

  switch (verdict) {
    case 'Recommended':
      badgeClass = 'verdict-recommended';
      break;
    case 'Recommended with Conditions':
      badgeClass = 'verdict-conditions';
      break;
    case 'Refer':
      badgeClass = 'verdict-refer';
      break;
    case 'Decline':
      badgeClass = 'verdict-decline';
      break;
    default:
      badgeClass = 'verdict-refer';
  }

  const paddingStyle =
    size === 'sm'
      ? { padding: '2px 8px', fontSize: '0.75rem' }
      : size === 'lg'
      ? { padding: '6px 16px', fontSize: '1rem' }
      : { padding: '4px 12px', fontSize: '0.875rem' };

  return (
    <span
      className={`verdict-badge ${badgeClass}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontFamily: 'var(--font-mono)',
        ...paddingStyle,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
        }}
      />
      {label}
      <style jsx>{`
        .verdict-recommended {
          background-color: var(--verdict-recommended-bg);
          color: var(--verdict-recommended);
          border: 1px solid var(--verdict-recommended-border);
        }
        .verdict-conditions {
          background-color: var(--verdict-conditions-bg);
          color: var(--verdict-conditions);
          border: 1px solid var(--verdict-conditions-border);
        }
        .verdict-refer {
          background-color: var(--verdict-refer-bg);
          color: var(--verdict-refer);
          border: 1px solid var(--verdict-refer-border);
        }
        .verdict-decline {
          background-color: var(--verdict-decline-bg);
          color: var(--verdict-decline);
          border: 1px solid var(--verdict-decline-border);
        }
      `}</style>
    </span>
  );
};
