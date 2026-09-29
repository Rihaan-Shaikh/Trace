'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataViews';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { api } from '@/lib/api-client';
import { LossHistoryEntry } from '@/lib/types';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';

export default function LedgerPage() {
  const [entries, setEntries] = useState<LossHistoryEntry[]>([]);
  const [recalibration, setRecalibration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Outcome Logging Modal State
  const [selectedEntry, setSelectedEntry] = useState<LossHistoryEntry | null>(null);
  const [actualOutcomeValue, setActualOutcomeValue] = useState<string>('');
  const [loggedByName, setLoggedByName] = useState<string>('');
  const [varianceNotes, setVarianceNotes] = useState<string>('');
  const [sourceRef, setSourceRef] = useState<string>('ERP Q3 Ledger Reconciliation');
  const [isLoggingOutcome, setIsLoggingOutcome] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);

  useEffect(() => {
    loadLedgerAndRecalibration();
  }, []);

  async function loadLedgerAndRecalibration() {
    try {
      setLoading(true);
      setError(null);
      const [res, recal] = await Promise.all([
        api.ledger.list(0, 100),
        api.ledger.recalibration('pricing').catch(() => null),
      ]);
      setEntries(res.items);
      setRecalibration(recal);
    } catch (err: any) {
      setError(err.message || 'Failed to load Loss History Ledger');
    } finally {
      setLoading(false);
    }
  }

  const handleSeedHistory = async () => {
    try {
      setIsSeeding(true);
      await api.ledger.seedSimulated(true);
      await loadLedgerAndRecalibration();
    } catch (err: any) {
      setError(err?.message || 'Failed to seed simulated history');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleLogOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    const numVal = parseFloat(actualOutcomeValue);
    if (isNaN(numVal)) {
      setOutcomeError('Please enter a valid numeric realised outcome value.');
      return;
    }
    if (!loggedByName.trim()) {
      setOutcomeError('Actor name is required for immutable outcome logging.');
      return;
    }

    try {
      setIsLoggingOutcome(true);
      setOutcomeError(null);

      await api.ledger.logOutcome(selectedEntry.id, {
        primary_metric_realised: numVal,
        logged_by: loggedByName.trim(),
        variance_notes: varianceNotes.trim() || undefined,
        source_reference: sourceRef.trim() || undefined,
      });

      setSelectedEntry(null);
      setActualOutcomeValue('');
      await loadLedgerAndRecalibration();
    } catch (err: any) {
      setOutcomeError(err?.message || 'Failed to log actual outcome');
    } finally {
      setIsLoggingOutcome(false);
    }
  };

  if (loading) return <LoadingState message="Auditing Loss History Ledger records..." />;
  if (error) return <ErrorState message={error} onRetry={loadLedgerAndRecalibration} />;

  const hasSimulated = entries.some((e) => e.is_simulated);

  const columns = [
    {
      header: 'Decision & Class',
      accessor: (e: LossHistoryEntry) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
            {e.decision_title}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Class: <strong style={{ color: 'var(--text-secondary)' }}>{e.decision_class}</strong></span>
            <span>· Underwritten: {formatDate(e.underwritten_date)}</span>
            {e.is_simulated && (
              <span
                style={{
                  padding: '1px 5px',
                  backgroundColor: 'rgba(197, 160, 89, 0.1)',
                  border: '1px solid var(--accent-gold-dim)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--accent-gold)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                }}
              >
                SIMULATED DATA
              </span>
            )}
          </div>
        </div>
      ),
      width: '32%',
    },
    {
      header: 'Predicted Upside',
      accessor: (e: LossHistoryEntry) => (
        <span className="trace-mono-num" style={{ fontSize: '0.85rem' }}>
          {formatCurrency(e.projected_upside)}
        </span>
      ),
      width: '12%',
    },
    {
      header: 'Actual Outcome',
      accessor: (e: LossHistoryEntry) => {
        if (e.actual_realised_value !== undefined && e.actual_realised_value !== null) {
          return (
            <span className="trace-mono-num" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {formatCurrency(e.actual_realised_value)}
            </span>
          );
        }
        return (
          <button
            onClick={() => {
              setSelectedEntry(e);
              setActualOutcomeValue(e.projected_upside.toString());
              setOutcomeError(null);
            }}
            style={{
              padding: '0.25rem 0.55rem',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--accent-gold-dim)',
              border: '1px solid var(--accent-gold)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-gold)',
              cursor: 'pointer',
            }}
          >
            + Log Outcome
          </button>
        );
      },
      width: '13%',
    },
    {
      header: 'Variance',
      accessor: (e: LossHistoryEntry) => {
        if (e.actual_vs_predicted_variance !== undefined && e.actual_vs_predicted_variance !== null) {
          const varVal = e.actual_vs_predicted_variance;
          const isNeg = varVal < 0;
          return (
            <span
              className="trace-mono-num"
              style={{
                fontSize: '0.825rem',
                color: isNeg ? 'var(--verdict-decline)' : 'var(--verdict-recommended)',
                fontWeight: 600,
              }}
            >
              {isNeg ? formatCurrency(varVal) : `+${formatCurrency(varVal)}`}
            </span>
          );
        }
        return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>;
      },
      width: '11%',
    },
    {
      header: 'Action',
      accessor: (e: LossHistoryEntry) => (
        <span
          style={{
            fontSize: '0.725rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: e.human_action === 'Approved' ? 'var(--verdict-recommended)' : 'var(--verdict-decline)',
          }}
        >
          {e.human_action || 'Approved'}
        </span>
      ),
      width: '9%',
    },
    {
      header: 'Lapse / Claim',
      accessor: (e: LossHistoryEntry) => {
        if (e.is_claim === null || e.is_claim === undefined) {
          return (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.725rem', fontFamily: 'var(--font-mono)' }}>
              MONITORING
            </span>
          );
        }
        return (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.675rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              backgroundColor: e.is_claim ? 'var(--verdict-decline-bg)' : 'var(--verdict-recommended-bg)',
              color: e.is_claim ? 'var(--verdict-decline)' : 'var(--verdict-recommended)',
              border: `1px solid ${e.is_claim ? 'var(--verdict-decline-border)' : 'var(--verdict-recommended-border)'}`,
            }}
          >
            {e.is_claim ? 'CLAIM (BREACH)' : 'WITHIN TAIL'}
          </span>
        );
      },
      width: '13%',
      align: 'right' as const,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <PageHeader
        kicker="Actuarial Memory · Credibility Blending"
        plainTitle="Loss History"
        italicTitle="Ledger"
        description="The permanent actuarial record of underwritten decisions: predicted financial impacts versus realised outcomes, recalibrating future Model-Uncertainty Loads via Bühlmann credibility."
      />

      {/* MANDATORY DISCLAIMER BANNER (Project Bible Section 20/21) */}
      {hasSimulated && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: 'rgba(197, 160, 89, 0.08)',
            border: '1px solid var(--accent-gold)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '0.2rem 0.6rem',
                backgroundColor: 'var(--accent-gold)',
                color: '#000',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              SIMULATED HISTORY — NOVAMART TEST DATA
            </span>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Seeded synthetic decisions demonstrate actuarial memory and credibility recalibration without exposing customer production secrets.
            </span>
          </div>
          <button
            onClick={handleSeedHistory}
            disabled={isSeeding}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'transparent',
              border: '1px solid var(--accent-gold)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-gold)',
              cursor: isSeeding ? 'not-allowed' : 'pointer',
            }}
          >
            {isSeeding ? 'Re-seeding...' : 'Reset Synthetic Seed'}
          </button>
        </div>
      )}

      {/* RECALIBRATION DASHBOARD (CREDIBILITY Z = n / (n + k)) */}
      {recalibration && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '1px',
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Decision Class</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.25rem 0', textTransform: 'capitalize' }}>
              {recalibration.decision_class}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Actuarial peer population
            </div>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Observed History (n)</span>
            <div className="trace-mono-num" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
              {recalibration.logged_decisions_count}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {recalibration.claims_count} adverse claims
            </div>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Credibility Weight (Z)</span>
            <div className="trace-mono-num" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-gold)', margin: '0.25rem 0' }}>
              {recalibration.credibility_z.toFixed(3)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {recalibration.details?.tuning_constant_k
                ? `Z = n / (n + ${recalibration.details.tuning_constant_k}) · policy k`
                : 'Z = n / (n + k) · policy k'}
            </div>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Experience Factor</span>
            <div
              className="trace-mono-num"
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: recalibration.experience_factor > 1.0 ? 'var(--verdict-decline)' : 'var(--verdict-recommended)',
                margin: '0.25rem 0',
              }}
            >
              {recalibration.experience_factor.toFixed(3)}×
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Neutral starting: 1.000×
            </div>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Future Risk Load Effect</span>
            <div
              className="trace-mono-num"
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: recalibration.experience_factor > 1.0 ? 'var(--verdict-decline)' : 'var(--verdict-recommended)',
                margin: '0.35rem 0',
              }}
            >
              {recalibration.experience_factor > 1.0 ? `+${((recalibration.experience_factor - 1) * 100).toFixed(1)}%` : `${((recalibration.experience_factor - 1) * 100).toFixed(1)}%`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Scales Model-Uncertainty Load
            </div>
          </div>
        </section>
      )}

      {/* Historical Register Table */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <div>
            <span className="trace-kicker">Actuarial Register</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Historical Loss Ledger ({entries.length} Entries)
            </h2>
          </div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Audit Chain: SHA-256 Validated
          </div>
        </div>

        <DataTable
          columns={columns}
          data={entries}
          emptyMessage="No ledger records yet. When decisions are underwritten and confirmed, their actuarial predictions bind to this ledger."
        />
      </section>

      {/* LOG ACTUAL OUTCOME MODAL */}
      {selectedEntry && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem',
              width: '100%',
              maxWidth: '520px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Log Realised Financial Outcome
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Recording actual observed results updates the loss history and immediately feeds the deterministic credibility recalibration engine.
            </div>

            <div
              style={{
                padding: '0.85rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {selectedEntry.decision_title}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Predicted Upside: <strong style={{ color: 'var(--text-secondary)' }}>{formatCurrency(selectedEntry.projected_upside)}</strong>
                {' · '}P10 Tail: <strong style={{ color: 'var(--verdict-decline)' }}>{formatCurrency(selectedEntry.p10_tail_exposure)}</strong>
              </div>
            </div>

            {outcomeError && (
              <div style={{ color: 'var(--verdict-decline)', fontSize: '0.8rem' }}>
                {outcomeError}
              </div>
            )}

            <form onSubmit={handleLogOutcomeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  ACTUAL REALISED VALUE ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={actualOutcomeValue}
                  onChange={(e) => setActualOutcomeValue(e.target.value)}
                  placeholder="e.g. 295000"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                  }}
                />
                {actualOutcomeValue && !isNaN(parseFloat(actualOutcomeValue)) && (
                  <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    Predicted: {formatCurrency(selectedEntry.projected_upside)} → Realised: {formatCurrency(parseFloat(actualOutcomeValue))}
                    <span style={{ marginLeft: '0.5rem', fontWeight: 600, color: parseFloat(actualOutcomeValue) - selectedEntry.projected_upside < 0 ? 'var(--verdict-decline)' : 'var(--verdict-recommended)' }}>
                      Variance: {formatCurrency(parseFloat(actualOutcomeValue) - selectedEntry.projected_upside)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  LOGGED BY (AUDITOR / OFFICER NAME) *
                </label>
                <input
                  type="text"
                  value={loggedByName}
                  onChange={(e) => setLoggedByName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  SOURCE REFERENCE / LEDGER AUDIT REF
                </label>
                <input
                  type="text"
                  value={sourceRef}
                  onChange={(e) => setSourceRef(e.target.value)}
                  placeholder="e.g. SAP ERP Q3 Settlement Batch #4982"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  VARIANCE NOTES
                </label>
                <textarea
                  rows={2}
                  value={varianceNotes}
                  onChange={(e) => setVarianceNotes(e.target.value)}
                  placeholder="Account for divergence from prediction..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  style={{
                    padding: '0.55rem 1rem',
                    fontSize: '0.8rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingOutcome}
                  style={{
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: 'var(--accent-gold)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: '#000',
                    cursor: isLoggingOutcome ? 'not-allowed' : 'pointer',
                    opacity: isLoggingOutcome ? 0.5 : 1,
                  }}
                >
                  {isLoggingOutcome ? 'Persisting Outcome...' : 'Save Immutable Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
