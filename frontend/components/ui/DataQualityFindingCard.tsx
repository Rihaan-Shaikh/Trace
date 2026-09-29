import React from 'react';
import { DataQualityFinding } from '@/lib/types';

interface DataQualityFindingCardProps {
  finding: DataQualityFinding;
}

export const DataQualityFindingCard: React.FC<DataQualityFindingCardProps> = ({ finding }) => {
  const isCritical = finding.severity === 'critical';
  const isWarning = finding.severity === 'warning';

  const badgeColor = isCritical
    ? 'var(--verdict-decline)'
    : isWarning
    ? 'var(--accent-gold)'
    : 'var(--text-secondary)';

  return (
    <div
      style={{
        padding: '0.85rem 1rem',
        backgroundColor: 'var(--bg-subtle)',
        border: `1px solid ${isCritical ? 'var(--verdict-decline)' : 'var(--border-dim)'}`,
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            color: badgeColor,
            fontWeight: 600,
          }}
        >
          [{finding.severity}] {finding.finding_type}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {finding.affected_rows_count.toLocaleString()} rows affected ({(finding.affected_ratio * 100).toFixed(1)}%)
        </span>
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
        {finding.issue_description}
      </div>
      {finding.proposed_treatment && (
        <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold-light)', fontStyle: 'italic' }}>
          Treatment: {finding.proposed_treatment}
        </div>
      )}
    </div>
  );
};
