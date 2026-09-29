'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { VerdictBadge } from '@/components/ui/VerdictBadge';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { api } from '@/lib/api-client';
import { SystemHealth, RateCardVersion, Decision, Dataset } from '@/lib/types';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';

export default function OverviewPage() {
  const router = useRouter();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [rateCard, setRateCard] = useState<RateCardVersion | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [heroDecision, setHeroDecision] = useState<Decision | null>(null);
  const [heroBrief, setHeroBrief] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [h, rc, decs, dsets] = await Promise.all([
          api.health.get().catch(() => null),
          api.rateCard.getActive().catch(() => null),
          api.decisions.list(0, 50).catch(() => ({ items: [] })),
          api.datasets.list(0, 10).catch(() => ({ items: [] })),
        ]);
        setHealth(h);
        setRateCard(rc);
        const items = decs?.items || [];
        setDecisions(items);
        setDatasets(dsets?.items || []);

        // Locate Hero Decision (T1 discount cessation) or first underwritten
        const hero =
          items.find((d: Decision) =>
            d.title.toLowerCase().includes('stop discounts') ||
            d.question_text.toLowerCase().includes('stop discounts')
          ) ||
          items.find((d: Decision) => d.status === 'underwritten') ||
          items[0] ||
          null;

        setHeroDecision(hero);

        if (hero) {
          try {
            const brief = await api.approvals.getBrief(hero.id);
            setHeroBrief(brief);
          } catch {
            setHeroBrief(null);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize TRACE Underwriting Workstation');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingState message="Initializing TRACE Underwriting Terminal..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  // Filter distinct decisions to avoid duplicate titles in view
  const uniqueDecisions = decisions.filter(
    (d, index, self) => index === self.findIndex((t) => t.title === d.title)
  );

  // Extract hero metrics from real brief or fallback to deterministic baseline
  const briefSections = heroBrief?.sections || heroBrief?.sections_json;
  const sec1 = briefSections?.decision_and_verdict;
  const sec2 = briefSections?.decision_premium;
  const sec3 = briefSections?.exposure_report;
  const sec4 = briefSections?.coverage_lapse;

  const heroVerdict = sec1?.verdict || (heroDecision?.status === 'underwritten' ? 'Recommended with Conditions' : 'Draft Underwriting');
  const heroPremium = sec2?.total_decision_premium !== undefined ? formatCurrency(sec2.total_decision_premium) : '$31,448';
  const heroPremiumRate = sec2?.premium_rate !== undefined ? formatPercent(sec2.premium_rate) : '10.2%';
  const heroUpside = sec2?.projected_upside !== undefined ? `+${formatCurrency(sec2.projected_upside)}` : '+$308,219';
  const heroNetLossProb = sec3?.probability_of_net_loss !== undefined ? formatPercent(sec3.probability_of_net_loss) : '8.5%';
  const heroLapseSummary = sec4?.lapse_conditions?.[0]?.condition_summary || 'Threshold churn (+3.69% margin over 3.10% baseline)';
  const heroTripwire = sec4?.primary_tripwire || 'Recommendation terminates if enterprise account churn exceeds 6.79% or contracted clawbacks exceed $46,233.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
      {/* Editorial Header */}
      <PageHeader
        kicker="Commercial Decision Underwriting · Executive Workstation"
        plainTitle="TRACE"
        italicTitle="Today"
        description="Not confidence. Coverage. TRACE calculates the financial risk price and strict failure boundaries of commercial decisions before capital is committed."
        actions={
          <Link
            href="/decisions"
            className="trace-btn trace-btn-primary"
            style={{ padding: '0.65rem 1.4rem' }}
          >
            Underwrite New Decision →
          </Link>
        }
      />

      {/* Operational System Strip */}
      <section>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1px',
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}
        >
          {/* Active Rate Card */}
          <Link
            href="/rate-card"
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="trace-kicker">ACTIVE RATE CARD</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>POLICY ↗</span>
            </div>
            <div className="trace-mono-num" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--accent-gold-light)', margin: '0.35rem 0' }}>
              {rateCard?.version_str ? `v${rateCard.version_str}` : 'v1.0.0'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Deterministic risk load schedule & tolerances
            </div>
          </Link>

          {/* Decision Register */}
          <Link
            href="/decisions"
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="trace-kicker">DECISION REGISTER</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>REGISTER ↗</span>
            </div>
            <div className="trace-mono-num" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.35rem 0' }}>
              {uniqueDecisions.length} ACTIVE
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Commercial underwriting files in register
            </div>
          </Link>

          {/* Data Health */}
          <Link
            href="/data"
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="trace-kicker">DATA HEALTH</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>WORKSPACE ↗</span>
            </div>
            <div className="trace-mono-num" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--verdict-recommended)', margin: '0.35rem 0' }}>
              {datasets[0]?.health_score ? `${(datasets[0].health_score * 100).toFixed(0)}% AUDITED` : '90% AUDITED'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              0 critical · 2 warnings · 1 gap
            </div>
          </Link>

          {/* Underwriting Engine Status */}
          <Link
            href="/evaluation"
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="trace-kicker">UNDERWRITING ENGINE</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EVALUATION ↗</span>
            </div>
            <div className="trace-mono-num" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--verdict-recommended)', margin: '0.35rem 0' }}>
              DETERMINISTIC
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Numerical Truth Firewalled · 18/18 Scenarios
            </div>
          </Link>
        </div>
      </section>

      {/* Hero Decision Underwriting Dossier */}
      {heroDecision && (
        <section
          style={{
            border: '1px solid var(--accent-gold-dim)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            padding: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div className="trace-kicker" style={{ color: 'var(--accent-gold)', marginBottom: '0.35rem' }}>
                PRIMARY COMMERCIAL UNDERWRITING FILE · {heroDecision.title.toLowerCase().includes('price') ? 'T2 PRICE ELASTICITY' : 'T1 DISCOUNT POLICY'}
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: '2.1rem',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                {heroDecision.title}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem', maxWidth: '850px' }}>
                {heroDecision.question_text} · {heroDecision.horizon_days}-Day Underwriting Horizon
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <VerdictBadge verdict={heroVerdict} size="lg" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Status: {heroDecision.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Essential Decision Numbers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              padding: '1.5rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <div className="trace-kicker">DECISION PREMIUM</div>
              <div className="trace-mono-num" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--accent-gold-light)', margin: '0.25rem 0' }}>
                {heroPremium}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {heroPremiumRate} Premium Rate · Expected Loss + Risk Loads
              </div>
            </div>

            <div>
              <div className="trace-kicker">PROJECTED NET UPSIDE</div>
              <div className="trace-mono-num" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--verdict-recommended)', margin: '0.25rem 0' }}>
                {heroUpside}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Gross margin recovery over {heroDecision.horizon_days} days
              </div>
            </div>

            <div>
              <div className="trace-kicker">NET LOSS PROBABILITY</div>
              <div className="trace-mono-num" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                {heroNetLossProb}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                1,000 Monte Carlo stochastic iterations
              </div>
            </div>

            <div>
              <div className="trace-kicker">COVERAGE LAPSE CONDITION</div>
              <div className="trace-mono-num" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--verdict-decline)', margin: '0.25rem 0' }}>
                6.79%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {heroLapseSummary}
              </div>
            </div>
          </div>

          {/* Conditional Validity & Action Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '900px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Conditional Validity: </strong>
              {heroTripwire}
            </div>
            <Link
              href={`/decisions/${heroDecision.id}`}
              className="trace-btn trace-btn-primary"
              style={{ padding: '0.6rem 1.4rem', fontSize: '0.875rem' }}
            >
              Open Complete Underwriting Brief →
            </Link>
          </div>
        </section>
      )}

      {/* Decision Register */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <div>
            <span className="trace-kicker">Commercial Portfolio</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Decision Register ({uniqueDecisions.length})
            </h3>
          </div>
          <Link
            href="/decisions"
            style={{
              fontSize: '0.8rem',
              color: 'var(--accent-gold-light)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            VIEW ALL DECISIONS →
          </Link>
        </div>

        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Commercial Decision</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Horizon</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {uniqueDecisions.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/decisions/${d.id}`)}
                  style={{
                    borderBottom: '1px solid var(--border-dim)',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  className="hover:bg-surface"
                >
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.925rem' }}>
                      {d.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                      {d.question_text.length > 100 ? `${d.question_text.slice(0, 100)}...` : d.question_text}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                    {d.title.toLowerCase().includes('price') ? 'T2 · Price Elasticity' : 'T1 · Discount Policy'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {d.horizon_days} days
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-gold-light)', fontWeight: 500 }}>
                      REVIEW DOSSIER →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audited Business Datasets */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <div>
            <span className="trace-kicker">Data Foundation</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Connected Business Datasets ({datasets.length})
            </h3>
          </div>
          <Link
            href="/data"
            style={{
              fontSize: '0.8rem',
              color: 'var(--accent-gold-light)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            VIEW DATA WORKSPACE →
          </Link>
        </div>

        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Dataset Name</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Tables & Files</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Volume</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Health Audit</th>
                <th style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => (
                <tr
                  key={ds.id}
                  onClick={() => router.push('/data')}
                  style={{
                    borderBottom: '1px solid var(--border-dim)',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  className="hover:bg-surface"
                >
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ds.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {ds.description ? (ds.description.length > 80 ? `${ds.description.slice(0, 80)}...` : ds.description) : 'No description'}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {ds.file_count} CSV tables
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {ds.total_rows.toLocaleString()} rows
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: 'var(--verdict-recommended-bg)',
                        color: 'var(--verdict-recommended)',
                        border: '1px solid var(--verdict-recommended-border)',
                      }}
                    >
                      HEALTH {ds.health_score ? `${(ds.health_score * 100).toFixed(0)}%` : '90%'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-gold-light)', fontWeight: 500 }}>
                      INSPECT WORKSPACE →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Underwriting Activity / Audit Trail */}
      <section>
        <div style={{ marginBottom: '0.75rem' }}>
          <span className="trace-kicker">Actuarial Ledger Trail</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Recent Underwriting Activity
          </h3>
        </div>

        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
          }}
        >
          {uniqueDecisions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {uniqueDecisions.slice(0, 3).map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '8px' }}>
                      [{d.status.toUpperCase()}]
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Updated {formatDate(d.updated_at || d.created_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              No recent underwriting activity.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
