'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { api } from '@/lib/api-client';
import { RateCardVersion } from '@/lib/types';
import { formatPercent, formatDate } from '@/lib/formatters';

export default function RateCardPage() {
  const [rateCard, setRateCard] = useState<RateCardVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRateCard();
  }, []);

  async function loadRateCard() {
    try {
      setLoading(true);
      const data = await api.rateCard.getActive();
      setRateCard(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load Rate Card');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState message="Fetching active underwriting policy..." />;
  if (error) return <ErrorState message={error} onRetry={loadRateCard} />;
  if (!rateCard) {
    return (
      <EmptyState
        title="No Active Rate Card Policy"
        description="The underwriting engine has not initialized an active Rate Card version from the database."
        actionText="Reload Policy"
        onAction={loadRateCard}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <PageHeader
        kicker="Transparent Pricing Policy · Actuarial Standards"
        plainTitle="Commercial Underwriting"
        italicTitle="Rate Card"
        description="All weights, tolerances, and verdict bands sit in a visible Rate Card. TRACE pricing is open, inspectable, and configurable — never hidden."
      />

      {/* Policy Meta Banner */}
      <section
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderLeft: '3px solid var(--accent-gold)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <span className="trace-kicker">Active Policy Document</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Standard Commercial Policy v{rateCard.version_str}
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Published: {formatDate(rateCard.created_at)} · Status: ACTIVE
          </div>
        </div>

        <span
          style={{
            padding: '3px 9px',
            backgroundColor: 'var(--verdict-recommended-bg)',
            color: 'var(--verdict-recommended)',
            border: '1px solid var(--verdict-recommended-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
          }}
        >
          IMMUTABLE ACTUARIAL VERSION
        </span>
      </section>

      {/* Decomposed Risk Loads Table / Register */}
      <section
        style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div style={{ padding: '0.85rem 1.25rem', backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="trace-kicker">Pricing Policy Weights</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Decomposed Risk Loads Schedule
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-dim)' }}>
              <th style={{ padding: '0.65rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>LOAD COMPONENT</th>
              <th style={{ padding: '0.65rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>POLICY WEIGHT</th>
              <th style={{ padding: '0.65rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>ACTUARIAL APPLICATION & CALCULATION METHOD</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Data-Quality Load
              </td>
              <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', fontWeight: 600 }}>
                {formatPercent(rateCard.weight_data_quality)}
              </td>
              <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Penalizes datasets with missingness, duplicates, outliers, or unconfirmed semantic mappings. Scales up to {formatPercent(rateCard.weight_data_quality)} of upside at health score 0.
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Verification Load
              </td>
              <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', fontWeight: 600 }}>
                {formatPercent(rateCard.weight_verification)}
              </td>
              <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Applied when independent secondary verification reveals relative numerical discrepancies exceeding the 1.0% tolerance threshold.
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Contradiction Load
              </td>
              <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', fontWeight: 600 }}>
                {formatPercent(rateCard.weight_contradiction)}
              </td>
              <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Dollar-for-dollar addition of unabsorbed adverse findings and contractual liabilities identified by the Counter-Decision Underwriter.
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Base Model Uncertainty
              </td>
              <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', fontWeight: 600 }}>
                {formatPercent(rateCard.base_model_uncertainty_weight)}
              </td>
              <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Baseline volatility buffer, scaled dynamically by the historical Loss History Ledger credibility blending factor (Bühlmann Z).
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Underwriting Verdict Bands Table */}
      <section
        style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div style={{ padding: '0.85rem 1.25rem', backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="trace-kicker">Decision Verdict Thresholds</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Underwriting Verdict Bands (Premium Rate vs Projected Upside)
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-dim)' }}>
              <th style={{ padding: '0.65rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>VERDICT BAND</th>
              <th style={{ padding: '0.65rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>PREMIUM RATE RANGE</th>
              <th style={{ padding: '0.65rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>UNDERWRITING MEANING & OPERATIONAL ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--verdict-recommended)' }}>
                Recommended
              </td>
              <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'var(--font-mono)' }}>
                &lt; {formatPercent(rateCard.band_recommended_max)}
              </td>
              <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Clear commercial go. High empirical certainty and full evidence verification agreement.
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--verdict-conditions)' }}>
                Recommended with Conditions
              </td>
              <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'var(--font-mono)' }}>
                {formatPercent(rateCard.band_recommended_max)} – {formatPercent(rateCard.band_recommended_with_conditions_max)}
              </td>
              <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Commercial go permitted only if explicit carve-outs or contractual tripwires are enforced.
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--verdict-refer)' }}>
                Refer to Human Underwriter
              </td>
              <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'var(--font-mono)' }}>
                {formatPercent(rateCard.band_recommended_with_conditions_max)} – {formatPercent(rateCard.band_refer_max)}
              </td>
              <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Downside tail or unverified data requires human executive review or additional data tables.
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--verdict-decline)' }}>
                Decline
              </td>
              <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'var(--font-mono)' }}>
                &gt; {formatPercent(rateCard.band_refer_max)}
              </td>
              <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                TRACE will not recommend execution. Expected losses and adverse findings exceed safety thresholds.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Tail Definition, Lapse Tolerance & Recalibration Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Tail Definition Card */}
        <section
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="trace-kicker">Actuarial Tail Definition</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                color: 'var(--accent-gold-light)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
              }}
            >
              P10 / CVaR
            </span>
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {rateCard.policy_metadata?.tail_definition || 'Worst 10% (P10) Loss Distribution'}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            Tail exposure is defined as the 10th percentile outcome of the Monte Carlo simulation ($n = 1,000$ iterations). Tail average loss calculates the Conditional Value-at-Risk (CVaR) across all outcomes in the worst decile.
          </p>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Percentile Cutoff: {((rateCard.tail_percentile ?? 0.10) * 100).toFixed(0)}th percentile
          </div>
        </section>

        {/* Coverage Lapse Tolerance Card */}
        <section
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="trace-kicker">Lapse & Discrepancy Policy</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              1.0% Threshold
            </span>
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Deterministic Tolerance Standards
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            Secondary verification discrepancy threshold is fixed at 1.0%. Discrepancies above 1.0% incur mandatory Verification Load. Critical metric failures trigger an immediate REFER under Precedence Rule 2.
          </p>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Lapse Tolerance: ±1.5% churn · 5.0% competitor gap alert
          </div>
        </section>

        {/* Recalibration Policy Card */}
        <section
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="trace-kicker">Experience Rating Policy</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              Bühlmann Z
            </span>
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Ledger Credibility Blending
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            Loss history updates actuarial loads via Bühlmann credibility factor $Z = n / (n + k)$, where $k = {(rateCard.policy_metadata?.recalibration?.k_parameter ?? 10.0).toFixed(1)}$. Predictions blend smoothly from Rate Card prior ($Z = 0$, neutral factor 1.0) to realized portfolio experience ($Z \to 1$).
          </p>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Formula: Z = n / (n + {(rateCard.policy_metadata?.recalibration?.k_parameter ?? 10.0).toFixed(1)}) · Factor Bounds: [{(rateCard.policy_metadata?.recalibration?.experience_factor_bounds?.[0] ?? 0.50).toFixed(2)}x, {(rateCard.policy_metadata?.recalibration?.experience_factor_bounds?.[1] ?? 2.50).toFixed(2)}x]
          </div>
        </section>
      </div>

      {/* Policy Transparency Statement */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderLeft: '3px solid var(--accent-gold)',
          backgroundColor: 'var(--bg-subtle)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--text-primary)' }}>Policy Transparency & Governance:</strong> The bands and weights are explicit commercial underwriting policy, not hidden heuristics. They are rendered to the user so the quote can be inspected and challenged. Every premium quote is decomposed, calculated, and verifiable.
      </div>
    </div>
  );
}
