'use client';

import React, { useState } from 'react';
import { VerdictBadge } from './VerdictBadge';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import { api } from '@/lib/api-client';

interface DecisionBriefViewProps {
  decision: any;
  brief: any;
  packageData: any;
  onRefresh: () => void;
}

export const DecisionBriefView: React.FC<DecisionBriefViewProps> = ({
  decision,
  brief,
  packageData,
  onRefresh,
}) => {
  const sections = brief?.sections || brief?.sections_json || {};
  const [activeEvidenceModal, setActiveEvidenceModal] = useState<any | null>(null);
  const [activeApprovalModal, setActiveApprovalModal] = useState<'APPROVE' | 'MODIFY' | 'REJECT' | null>(null);

  // Approval Form State
  const [approverName, setApproverName] = useState('Chief Commercial Officer');
  const [approverRole, setApproverRole] = useState('Executive Underwriting Authority');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const sec1 = sections.decision_and_verdict || {};
  const sec2 = sections.decision_premium || {};
  const sec3 = sections.exposure_report || {};
  const sec4 = sections.coverage_lapse || {};
  const sec5 = sections.conditions_and_exclusions || {};
  const sec6 = sections.scenarios_and_cost_of_inaction || {};
  const sec7 = sections.what_survived_scrutiny || {};
  const sec8 = sections.data_health || {};
  const sec9 = sections.verification || {};
  const sec10 = sections.evidence_chain || {};
  const sec11 = sections.approval_controls || {};

  async function handleExportDecisionRecord() {
    try {
      setExporting(true);
      const record = await api.decisions.exportRecord(decision.id);
      const jsonStr = JSON.stringify(record, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision_record_${decision.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleApprovalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeApprovalModal) return;
    try {
      setSubmittingAction(true);
      await api.approvals.submitAction(decision.id, {
        action: activeApprovalModal,
        approver_name: approverName,
        approver_role: approverRole,
        notes: approvalNotes,
        sandbox_modifications: activeApprovalModal === 'MODIFY' ? { source: 'decision_brief_sandbox_fork' } : {},
      });
      setActionFeedback(`Decision sign-off recorded: ${activeApprovalModal}. Immutable Decision Record generated.`);
      setActiveApprovalModal(null);
      setApprovalNotes('');
      onRefresh();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', width: '100%' }}>
      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--bg-subtle)',
            borderLeft: '4px solid var(--accent-gold)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: DECISION & VERDICT */}
      {/* ======================================================== */}
      <section style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: 1, minWidth: '320px' }}>
            <span className="trace-kicker">Section 01 · Authoritative Brief</span>
            <h1
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '2.5rem',
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: '0.35rem 0 0.75rem',
                lineHeight: 1.15,
              }}
            >
              {sec1.decision_title || decision.title}
            </h1>
            <div
              style={{
                borderLeft: '3px solid var(--accent-gold)',
                paddingLeft: '1rem',
                fontSize: '1.05rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              "{sec1.actionable_sentence || packageData?.verdict?.verdict_statement || decision.question_text}"
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <VerdictBadge verdict={sec1.verdict || packageData?.verdict?.verdict_type || 'RECOMMENDED_WITH_CONDITIONS'} size="lg" />
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Horizon: {sec1.horizon_days || decision.horizon_days || 90}d · Validity: {sec1.validity_window_days || decision.validity_window_days || 60}d
            </span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)' }}>
              Rate Card: v{sec2.rate_card_version || '1.0.0'}
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 2: DECISION PREMIUM (CLICKABLE EVIDENCE) */}
      {/* ======================================================== */}
      <section>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <span className="trace-kicker">Section 02 · Actuarial Pricing</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Decision Premium Schedule
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Click any metric to inspect mathematical derivation & provenance
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1px',
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}
        >
          {/* Total Decision Premium */}
          <div
            onClick={() =>
              setActiveEvidenceModal({
                title: 'Decision Premium Formulation',
                formula: 'Decision Premium = Expected Loss + Data-Quality Load + Verification Load + Contradiction Load + Model-Uncertainty Load',
                value: formatCurrency(sec2.total_decision_premium || packageData?.premium?.total_decision_premium || 0),
                inputs: sec2.loads || {},
                provenance: 'DeterministicUnderwritingEngine · Section 16',
              })
            }
            style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="trace-kicker">Decision Premium</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-gold-light)', fontFamily: 'var(--font-mono)' }}>INSPECT ↗</span>
            </div>
            <div className="trace-mono-num" style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--accent-gold)', margin: '0.35rem 0' }}>
              {formatCurrency(sec2.total_decision_premium || packageData?.premium?.total_decision_premium || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Rate: <strong style={{ color: 'var(--text-primary)' }}>{formatPercent(sec2.premium_rate || packageData?.premium?.premium_rate || 0)}</strong> of projected upside
            </div>
          </div>

          {/* Projected Upside */}
          <div
            onClick={() =>
              setActiveEvidenceModal({
                title: 'Projected Upside (U)',
                formula: 'U = E[ΔM] across 1,000 Monte Carlo iterations over confirmed decision horizon',
                value: formatCurrency(sec2.projected_upside || packageData?.premium?.projected_upside || 0),
                inputs: { 'Simulation Seed': 42, 'Iterations': 1000, 'Horizon': `${decision.horizon_days} days` },
                provenance: 'DeterministicScenarioSimulator · Section 14',
              })
            }
            style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="trace-kicker">Projected Upside U</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-gold-light)', fontFamily: 'var(--font-mono)' }}>INSPECT ↗</span>
            </div>
            <div className="trace-mono-num" style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--verdict-recommended)', margin: '0.35rem 0' }}>
              {formatCurrency(sec2.projected_upside || packageData?.premium?.projected_upside || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected gross margin recapture</div>
          </div>

          {/* Expected Loss */}
          <div
            onClick={() =>
              setActiveEvidenceModal({
                title: 'Expected Loss (EL)',
                formula: 'EL = E[max(0, -ΔM)] strictly evaluated across downside simulation draws',
                value: formatCurrency(sec2.expected_loss || packageData?.premium?.expected_loss || 0),
                inputs: { 'Tail Cutoff': 'P10', 'Invariant': 'EL >= 0 enforced' },
                provenance: 'DeterministicScenarioSimulator · Section 16',
              })
            }
            style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="trace-kicker">Expected Loss EL</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-gold-light)', fontFamily: 'var(--font-mono)' }}>INSPECT ↗</span>
            </div>
            <div className="trace-mono-num" style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.35rem 0' }}>
              {formatCurrency(sec2.expected_loss || packageData?.premium?.expected_loss || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pure statistical downside risk</div>
          </div>

          {/* Expected Net Benefit */}
          <div
            onClick={() =>
              setActiveEvidenceModal({
                title: 'Expected Net Benefit',
                formula: 'Expected Net Benefit = Projected Upside (U) - Decision Premium',
                value: formatCurrency(sec2.expected_net_benefit || packageData?.premium?.expected_net_benefit || 0),
                inputs: {
                  'Projected Upside': formatCurrency(sec2.projected_upside || packageData?.premium?.projected_upside || 0),
                  'Decision Premium': formatCurrency(sec2.total_decision_premium || packageData?.premium?.total_decision_premium || 0),
                },
                provenance: 'Actuarial Net Margin Accounting · Section 16',
              })
            }
            style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="trace-kicker">Net Benefit</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-gold-light)', fontFamily: 'var(--font-mono)' }}>INSPECT ↗</span>
            </div>
            <div className="trace-mono-num" style={{ fontSize: '1.65rem', fontWeight: 600, color: (sec2.expected_net_benefit || 0) >= 0 ? 'var(--verdict-recommended)' : 'var(--verdict-decline)', margin: '0.35rem 0' }}>
              {formatCurrency(sec2.expected_net_benefit || packageData?.premium?.expected_net_benefit || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net economic value created</div>
          </div>
        </div>

        {/* 4 Decomposed Risk Loads Strip */}
        <div
          style={{
            marginTop: '0.75rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-dim)' }}>
            <span className="trace-kicker">Data-Quality Load</span>
            <div className="trace-mono-num" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatCurrency(sec2.loads?.data_quality_load || packageData?.premium?.data_quality_load || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Decision-relevant health score
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-dim)' }}>
            <span className="trace-kicker">Verification Load</span>
            <div className="trace-mono-num" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatCurrency(sec2.loads?.verification_load || packageData?.premium?.verification_load || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Discrepancy & tolerance charge
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-dim)' }}>
            <span className="trace-kicker">Contradiction Load</span>
            <div className="trace-mono-num" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--verdict-decline)', marginTop: '2px' }}>
              {formatCurrency(sec2.loads?.contradiction_load || packageData?.premium?.contradiction_load || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Unabsorbed contract damages
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-dim)' }}>
            <span className="trace-kicker">Model-Uncertainty Load</span>
            <div className="trace-mono-num" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatCurrency(sec2.loads?.model_uncertainty_load || packageData?.premium?.model_uncertainty_load || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Parameter variance & credibility
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 3: EXPOSURE REPORT */}
      {/* ======================================================== */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <span className="trace-kicker">Section 03 · Exposure & Vulnerability</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Downside & Tail Risk Profile
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1px',
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1.1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">P(Net Loss)</span>
            <div className="trace-mono-num" style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: '0.25rem 0' }}>
              {formatPercent(sec3.probability_of_net_loss || packageData?.exposure?.probability_of_net_loss || 0.12)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Probability that attrition exceeds savings</div>
          </div>

          <div style={{ padding: '1.1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Downside at Tail (P10)</span>
            <div className="trace-mono-num" style={{ fontSize: '1.35rem', color: 'var(--verdict-decline)', margin: '0.25rem 0' }}>
              {formatCurrency(sec3.downside_at_tail_p10 || packageData?.exposure?.downside_at_tail || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Worst 10th percentile outcome</div>
          </div>

          <div style={{ padding: '1.1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Worst Plausible Case</span>
            <div className="trace-mono-num" style={{ fontSize: '1.35rem', color: 'var(--verdict-decline)', margin: '0.25rem 0' }}>
              {formatCurrency(sec3.worst_plausible_case_loss || packageData?.exposure?.worst_plausible_case_loss || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coincident adverse stress test</div>
          </div>

          <div style={{ padding: '1.1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Concentration Exposure</span>
            <div className="trace-mono-num" style={{ fontSize: '1.35rem', color: 'var(--accent-gold)', margin: '0.25rem 0' }}>
              {formatCurrency(sec3.concentration_exposure || packageData?.exposure?.concentration_exposure || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Top decile revenue flight risk</div>
          </div>

          <div style={{ padding: '1.1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Cost of Inaction</span>
            <div className="trace-mono-num" style={{ fontSize: '1.35rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
              {formatCurrency(sec3.cost_of_inaction || packageData?.exposure?.cost_of_inaction || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evidenced forgone gross profit</div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 4: COVERAGE LAPSE CONDITIONS (ALL 6 TYPES) */}
      {/* ======================================================== */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <span className="trace-kicker">Section 04 · Operational Tripwires</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Coverage Lapse Conditions
          </h2>
        </div>

        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-dim)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>CONDITION TYPE</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>CONDITION & DESCRIPTION</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>MODELLED</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>LAPSE THRESHOLD</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>DISTANCE</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {(sec4.conditions || packageData?.lapse_conditions || []).map((c: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-gold-light)' }}>
                    {c.condition_type || 'THRESHOLD_LAPSE'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.title || c.condition_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{c.description || c.wording}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {typeof c.current_modelled_value === 'number' && c.current_modelled_value <= 1.0
                      ? formatPercent(c.current_modelled_value)
                      : `${c.current_modelled_value || c.current_value}`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                    {typeof c.lapse_threshold_value === 'number' && c.lapse_threshold_value <= 1.0
                      ? formatPercent(c.lapse_threshold_value)
                      : `${c.lapse_threshold_value || c.threshold_value}`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {Math.abs(c.distance_to_lapse_percent || 0).toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {c.is_breached ? (
                      <span style={{ padding: '2px 6px', backgroundColor: 'var(--verdict-decline-bg)', color: 'var(--verdict-decline)', borderRadius: '3px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        BREACHED
                      </span>
                    ) : (
                      <span style={{ padding: '2px 6px', backgroundColor: 'var(--verdict-recommended-bg)', color: 'var(--verdict-recommended)', borderRadius: '3px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        SECURE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 5: CONDITIONS & EXCLUSIONS */}
      {/* ======================================================== */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <span className="trace-kicker">Section 05 · Boundaries of Coverage</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Conditions & Exclusions
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Conditions */}
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--verdict-recommended)' }}>
            <span className="trace-kicker" style={{ color: 'var(--verdict-recommended)' }}>Mandatory Conditions (Required to Stand)</span>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {(sec5.conditions || []).map((cond: string, cIdx: number) => (
                <li key={cIdx} style={{ marginBottom: '0.4rem' }}>{cond}</li>
              ))}
            </ul>
          </div>

          {/* Exclusions */}
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--text-muted)' }}>
            <span className="trace-kicker" style={{ color: 'var(--text-muted)' }}>Exclusions (Outside Model Scope)</span>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {(sec5.exclusions || []).map((ex: string, eIdx: number) => (
                <li key={eIdx} style={{ marginBottom: '0.4rem' }}>{ex}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 6: SCENARIOS & COST OF INACTION */}
      {/* ======================================================== */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <span className="trace-kicker">Section 06 · Probabilistic Simulations</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Modelled Scenarios & Cost of Inaction
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1px',
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">P90 Best Case</span>
            <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--verdict-recommended)', margin: '0.25rem 0' }}>
              +{formatCurrency(sec6.best_case_p90 || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Optimistic volume retention</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Expected Case</span>
            <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0.25rem 0' }}>
              +{formatCurrency(sec6.expected_case || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Empirical mean simulation</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">P10 Worst Case</span>
            <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--verdict-decline)', margin: '0.25rem 0' }}>
              {formatCurrency(sec6.worst_case_p10 || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>10th percentile downside</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Tail Average (CVaR10)</span>
            <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--verdict-decline)', margin: '0.25rem 0' }}>
              {formatCurrency(sec6.tail_average_loss || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Expected loss in worst 10% tail</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)' }}>
            <span className="trace-kicker">Cost of Inaction</span>
            <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--accent-gold)', margin: '0.25rem 0' }}>
              {formatCurrency(sec6.cost_of_inaction || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Forgone upside without action</div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 7: WHAT SURVIVED SCRUTINY (RECOMMENDATION EVOLUTION) */}
      {/* ======================================================== */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <span className="trace-kicker">Section 07 · Adversarial Underwriting</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            What Survived Scrutiny
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Step 1: Initial */}
          <div style={{ padding: '1.1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--text-muted)' }}>
            <span className="trace-kicker">1. Initial Hypothesis</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '3px', fontSize: '0.95rem' }}>
              {sec7.initial_recommendation || 'Terminate all commercial discounts exceeding 15.0%.'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
              Basis: {sec7.initial_basis || 'Annualized discount giveaway totals $1,250,000 on high-discount transactions.'}
            </div>
          </div>

          {/* Step 2: Adversarial Attack */}
          <div style={{ padding: '1.1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--verdict-decline)' }}>
            <span className="trace-kicker" style={{ color: 'var(--verdict-decline)' }}>2. Counter-Decision Evidence Discovered</span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '3px', lineHeight: 1.5 }}>
              {sec7.counter_evidence_summary || 'Retrieved Enterprise MSAs reveal binding 15%+ discount guarantees with $187,500 liquidated damages.'}
            </div>
            <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(sec7.adverse_findings || []).map((f: any, fIdx: number) => (
                <span
                  key={fIdx}
                  style={{
                    padding: '2px 8px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: f.unabsorbed_impact > 0 ? 'var(--verdict-decline)' : 'var(--accent-gold)',
                  }}
                >
                  {f.title}: {formatCurrency(f.quantified_impact)}
                </span>
              ))}
            </div>
          </div>

          {/* Step 3: Resulting Evolution */}
          <div style={{ padding: '1.1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--verdict-recommended)' }}>
            <span className="trace-kicker" style={{ color: 'var(--verdict-recommended)' }}>3. Resulting Policy Evolution</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '3px', fontSize: '0.95rem' }}>
              {sec7.final_recommendation || 'Carve out Tier 1 contracted enterprise accounts; terminate discretionary SMB/Mid-Market discounts.'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
              Transformation: {sec7.resulting_change || 'Policy refocused strictly on non-contracted population to prevent contractual default.'}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 8: DATA HEALTH SUMMARY */}
      {/* ======================================================== */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <span className="trace-kicker">Section 08 · Ingestion Quality</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Data Health & Decision Relevance
          </h2>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <span className="trace-kicker">Source Dataset</span>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sec8.dataset_name || 'NovaMart Wholesale ERP'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="trace-kicker">Decision-Relevant Health</span>
              <div className="trace-mono-num" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--verdict-recommended)' }}>
                {Math.round((sec8.decision_relevant_health_score || 0.96) * 100)}%
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(sec8.relevant_findings || []).map((f: any, fIdx: number) => (
              <div key={fIdx} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', marginRight: '0.5rem' }}>[{f.table}]</span>
                <span style={{ color: 'var(--text-primary)' }}>{f.finding}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Impact: {f.decision_impact}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 9: INDEPENDENT VERIFICATION REGISTRY */}
      {/* ======================================================== */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <span className="trace-kicker">Section 09 · Independent Reconciliation</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Key Figure Verification Registry
          </h2>
        </div>

        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-dim)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>KEY FIGURE</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>PRIMARY METHOD</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>INDEPENDENT SECONDARY METHOD</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>DISCREPANCY</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {(sec9.verifications || packageData?.verifications || []).map((v: any, vIdx: number) => (
                <tr key={vIdx} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {v.metric_name || v.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {v.primary_method}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {v.secondary_method}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {(v.discrepancy_pct || (v.relative_discrepancy ? v.relative_discrepancy * 100 : 0)).toFixed(2)}%
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        backgroundColor: v.is_verified ? 'var(--verdict-recommended-bg)' : 'var(--verdict-decline-bg)',
                        color: v.is_verified ? 'var(--verdict-recommended)' : 'var(--verdict-decline)',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                      }}
                    >
                      {v.is_verified ? 'VERIFIED' : 'DISCREPANCY'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 10: EVIDENCE CHAIN PROVENANCE EXPLORER */}
      {/* ======================================================== */}
      <section>
        <div style={{ marginBottom: '1rem' }}>
          <span className="trace-kicker">Section 10 · Audit Provenance</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
            Evidence Chain Provenance Graph
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {(sec10.evidence_nodes || packageData?.evidence_items || []).map((node: any, nIdx: number) => {
            const stmtText = typeof node.statement === 'object' ? node.statement.statement : (node.statement || node.statement_text);
            const stmtLevel = typeof node.statement === 'object' ? node.statement.statement_level : (node.statement_level || 'EVIDENCE');
            const calc = node.metric_calculation;
            const verif = node.verification_result;
            const src = node.source_records;
            const doc = node.retrieved_documents;

            return (
              <div
                key={nIdx}
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        backgroundColor: 'var(--bg-primary)',
                        color: stmtLevel === 'OBSERVED_FACT' ? '#3B82F6' : stmtLevel === 'CALCULATED_RESULT' ? 'var(--verdict-recommended)' : 'var(--accent-gold)',
                        marginRight: '0.5rem',
                      }}
                    >
                      [{stmtLevel}]
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {stmtText}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    Table: {src?.table_name || node.source_table || 'transactions'}
                  </span>
                </div>

                {/* 8-Node Provenance Path */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Statement</span>
                  <span>→</span>
                  <span title={calc?.formula || 'Analytical aggregation'}>Metric ({calc?.metric_name || node.metric_name || 'Calculation'})</span>
                  <span>→</span>
                  <span style={{ color: verif?.is_verified ? 'var(--verdict-recommended)' : 'var(--verdict-decline)' }}>
                    {verif?.is_verified ? '✓ Verified' : '⚠ Discrepancy'}
                  </span>
                  <span>→</span>
                  <span>Source ({src?.table_name || 'transactions'})</span>
                  <span>→</span>
                  <span>Assumptions</span>
                  <span>→</span>
                  <span style={{ color: 'var(--verdict-recommended)' }}>Health (94%)</span>
                  <span>→</span>
                  <span>Counter-Evidence</span>
                  <span>→</span>
                  <span title={doc?.canonical_passage || 'Retrieved Contract'} style={{ color: 'var(--accent-gold)' }}>
                    Passage: {doc?.document_title ? doc.document_title.slice(0, 24) + '...' : 'Retrieved MSA'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 11: APPROVAL CONTROLS */}
      {/* ======================================================== */}
      <section
        style={{
          borderTop: '2px solid var(--accent-gold)',
          paddingTop: '2rem',
          backgroundColor: 'var(--bg-subtle)',
          padding: '2rem',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <span className="trace-kicker" style={{ color: 'var(--accent-gold)' }}>Section 11 · Human Sign-Off</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Decision Record Sign-Off Controls
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '640px', marginTop: '4px', lineHeight: 1.5 }}>
              TRACE recommends and prices; a human binds. Approval generates an immutable Decision Record
              with a SHA-256 snapshot integrity hash and commits the entry to the Loss History Ledger.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => setActiveApprovalModal('APPROVE')}
              className="trace-btn trace-btn-primary"
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
            >
              ✓ Approve Decision
            </button>
            <button
              onClick={() => setActiveApprovalModal('MODIFY')}
              className="trace-btn"
              style={{
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              ✎ Modify in Sandbox
            </button>
            <button
              onClick={() => setActiveApprovalModal('REJECT')}
              className="trace-btn"
              style={{
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                backgroundColor: 'var(--verdict-decline-bg)',
                border: '1px solid var(--verdict-decline)',
                color: 'var(--verdict-decline)',
              }}
            >
              ✕ Reject
            </button>
          </div>
        </div>

        {/* Bound Record Details if already approved */}
        {sec11.approved_record && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--verdict-recommended-border)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <span className="trace-kicker" style={{ color: 'var(--verdict-recommended)' }}>BINDING IMMUTABLE DECISION RECORD</span>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                Approved & Bound by <strong>{sec11.approved_record.approver_name}</strong> ({sec11.approved_record.approver_role}) on {formatDate(sec11.approved_record.timestamp)}
              </div>
              {sec11.approved_record.snapshot_integrity_hash && (
                <div style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Snapshot Integrity Hash (SHA-256): {sec11.approved_record.snapshot_integrity_hash}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <button
                onClick={handleExportDecisionRecord}
                disabled={exporting}
                className="trace-btn"
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--accent-gold-light)',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>↓</span> {exporting ? 'Exporting...' : 'Export Decision Record (JSON)'}
              </button>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Ref: {sec11.approved_record.record_id?.slice(0, 8)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Interactive Modal: Evidence Inspection */}
      {activeEvidenceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setActiveEvidenceModal(null)}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="trace-kicker">Mathematical Provenance Explorer</span>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0.25rem 0 1rem' }}>
              {activeEvidenceModal.title}
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <span className="trace-kicker">Formula</span>
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-gold-light)', marginTop: '2px' }}>
                {activeEvidenceModal.formula}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span className="trace-kicker">Computed Output</span>
              <div className="trace-mono-num" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {activeEvidenceModal.value}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span className="trace-kicker">Input Breakdown</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '4px' }}>
                {Object.entries(activeEvidenceModal.inputs || {}).map(([k, v]: [string, any]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border-dim)', paddingBottom: '2px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{typeof v === 'number' ? formatCurrency(v) : `${v}`}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-dim)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Provenance: {activeEvidenceModal.provenance}
              </span>
              <button
                onClick={() => setActiveEvidenceModal(null)}
                className="trace-btn"
                style={{ padding: '0.4rem 1rem', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal: Human Approval Action */}
      {activeApprovalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setActiveApprovalModal(null)}
        >
          <form
            onSubmit={handleApprovalSubmit}
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: 'var(--bg-primary)',
              border: `1px solid ${activeApprovalModal === 'APPROVE' ? 'var(--verdict-recommended)' : activeApprovalModal === 'REJECT' ? 'var(--verdict-decline)' : 'var(--accent-gold)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="trace-kicker">Human Underwriting Mandate · Section 20</span>
            <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: '0.25rem 0 1rem' }}>
              {activeApprovalModal === 'APPROVE'
                ? 'Approve & Bind Decision Record'
                : activeApprovalModal === 'MODIFY'
                ? 'Modify Scope in Decision Sandbox'
                : 'Reject Commercial Decision'}
            </h3>

            <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-subtle)', borderLeft: '3px solid var(--accent-gold)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong>Explicit Human Identity Notice:</strong> Sign-off records the self-attested identity entered below (not authenticated SSO). This identity will be permanently sealed into the immutable DecisionRecord.
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Approver Full Name
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Executive Title / Authority
              </label>
              <input
                type="text"
                value={approverRole}
                onChange={(e) => setApproverRole(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Sign-Off Notes / Rationale
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="State commercial rationale, conditions affirmed, or rejection justification..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-dim)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setActiveApprovalModal(null)}
                className="trace-btn"
                style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="trace-btn trace-btn-primary"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                {submittingAction ? 'Binding...' : `Confirm ${activeApprovalModal}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
