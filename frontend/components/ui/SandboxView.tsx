'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  Decision,
  InvestigationPackage,
  SupportedAssumptionInfo,
  SandboxReQuoteResponse,
  ApprovalActionType,
} from '@/lib/types';
import { api } from '@/lib/api-client';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import { VerdictBadge } from '@/components/ui/VerdictBadge';

interface SandboxViewProps {
  decision: Decision;
  packageData: InvestigationPackage;
  onRefresh: () => void;
}

export const SandboxView: React.FC<SandboxViewProps> = ({
  decision,
  packageData,
  onRefresh,
}) => {
  const [supportedAssumptions, setSupportedAssumptions] = useState<SupportedAssumptionInfo[]>([]);
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({});
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [quote, setQuote] = useState<SandboxReQuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuoting, setIsQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approval modal states
  const [activeModal, setActiveModal] = useState<'APPROVE' | 'MODIFY' | 'REJECT' | null>(null);
  const [approverName, setApproverName] = useState('');
  const [approverRole, setApproverRole] = useState('Underwriting Officer');
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadInitialData();
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [decision.id]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError(null);

      const [assumps, vers] = await Promise.all([
        api.sandbox.getSupportedAssumptions(decision.id),
        api.sandbox.getVersions(decision.id),
      ]);

      setSupportedAssumptions(assumps);
      setVersions(vers);

      const initialValues: Record<string, number> = {};
      assumps.forEach((a) => {
        initialValues[a.name] = a.current_value;
      });
      setCurrentValues(initialValues);

      // Perform initial quote calculation with baseline
      const initialQuote = await api.sandbox.requote({
        decision_id: decision.id,
        run_label: 'Interactive Sandbox Session',
        assumptions: initialValues,
      });
      setQuote(initialQuote);
      setSelectedVersionId(initialQuote.sandbox_run_id);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize decision sandbox');
    } finally {
      setLoading(false);
    }
  }

  const triggerReQuote = (updatedAssumptions: Record<string, number>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsQuoting(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.sandbox.requote({
          decision_id: decision.id,
          parent_run_id: quote?.parent_run_id || quote?.sandbox_run_id,
          run_label: `Sandbox What-If [${Object.keys(updatedAssumptions).length} inputs]`,
          assumptions: updatedAssumptions,
        });
        setQuote(res);
        setError(null);
      } catch (err: any) {
        setError(err?.message || 'Re-quote computation failed');
      } finally {
        setIsQuoting(false);
      }
    }, 250);
  };

  const handleSliderChange = (name: string, val: number) => {
    const updated = { ...currentValues, [name]: val };
    setCurrentValues(updated);
    triggerReQuote(updated);
  };

  const handleReset = () => {
    const resetVals: Record<string, number> = {};
    supportedAssumptions.forEach((a) => {
      resetVals[a.name] = a.baseline_value;
    });
    setCurrentValues(resetVals);
    triggerReQuote(resetVals);
  };

  const handleApprovalAction = async (action: 'APPROVE' | 'MODIFY' | 'REJECT') => {
    if (!approverName.trim()) {
      setActionError('Approver Name is required for immutable sign-off.');
      return;
    }

    try {
      setIsSubmittingAction(true);
      setActionError(null);

      await api.approvals.submitAction(decision.id, {
        action,
        approver_name: approverName.trim(),
        approver_role: approverRole.trim(),
        notes: actionNotes.trim(),
        sandbox_modifications: {
          scenario_run_id: quote?.sandbox_run_id,
          parent_run_id: quote?.parent_run_id,
          assumptions: currentValues,
        },
      });

      setActiveModal(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || `Failed to submit ${action} action`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          Initializing deterministic decision sandbox...
        </div>
      </div>
    );
  }

  const isLapsed = quote?.coverage_state === 'COVERAGE_LAPSED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Sandbox Header / Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          backgroundColor: isLapsed ? 'rgba(217, 83, 79, 0.08)' : 'var(--bg-subtle)',
          border: `1px solid ${isLapsed ? 'var(--verdict-decline)' : 'var(--border-dim)'}`,
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isLapsed ? 'var(--verdict-decline)' : 'var(--accent-gold-dim)',
                color: isLapsed ? '#fff' : 'var(--accent-gold)',
              }}
            >
              {isLapsed ? 'COVERAGE LAPSED' : 'COVERED BY TRACE'}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Live Decision Sandbox
            </span>
            {isQuoting && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-gold)',
                  animation: 'pulse 1.5s infinite',
                }}
              >
                ● CALCULATING DETERMINISTIC RE-QUOTE...
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Modifying assumptions directly triggers deterministic actuarial re-underwriting without LLM intervention.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {quote?.verdict && (
            <VerdictBadge verdict={quote.verdict as any} size="md" />
          )}
          <button
            onClick={handleReset}
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Reset to Baseline
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--verdict-decline-bg)',
            borderLeft: '4px solid var(--verdict-decline)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--verdict-decline)',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Grid: Controls Left, Financial Impact Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Assumption Controls & Coverage Lapse Meter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Assumption Controls Panel */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                TEMPLATE-SUPPORTED ASSUMPTIONS
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Authoritative Template Controls
              </span>
            </div>

            {supportedAssumptions.map((assump) => {
              const val = currentValues[assump.name] ?? assump.current_value;
              const isModified = Math.abs(val - assump.baseline_value) > 1e-6;
              const isPercent = assump.unit === '%';

              return (
                <div
                  key={assump.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '1rem',
                    backgroundColor: isModified ? 'rgba(197, 160, 89, 0.05)' : 'var(--bg-subtle)',
                    border: `1px solid ${isModified ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {assump.display_label}
                      </span>
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isModified ? 'var(--accent-gold-dim)' : 'var(--bg-subtle)',
                          color: isModified ? 'var(--accent-gold)' : 'var(--text-muted)',
                        }}
                      >
                        {isModified ? 'User-Supplied' : 'Baseline'}
                      </span>
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {isPercent ? `${(val * 100).toFixed(1)}%` : val.toLocaleString()} {assump.unit !== '%' ? assump.unit : ''}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {assump.description}
                  </div>

                  {/* Slider & Range Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                    <input
                      type="range"
                      min={assump.min_value}
                      max={assump.max_value}
                      step={assump.step}
                      value={val}
                      onChange={(e) => handleSliderChange(assump.name, parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                    />
                    <input
                      type="number"
                      min={assump.min_value}
                      max={assump.max_value}
                      step={assump.step}
                      value={val}
                      onChange={(e) => handleSliderChange(assump.name, parseFloat(e.target.value) || 0)}
                      style={{
                        width: '75px',
                        padding: '0.3rem 0.45rem',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        textAlign: 'right',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    <span>Min: {isPercent ? `${(assump.min_value * 100).toFixed(1)}%` : assump.min_value}</span>
                    <span>Baseline: {isPercent ? `${(assump.baseline_value * 100).toFixed(1)}%` : assump.baseline_value}</span>
                    <span>Max: {isPercent ? `${(assump.max_value * 100).toFixed(1)}%` : assump.max_value}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FLAGSHIP TRACE INTERACTION: Coverage Lapse Meter */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: `1px solid ${isLapsed ? 'var(--verdict-decline)' : 'var(--border-dim)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                COVERAGE LAPSE BOUNDARIES
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: isLapsed ? 'var(--verdict-decline)' : 'var(--accent-gold-light)',
                }}
              >
                {isLapsed ? 'BREACHED — COVERAGE VOID' : 'WITHIN UNDERWRITTEN PARAMETERS'}
              </span>
            </div>

            {quote?.lapse_conditions?.map((cond, idx) => {
              const distance = cond.distance_to_lapse_percent;
              const safePercent = Math.max(0, Math.min(100, 100 - distance));
              const isUrgent = distance < 15 || cond.is_breached;

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '0.9rem 1rem',
                    backgroundColor: 'var(--bg-subtle)',
                    border: `1px solid ${cond.is_breached ? 'var(--verdict-decline)' : isUrgent ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {cond.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: cond.is_breached ? 'var(--verdict-decline)' : 'var(--text-secondary)' }}>
                      Current: <strong>{cond.current_value.toFixed(2)}</strong> / Threshold: <strong>{cond.threshold.toFixed(2)}</strong>
                    </span>
                  </div>

                  {/* Visual Threshold Bar: CURRENT ──────●────────────────│ LAPSE */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>0</span>
                    <div
                      style={{
                        position: 'relative',
                        flex: 1,
                        height: '8px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${safePercent}%`,
                          backgroundColor: cond.is_breached
                            ? 'var(--verdict-decline)'
                            : isUrgent
                            ? 'var(--accent-gold)'
                            : 'var(--verdict-recommended)',
                          transition: 'width 0.25s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--verdict-decline)' }}>LAPSE</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem' }}>
                    <span style={{ color: cond.is_breached ? 'var(--verdict-decline)' : 'var(--text-muted)' }}>
                      {cond.is_breached
                        ? 'LAPSED: Risk exceeded maximum allowable tolerance'
                        : `${distance.toFixed(1)}% buffer remaining`}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {cond.wording}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Decision Lineage & Versions */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                SCENARIO LINEAGE & RUNS
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Rate Card v{quote?.rate_card_version || '1.0'} · Seed: {quote?.scenario_seed || 42}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {versions.map((v, i) => {
                const isActive = v.id === quote?.sandbox_run_id || (v.is_baseline && !quote?.parent_run_id);
                return (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: isActive ? 'var(--accent-gold-dim)' : 'var(--bg-subtle)',
                      border: `1px solid ${isActive ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
                        #{i + 1} {v.is_baseline ? 'BASELINE' : 'SANDBOX FORK'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {v.run_label || 'Scenario Run'}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatDate(v.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Before / After Comparison & Human Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Before / After Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                DETERMINISTIC BEFORE / AFTER
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                1,000 Monte Carlo Trials
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>METRIC</th>
                  <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem', textAlign: 'right' }}>BASELINE</th>
                  <th style={{ padding: '0.6rem 0.5rem', color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.75rem', textAlign: 'right' }}>SANDBOX</th>
                  <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem', textAlign: 'right' }}>VARIANCE</th>
                </tr>
              </thead>
              <tbody>
                {quote?.comparison_metrics?.map((row) => {
                  const isVerdict = row.metric === 'verdict';
                  const isCoverage = row.metric === 'coverage_state';

                  return (
                    <tr
                      key={row.metric}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: row.direction === 'deteriorated' ? 'rgba(217, 83, 79, 0.04)' : undefined,
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {row.display_label}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {isVerdict || isCoverage ? String(row.baseline_value) : typeof row.baseline_value === 'number' ? (row.unit === '$' ? formatCurrency(row.baseline_value) : `${row.baseline_value}${row.unit}`) : row.baseline_value}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: row.direction === 'deteriorated' ? 'var(--verdict-decline)' : 'var(--text-primary)' }}>
                        {isVerdict || isCoverage ? String(row.sandbox_value) : typeof row.sandbox_value === 'number' ? (row.unit === '$' ? formatCurrency(row.sandbox_value) : `${row.sandbox_value}${row.unit}`) : row.sandbox_value}
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 0.5rem',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8rem',
                          color: row.direction === 'deteriorated' ? 'var(--verdict-decline)' : row.direction === 'improved' ? 'var(--verdict-recommended)' : 'var(--text-muted)',
                        }}
                      >
                        {row.delta_percent !== undefined && row.delta_percent !== null ? (
                          <span>{row.delta_percent > 0 ? `+${row.delta_percent.toFixed(1)}%` : `${row.delta_percent.toFixed(1)}%`}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* WHAT CHANGED DIFF */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                WHAT CHANGED (EXPLICIT USER MODIFICATIONS)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {quote?.changed_assumptions?.length || 0} Delta(s)
              </span>
            </div>

            {(!quote?.changed_assumptions || quote.changed_assumptions.length === 0) ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                No assumptions modified yet. Operating at analytical baseline.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {quote.changed_assumptions.map((diff) => (
                  <div
                    key={diff.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: 'rgba(197, 160, 89, 0.08)',
                      border: '1px solid var(--accent-gold-dim)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {diff.display_label}
                    </span>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {diff.unit === '%' ? `${(diff.baseline_value * 100).toFixed(1)}%` : diff.baseline_value}
                      </span>
                      <span style={{ color: 'var(--accent-gold)', margin: '0 0.5rem' }}>→</span>
                      <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                        {diff.unit === '%' ? `${(diff.sandbox_value * 100).toFixed(1)}%` : diff.sandbox_value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EXACT THREE PATHS: HUMAN APPROVAL PANEL */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                HUMAN SIGN-OFF (EXACT THREE PATHS)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Binding Governance Action
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Choose a legally binding path for this underwritten decision. Every path is tracked in the immutable audit log and Loss History Ledger.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
              {/* APPROVE */}
              <button
                onClick={() => setActiveModal('APPROVE')}
                disabled={isLapsed}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.85rem 0.6rem',
                  backgroundColor: isLapsed ? 'var(--bg-subtle)' : 'var(--verdict-recommended)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: isLapsed ? 'var(--text-muted)' : '#000',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  cursor: isLapsed ? 'not-allowed' : 'pointer',
                  opacity: isLapsed ? 0.4 : 1,
                }}
              >
                <span>APPROVE</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.85 }}>
                  Creates Immutable Record
                </span>
              </button>

              {/* MODIFY */}
              <button
                onClick={() => setActiveModal('MODIFY')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.85rem 0.6rem',
                  backgroundColor: 'var(--accent-gold)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                }}
              >
                <span>MODIFY</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.85 }}>
                  Fork New Version
                </span>
              </button>

              {/* REJECT */}
              <button
                onClick={() => setActiveModal('REJECT')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.85rem 0.6rem',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--verdict-decline)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--verdict-decline)',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                }}
              >
                <span>REJECT</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.85 }}>
                  Record Rejection
                </span>
              </button>
            </div>

            {isLapsed && (
              <div style={{ fontSize: '0.75rem', color: 'var(--verdict-decline)', fontFamily: 'var(--font-mono)' }}>
                Notice: APPROVE is disabled while coverage has lapsed. Adjust assumptions back within boundaries or MODIFY to proceed.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* APPROVAL / MODIFY / REJECT MODAL */}
      {activeModal && (
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
              maxWidth: '540px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeModal === 'APPROVE' && 'Approve & Freeze Decision Record'}
                {activeModal === 'MODIFY' && 'Fork New Sandbox Version'}
                {activeModal === 'REJECT' && 'Reject Underwritten Decision'}
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {activeModal === 'APPROVE' && (
                <span>
                  This action freezes the active sandbox parameters into an <strong>immutable Decision Record</strong> with a SHA-256 Snapshot Integrity Hash. The prediction will be recorded in the Loss History Ledger.
                </span>
              )}
              {activeModal === 'MODIFY' && (
                <span>
                  This action creates a new sandbox scenario fork linked to its parent, preserving the original analytical baseline completely intact.
                </span>
              )}
              {activeModal === 'REJECT' && (
                <span>
                  This action marks the decision as REJECTED in the audit trail and writes a human rejection entry to the Loss History Ledger. No approved Decision Record will be bound.
                </span>
              )}
            </div>

            {/* Approver identity notice per Phase 5/6 requirement */}
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              Identity Disclosure: Approver fields represent explicit human actor entries, not authenticated SSO credentials.
            </div>

            {actionError && (
              <div style={{ color: 'var(--verdict-decline)', fontSize: '0.8rem' }}>
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  APPROVER NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
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
                  ROLE / TITLE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chief Underwriting Officer"
                  value={approverRole}
                  onChange={(e) => setApproverRole(e.target.value)}
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
                  {activeModal === 'REJECT' ? 'REJECTION REASON *' : 'GOVERNANCE NOTES / CONDITIONS'}
                </label>
                <textarea
                  rows={3}
                  placeholder={activeModal === 'REJECT' ? 'State the explicit basis for human rejection...' : 'Optional conditions or context...'}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setActiveModal(null)}
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
                onClick={() => handleApprovalAction(activeModal)}
                disabled={isSubmittingAction}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor:
                    activeModal === 'APPROVE'
                      ? 'var(--verdict-recommended)'
                      : activeModal === 'MODIFY'
                      ? 'var(--accent-gold)'
                      : 'var(--verdict-decline)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#000',
                  cursor: isSubmittingAction ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingAction ? 0.5 : 1,
                }}
              >
                {isSubmittingAction ? 'Processing...' : `Confirm ${activeModal}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
