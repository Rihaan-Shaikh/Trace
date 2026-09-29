import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface PremiumDisplayProps {
  projectedUpside: number;
  expectedLoss: number;
  dataQualityLoad: number;
  verificationLoad: number;
  contradictionLoad: number;
  modelUncertaintyLoad: number;
  totalPremium: number;
  premiumRate: number;
}

export const PremiumDisplay: React.FC<PremiumDisplayProps> = ({
  projectedUpside,
  expectedLoss,
  dataQualityLoad,
  verificationLoad,
  contradictionLoad,
  modelUncertaintyLoad,
  totalPremium,
  premiumRate,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1.25rem',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div className="trace-kicker">Quoted Risk Price</div>
          <div
            className="trace-mono-num"
            style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--accent-gold)' }}
          >
            {formatCurrency(totalPremium)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="trace-kicker">Premium Rate</div>
          <div
            className="trace-mono-num"
            style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {formatPercent(premiumRate)}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
              of {formatCurrency(projectedUpside)} upside
            </span>
          </div>
        </div>
      </div>

      {/* Decomposed Loads Schedule */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-dim)',
        }}
      >
        <div>
          <span className="trace-kicker" style={{ fontSize: '0.7rem' }}>Expected Loss</span>
          <div className="trace-mono-num" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {formatCurrency(expectedLoss)}
          </div>
        </div>
        <div>
          <span className="trace-kicker" style={{ fontSize: '0.7rem' }}>Data-Quality Load</span>
          <div className="trace-mono-num" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {formatCurrency(dataQualityLoad)}
          </div>
        </div>
        <div>
          <span className="trace-kicker" style={{ fontSize: '0.7rem' }}>Verification Load</span>
          <div className="trace-mono-num" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {formatCurrency(verificationLoad)}
          </div>
        </div>
        <div>
          <span className="trace-kicker" style={{ fontSize: '0.7rem' }}>Contradiction Load</span>
          <div className="trace-mono-num" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {formatCurrency(contradictionLoad)}
          </div>
        </div>
        <div>
          <span className="trace-kicker" style={{ fontSize: '0.7rem' }}>Model Uncertainty</span>
          <div className="trace-mono-num" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {formatCurrency(modelUncertaintyLoad)}
          </div>
        </div>
      </div>
    </div>
  );
};
