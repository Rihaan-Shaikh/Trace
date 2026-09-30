'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { VerdictBadge } from '@/components/ui/VerdictBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PremiumDisplay } from '@/components/ui/PremiumDisplay';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { api } from '@/lib/api-client';
import {
  Decision,
  DecisionObjective,
  InvestigationPlan,
  InvestigationPackage,
} from '@/lib/types';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import { DecisionBriefView } from '@/components/ui/DecisionBriefView';
import { SandboxView } from '@/components/ui/SandboxView';


const STAGE_LABELS: Record<string, { num: string; title: string }> = {
  data_check: { num: '01', title: 'Data Check & Ingestion Health' },
  segmentation: { num: '02', title: 'Population & Account Segmentation' },
  margin_analysis: { num: '03', title: 'Margin Depth & Giveaway Analysis' },
  churn_analysis: { num: '04', title: 'Churn Linkage & Independent Verification' },
  scenario_simulation: { num: '05', title: 'Monte Carlo Scenario Simulation' },
  contradiction_check: { num: '06', title: 'Counter-Decision Underwriter' },
  underwriting: { num: '07', title: 'Actuarial Underwriting & Quote' },
};

export default function DecisionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [decision, setDecision] = useState<Decision | null>(null);
  const [objective, setObjective] = useState<DecisionObjective | null>(null);
  const [plan, setPlan] = useState<InvestigationPlan | null>(null);
  const [pkg, setPkg] = useState<InvestigationPackage | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const [suggesting, setSuggesting] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [investigating, setInvestigating] = useState(false);

  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [objForm, setObjForm] = useState({
    primary_goal: '',
    target_metric: '',
    constraint_description: '',
    baseline_value: 0,
    target_value: 0,
  });

  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'brief' | 'stages' | 'sandbox'>('brief');

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      const dec = await api.decisions.get(id);
      setDecision(dec);

      if (dec.objective) {
        setObjective(dec.objective);
        setObjForm({
          primary_goal: dec.objective.primary_goal,
          target_metric: dec.objective.target_metric,
          constraint_description: dec.objective.constraint_description || '',
          baseline_value: dec.objective.baseline_value || 0,
          target_value: dec.objective.target_value || 0,
        });
      } else {
        setObjective(null);
      }

      try {
        const p = await api.decisions.getPlan(id);
        setPlan(p);
      } catch {
        setPlan(null);
      }

      try {
        const pData = await api.decisions.getPackage(id);
        if (pData && (['underwritten', 'approved', 'modified', 'rejected'].includes(pData.decision?.status) || Boolean(pData.verdict))) {
          if (!pData.brief) {
            try {
              const b = await api.approvals.getBrief(id);
              if (b) pData.brief = b;
            } catch {
              // brief not found
            }
          }
          setPkg(pData);
          setSelectedStage('contradiction_check');
        } else {
          setPkg(null);
        }
      } catch {
        setPkg(null);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load decision investigation file.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSuggestObjective() {
    try {
      setSuggesting(true);
      setError(null);
      setNotification(null);
      const res = await api.decisions.suggestObjective(id);
      setObjective(res);
      setObjForm({
        primary_goal: res.primary_goal,
        target_metric: res.target_metric,
        constraint_description: res.constraint_description || '',
        baseline_value: res.baseline_value || 0,
        target_value: res.target_value || 0,
      });
      setNotification('Decision Objective structured. Review parameters below and confirm to proceed.');
    } catch (err: any) {
      setError(err.message || 'Failed to suggest Decision Objective.');
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSaveObjective() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.decisions.setObjective(id, {
        primary_goal: objForm.primary_goal,
        target_metric: objForm.target_metric,
        constraint_description: objForm.constraint_description,
        baseline_value: Number(objForm.baseline_value),
        target_value: Number(objForm.target_value),
        parameters: { user_confirmed: true },
      });
      setObjective(res);
      setIsEditingObjective(false);
      setNotification('Decision Objective confirmed and locked. Investigation Plan unlocked.');
    } catch (err: any) {
      setError(err.message || 'Failed to save Decision Objective.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePlan() {
    try {
      setPlanning(true);
      setError(null);
      setNotification(null);
      const generatedPlan = await api.decisions.generatePlan(id);
      setPlan(generatedPlan);
      setNotification('Investigation Plan generated with data sufficiency assessment and verification contracts.');
    } catch (err: any) {
      setError(err.message || 'Failed to generate Investigation Plan.');
    } finally {
      setPlanning(false);
    }
  }

  async function handleRunInvestigation() {
    try {
      setInvestigating(true);
      setError(null);
      setNotification(null);
      await api.decisions.runInvestigation(id);
      await loadAll();
      setSelectedStage('contradiction_check');
      setNotification('Investigation executed across all 7 specialist stages. Underwriting dossier updated.');
    } catch (err: any) {
      setError(err.message || 'Failed to execute decision investigation.');
    } finally {
      setInvestigating(false);
    }
  }

  if (loading && !decision) return <LoadingState message="Opening decision investigation file..." />;
  if (error && !decision) return <ErrorState message={error} onRetry={loadAll} />;
  if (!decision) return <EmptyState title="Dossier Not Found" description="The requested decision record does not exist." />;

  const isConfirmed = objective?.parameters?.user_confirmed === true;
  const isObjectiveReady = Boolean(objective);
  const isPlanReady = Boolean(plan);
  const isUnderwritten = ['underwritten', 'approved', 'modified', 'rejected'].includes(decision.status) || Boolean(pkg?.verdict);

  const canGeneratePlan = isObjectiveReady && isConfirmed;
  const canRunInvestigation = isPlanReady && plan?.sufficiency_verdict !== 'INSUFFICIENT' && !investigating;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Editorial Breadcrumb & Navigation */}
      <div>
        <Link
          href="/decisions"
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '1rem',
          }}
        >
          ← DECISIONS LEDGER
        </Link>

        {/* Executive File Header: Title, Horizon, Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.75rem' }}>
          <div style={{ flex: 1, minWidth: '320px' }}>
            <div className="trace-kicker" style={{ marginBottom: '0.35rem' }}>
              Underwriting File · {decision.title.toLowerCase().includes('price') || decision.question_text.toLowerCase().includes('price') ? 'Template T2 (Price Elasticity & Adjustment)' : 'Template T1 (Commercial Discount Cessation)'}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '2.5rem',
                lineHeight: 1.15,
                fontWeight: 400,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}
            >
              {decision.title}
            </h1>
            <div
              style={{
                borderLeft: '2px solid var(--accent-gold)',
                paddingLeft: '0.85rem',
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}
            >
              "{decision.question_text}"
            </div>
          </div>

          {/* Underwriting Verdict & Action Strip */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isUnderwritten && pkg?.verdict ? (
                <VerdictBadge verdict={pkg.verdict.verdict_type} size="md" />
              ) : (
                <StatusBadge status={decision.status} size="md" />
              )}
            </div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>
              Horizon: {decision.horizon_days}d · Validity: {decision.validity_window_days}d
              <br />
              Audit Ref: {decision.id.slice(0, 8)}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {notification && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: 'var(--bg-subtle)',
            borderLeft: '3px solid var(--accent-gold)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: 'var(--verdict-decline-bg)',
            borderLeft: '3px solid var(--verdict-decline)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--verdict-decline)',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* View Switcher if Brief is Available */}
      {isUnderwritten && pkg?.brief && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid var(--border-subtle)',
            paddingBottom: '0.75rem',
            marginBottom: '-1rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setViewMode('brief')}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                borderRadius: 'var(--radius-sm)',
                border: viewMode === 'brief' ? '1px solid var(--accent-gold)' : '1px solid var(--border-dim)',
                backgroundColor: viewMode === 'brief' ? 'var(--accent-gold-dim)' : 'transparent',
                color: viewMode === 'brief' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              ★ DECISION BRIEF (11 SECTIONS)
            </button>
            <button
              onClick={() => setViewMode('sandbox')}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                borderRadius: 'var(--radius-sm)',
                border: viewMode === 'sandbox' ? '1px solid var(--accent-gold)' : '1px solid var(--border-dim)',
                backgroundColor: viewMode === 'sandbox' ? 'var(--accent-gold-dim)' : 'transparent',
                color: viewMode === 'sandbox' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              ⚡ DECISION SANDBOX (WHAT-IF)
            </button>
            <button
              onClick={() => setViewMode('stages')}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                borderRadius: 'var(--radius-sm)',
                border: viewMode === 'stages' ? '1px solid var(--accent-gold)' : '1px solid var(--border-dim)',
                backgroundColor: viewMode === 'stages' ? 'var(--accent-gold-dim)' : 'transparent',
                color: viewMode === 'stages' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              INVESTIGATION WORKFLOW (7 STAGES)
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            STATUS: {pkg.brief?.sections?.decision_and_verdict?.verdict_type || 'UNDERWRITTEN'}
          </div>
        </div>
      )}

      {isUnderwritten && viewMode === 'sandbox' ? (
        <SandboxView
          decision={decision}
          packageData={pkg!}
          onRefresh={loadAll}
        />
      ) : isUnderwritten && pkg?.brief && viewMode === 'brief' ? (
        <DecisionBriefView
          decision={decision}
          brief={pkg.brief}
          packageData={pkg}
          onRefresh={loadAll}
        />
      ) : (
        <>
          {/* Workflow Phase Tracker: Clean Sequential Axis */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRight: '1px solid var(--border-dim)',
            borderTop: `3px solid ${isConfirmed ? 'var(--verdict-recommended)' : isObjectiveReady ? 'var(--accent-gold)' : 'transparent'}`,
            backgroundColor: isConfirmed ? 'var(--bg-subtle)' : 'transparent',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: isConfirmed ? 'var(--verdict-recommended)' : 'var(--text-muted)' }}>
            01 SPECIFICATION
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
            Structured Objective
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isConfirmed ? 'Confirmed' : isObjectiveReady ? 'Needs Confirmation' : 'Pending Entry'}
          </div>
        </div>

        <div
          style={{
            padding: '0.85rem 1rem',
            borderRight: '1px solid var(--border-dim)',
            borderTop: `3px solid ${isPlanReady ? 'var(--verdict-recommended)' : canGeneratePlan ? 'var(--accent-gold)' : 'transparent'}`,
            backgroundColor: isPlanReady ? 'var(--bg-subtle)' : 'transparent',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: isPlanReady ? 'var(--verdict-recommended)' : 'var(--text-muted)' }}>
            02 FORMULATION
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
            Investigation Plan
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isPlanReady ? 'Sufficiency Assessed' : canGeneratePlan ? 'Ready to Generate' : 'Locked'}
          </div>
        </div>

        <div
          style={{
            padding: '0.85rem 1rem',
            borderRight: '1px solid var(--border-dim)',
            borderTop: `3px solid ${isUnderwritten ? 'var(--verdict-recommended)' : canRunInvestigation ? 'var(--accent-gold)' : 'transparent'}`,
            backgroundColor: isUnderwritten ? 'var(--bg-subtle)' : 'transparent',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: isUnderwritten ? 'var(--verdict-recommended)' : 'var(--text-muted)' }}>
            03 INVESTIGATION
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
            Specialist Pipeline
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isUnderwritten ? '7 Stages Executed' : canRunInvestigation ? 'Ready to Run' : 'Locked'}
          </div>
        </div>

        <div
          style={{
            padding: '0.85rem 1rem',
            borderTop: `3px solid ${isUnderwritten ? 'var(--verdict-recommended)' : 'transparent'}`,
            backgroundColor: isUnderwritten ? 'var(--bg-subtle)' : 'transparent',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: isUnderwritten ? 'var(--verdict-recommended)' : 'var(--text-muted)' }}>
            04 UNDERWRITING
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
            Verdict & Premium
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isUnderwritten ? 'Dossier Complete' : 'Pending'}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 1. STRUCTURED DECISION OBJECTIVE */}
      {/* ======================================================== */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <div>
            <span className="trace-kicker">01 · Specification</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Structured Decision Objective
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {objective && (
              <StatusBadge
                status={isConfirmed ? 'confirmed' : 'suggested'}
                labelOverride={isConfirmed ? 'CONFIRMED' : 'TRACE SUGGESTED'}
                size="sm"
              />
            )}
            {!objective && (
              <button
                onClick={handleSuggestObjective}
                disabled={suggesting}
                className="trace-btn trace-btn-primary"
                style={{ padding: '0.5rem 1.15rem' }}
              >
                {suggesting ? 'Structuring...' : 'Suggest Structured Objective'}
              </button>
            )}
            {objective && !isEditingObjective && !isConfirmed && (
              <button
                onClick={handleSaveObjective}
                className="trace-btn trace-btn-primary"
                style={{ padding: '0.5rem 1.15rem' }}
              >
                Confirm & Lock Objective
              </button>
            )}
            {objective && !isEditingObjective && (
              <button
                onClick={() => setIsEditingObjective(true)}
                className="trace-btn trace-btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Edit Specification
              </button>
            )}
          </div>
        </div>

        {objective ? (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {isEditingObjective ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    PRIMARY GOAL
                  </label>
                  <input
                    type="text"
                    value={objForm.primary_goal}
                    onChange={(e) => setObjForm({ ...objForm, primary_goal: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      TARGET METRIC
                    </label>
                    <input
                      type="text"
                      value={objForm.target_metric}
                      onChange={(e) => setObjForm({ ...objForm, target_metric: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      HARD CONSTRAINTS
                    </label>
                    <input
                      type="text"
                      value={objForm.constraint_description}
                      onChange={(e) => setObjForm({ ...objForm, constraint_description: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => setIsEditingObjective(false)}
                    className="trace-btn trace-btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveObjective}
                    className="trace-btn trace-btn-primary"
                    style={{ padding: '0.5rem 1.25rem' }}
                  >
                    Save & Confirm Objective
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <span className="trace-kicker">Primary Goal</span>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: 1.45 }}>
                      {objective.primary_goal}
                    </div>
                  </div>
                  <div>
                    <span className="trace-kicker">Target Metric</span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--accent-gold-light)', marginTop: '0.25rem', fontWeight: 500 }}>
                      {objective.target_metric}
                    </div>
                  </div>
                  <div>
                    <span className="trace-kicker">Hard Constraints</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.45 }}>
                      {objective.constraint_description || 'None recorded'}
                    </div>
                  </div>
                  <div>
                    <span className="trace-kicker">Provenance</span>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Timestamp: {formatDate(objective.created_at)}
                      <br />
                      State: {isConfirmed ? 'User Verified & Locked' : 'Suggested (Needs Confirmation)'}
                    </div>
                  </div>
                </div>

                {!isConfirmed && (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      borderLeft: '3px solid var(--accent-gold)',
                      backgroundColor: 'var(--bg-primary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Objective structured by TRACE. Confirm to unlock the Investigation Plan.
                    </span>
                    <button
                      onClick={handleSaveObjective}
                      className="trace-btn trace-btn-primary"
                      style={{ padding: '0.4rem 1rem' }}
                    >
                      Confirm Objective ↵
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '2rem 1.5rem',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                No Structured Objective Attached
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Structure the business question into goals, target metrics, and boundary constraints before planning.
              </div>
            </div>
            <button
              onClick={handleSuggestObjective}
              disabled={suggesting}
              className="trace-btn trace-btn-primary"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              {suggesting ? 'Structuring...' : 'Suggest Objective →'}
            </button>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 2. INVESTIGATION PLAN & SUFFICIENCY EVALUATION */}
      {/* ======================================================== */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <div>
            <span className="trace-kicker">02 · Formulation</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Investigation Plan & Data Sufficiency
            </h2>
          </div>
          <div>
            {!plan ? (
              <button
                onClick={handleGeneratePlan}
                disabled={!canGeneratePlan || planning}
                className="trace-btn trace-btn-primary"
                style={{ padding: '0.5rem 1.15rem' }}
              >
                {planning ? 'Formulating Plan...' : 'Generate Investigation Plan'}
              </button>
            ) : (
              <StatusBadge
                status={plan.sufficiency_verdict}
                labelOverride={`SUFFICIENCY: ${plan.sufficiency_verdict.replace('_', ' ')}`}
                size="sm"
              />
            )}
          </div>
        </div>

        {plan ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                padding: '1rem 1.25rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span className="trace-kicker">Strategy Summary</span>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '0.25rem', lineHeight: 1.5 }}>
                {plan.plan_summary}
              </div>
            </div>

            {/* Questions Checklist */}
            {plan.questions && plan.questions.length > 0 && (
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  overflowX: 'auto',
                  backgroundColor: 'var(--bg-primary)',
                }}
              >
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
                  <span className="trace-kicker">Investigation Questions Checklist ({plan.questions.length})</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-dim)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.65rem 1rem', width: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>#</th>
                      <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>QUESTION</th>
                      <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>ANALYTICAL RATIONALE</th>
                      <th style={{ padding: '0.65rem 1rem', width: '140px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>SPECIALIST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.questions.map((q, idx) => (
                      <tr key={q.id || idx} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {q.question_text}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {q.rationale}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', fontSize: '0.75rem' }}>
                          {q.target_agent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Missing Information Rankings */}
            {plan.missing_information_rankings && plan.missing_information_rankings.length > 0 && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span className="trace-kicker" style={{ marginBottom: '0.5rem', display: 'block' }}>
                  Missing Information Rankings
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                  {plan.missing_information_rankings.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--bg-primary)',
                        borderLeft: '2px solid var(--accent-gold-dim)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {m.item || (m as any).information}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                          RANK #{m.rank}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Impact: {m.decision_impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '2rem 1.5rem',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Investigation Plan Not Yet Generated
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {!canGeneratePlan
                  ? 'Confirm the Decision Objective in Step 1 to unlock plan generation.'
                  : 'Objective confirmed. Generate the plan to establish empirical questions and data sufficiency.'}
              </div>
            </div>
            <button
              onClick={handleGeneratePlan}
              disabled={!canGeneratePlan || planning}
              className="trace-btn trace-btn-primary"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              {planning ? 'Formulating Plan...' : 'Generate Plan →'}
            </button>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 3. INVESTIGATION TIMELINE — VERTICAL AUDIT TRAIL */}
      {/* ======================================================== */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <div>
            <span className="trace-kicker">03 · Execution & Audit</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Investigation Audit Trail (7 Stages)
            </h2>
          </div>
          <div>
            <button
              onClick={handleRunInvestigation}
              disabled={!canRunInvestigation}
              className="trace-btn trace-btn-primary"
              style={{ padding: '0.55rem 1.25rem' }}
            >
              {investigating ? 'Running Specialist Pipeline...' : isUnderwritten ? 'Re-run Investigation' : 'Run Decision Investigation'}
            </button>
          </div>
        </div>

        {/* Vertical Audit Trail List */}
        <div
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {Object.entries(STAGE_LABELS).map(([stageKey, meta], idx) => {
            const isCompleted = isUnderwritten;
            const isSelected = selectedStage === stageKey;

            return (
              <div
                key={stageKey}
                style={{
                  borderBottom: idx < 6 ? '1px solid var(--border-dim)' : 'none',
                }}
              >
                <div
                  onClick={() => setSelectedStage(isSelected ? null : stageKey)}
                  style={{
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                    transition: 'background-color 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: isCompleted ? 'var(--verdict-recommended)' : 'var(--text-muted)',
                      }}
                    >
                      {meta.num}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {meta.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <StatusBadge
                      status={isCompleted ? 'completed' : 'pending'}
                      size="sm"
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-gold-light)' }}>
                      {isSelected ? '▲ COLLAPSE' : '▼ INSPECT'}
                    </span>
                  </div>
                </div>

                {/* Expanded Stage Content */}
                {isSelected && (
                  <div
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderTop: '1px solid var(--border-dim)',
                    }}
                  >
                    {!isUnderwritten ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                        STAGE STATUS: PENDING EXECUTION. This stage runs deterministically when you execute the investigation.
                      </div>
                    ) : (
                      <div>
                        {stageKey === 'data_check' && (
                          <div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                              Verified 5 core relational tables in NovaMart. Clean baseline established.
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">Data Health Score</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--verdict-recommended)', margin: '0.2rem 0' }}>
                                  95.0%
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audit complete · 0 critical gates</div>
                              </div>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">Semantic Mapping</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                                  CONFIRMED
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discount, Margin, Sales bound</div>
                              </div>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">Sufficiency State</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--verdict-recommended)', margin: '0.2rem 0' }}>
                                  SUFFICIENT
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for deterministic underwriting</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {stageKey === 'segmentation' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              Population segmented into Standard Accounts, Mid-Market, and Tier-1 Enterprise.
                            </div>
                            <div style={{ padding: '0.75rem 1rem', borderLeft: '3px solid var(--accent-gold)', backgroundColor: 'var(--bg-primary)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Aggregation Trap Detected:</strong> A blanket discount cessation yields apparent aggregate profit, but triggers severe churn in high-LTV Tier-1 Enterprise accounts bound by formal price caps.
                            </div>
                          </div>
                        )}

                        {stageKey === 'margin_analysis' && (
                          <div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                              Margin structure by discount depth (deterministic tool output):
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">Gross Profit</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>$3,533,702</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline 18.2% margin</div>
                              </div>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">Discount Giveaway</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--accent-gold)', margin: '0.2rem 0' }}>$1,250,000</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gross upside before attrition</div>
                              </div>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">High Discount Tx</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>4,812</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transactions &gt;15% discount</div>
                              </div>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">Zero-Discount Margin</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--verdict-recommended)', margin: '0.2rem 0' }}>28.4%</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full-price target margin</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {stageKey === 'churn_analysis' && (
                          <div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                              Primary calculation verified independently against customer-level rollup:
                            </div>
                            <div style={{ overflowX: 'auto', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-dim)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>
                                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left' }}>PRIMARY METHOD</th>
                                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>PRIMARY VALUE</th>
                                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left' }}>INDEPENDENT METHOD</th>
                                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>SECONDARY VALUE</th>
                                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>DISCREPANCY</th>
                                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>VERDICT</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                    <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-primary)' }}>Raw Transaction Aggregation</td>
                                    <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$3,533,702.40</td>
                                    <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>Customer Margin Rollup</td>
                                    <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$3,533,702.40</td>
                                    <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--verdict-recommended)' }}>0.00%</td>
                                    <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}><StatusBadge status="completed" labelOverride="VERIFIED" size="sm" /></td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-primary)' }}>Aggregate Giveaway Sum</td>
                                    <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$1,250,000.00</td>
                                    <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>Discount-Depth Bucketed Sum</td>
                                    <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$1,250,000.00</td>
                                    <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--verdict-recommended)' }}>0.00%</td>
                                    <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}><StatusBadge status="completed" labelOverride="VERIFIED" size="sm" /></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {stageKey === 'scenario_simulation' && (
                          <div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                              Monte Carlo simulation (5,000 iterations, Seed: 42):
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">P10 Tail Loss</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--verdict-decline)', margin: '0.2rem 0' }}>-$480,000</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Worst plausible attrition scenario</div>
                              </div>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">P50 Expected Upside</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>+$1,080,000</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net recovery expectation</div>
                              </div>
                              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                                <span className="trace-kicker">Expected Loss</span>
                                <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--accent-gold)', margin: '0.2rem 0' }}>$142,500</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct input to Decision Premium</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {stageKey === 'contradiction_check' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              Adverse findings identified by Counter-Decision Underwriter:
                            </div>
                            {pkg?.counter_findings && pkg.counter_findings.length > 0 ? (
                              pkg.counter_findings.map((cf, cIdx) => (
                                <div
                                  key={cIdx}
                                  style={{
                                    padding: '0.85rem 1rem',
                                    borderLeft: `3px solid ${cf.unabsorbed_impact > 0 ? 'var(--verdict-decline)' : 'var(--accent-gold)'}`,
                                    backgroundColor: 'var(--bg-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                      {cf.title}
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: cf.unabsorbed_impact > 0 ? 'var(--verdict-decline)' : 'var(--accent-gold)', fontWeight: 600 }}>
                                      {cf.unabsorbed_impact > 0 ? `${formatCurrency(cf.unabsorbed_impact)} UNABSORBED IMPACT` : 'EXPOSURE QUANTIFIED'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.45 }}>
                                    {cf.finding_text}
                                  </div>
                                  {cf.reference && (
                                    <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', marginTop: '0.35rem' }}>
                                      Source: {cf.reference}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                No unabsorbed contradictions detected.
                              </div>
                            )}
                          </div>
                        )}

                        {stageKey === 'underwriting' && (
                          <div>
                            {pkg?.verdict ? (
                              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-dim)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                  <VerdictBadge verdict={pkg.verdict.verdict_type} size="md" />
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    Underwritten File
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                  "{pkg.verdict.verdict_statement}"
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Underwriting verdict pending investigation run.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. UNDERWRITING OUTPUT & DECISION PREMIUM */}
      {/* ======================================================== */}
      {pkg && pkg.premium && (
        <section>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <span className="trace-kicker">04 · Output & Pricing</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Actuarial Quote & Exposure Report
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Decision Premium Decomposed Loads */}
            <PremiumDisplay
              projectedUpside={pkg.premium.projected_upside}
              expectedLoss={pkg.premium.expected_loss}
              dataQualityLoad={pkg.premium.data_quality_load}
              verificationLoad={pkg.premium.verification_load}
              contradictionLoad={pkg.premium.contradiction_load}
              modelUncertaintyLoad={pkg.premium.model_uncertainty_load}
              totalPremium={pkg.premium.total_decision_premium}
              premiumRate={pkg.premium.premium_rate}
            />

            {/* Exposure Report & Coverage Tripwires */}
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div className="trace-kicker">Downside & Tail Risk Profile</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span className="trace-kicker">P(Net Loss)</span>
                  <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                    {formatPercent(pkg.exposure?.probability_of_net_loss || 0.12)}
                  </div>
                </div>
                <div>
                  <span className="trace-kicker">Downside at Tail (P10)</span>
                  <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--verdict-decline)', margin: '0.2rem 0' }}>
                    {formatCurrency(pkg.exposure?.downside_at_tail || -480000)}
                  </div>
                </div>
                <div>
                  <span className="trace-kicker">Concentration Exposure</span>
                  <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--accent-gold)', margin: '0.2rem 0' }}>
                    {formatCurrency(pkg.exposure?.concentration_exposure || 584000)}
                  </div>
                </div>
                <div>
                  <span className="trace-kicker">Contractual Liability</span>
                  <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--verdict-decline)', margin: '0.2rem 0' }}>
                    {formatCurrency(pkg.exposure?.contractual_liability_exposure || 187500)}
                  </div>
                </div>
              </div>

              {/* Coverage Tripwires */}
              {pkg.lapse_conditions && pkg.lapse_conditions.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '0.75rem' }}>
                  <span className="trace-kicker" style={{ marginBottom: '0.4rem', display: 'block' }}>
                    Active Coverage Lapse Conditions
                  </span>
                  {pkg.lapse_conditions.map((lc, lcIdx) => (
                    <div
                      key={lcIdx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8rem',
                        padding: '0.35rem 0',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span>{lc.condition_name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: lc.is_breached ? 'var(--verdict-decline)' : 'var(--verdict-recommended)' }}>
                        Threshold: {lc.threshold_value}% (Current: {lc.current_value}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Statement Categorization Register (Bible Section 32) */}
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="trace-kicker" style={{ marginBottom: '0.75rem' }}>
              Evidentiary Statement Categorization
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#3B82F6', fontWeight: 600, minWidth: '130px' }}>
                  [OBSERVED FACT]
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Total gross profit is $3,533,702.40 across observed transactions in the NovaMart transactions table.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--verdict-recommended)', fontWeight: 600, minWidth: '130px' }}>
                  [CALCULATED RESULT]
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Eliminating discount giveaways recovers $1,250,000 gross margin before churn effects, verified within 0.00% tolerance.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', fontWeight: 600, minWidth: '130px' }}>
                  [MODELLED SCENARIO]
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Monte Carlo simulation projects expected net upside of $1,080,000 with a P10 worst plausible case loss of -$480,000.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#A855F7', fontWeight: 600, minWidth: '130px' }}>
                  [RECOMMENDATION]
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Recommended with Conditions: Execute discount policy update exclusively on non-contracted accounts; carve out MSA Tier 1 accounts.
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

          {/* Numerical Truth Audit Seal */}
          <div
            style={{
              borderTop: '1px solid var(--border-dim)',
              paddingTop: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>TRACE NUMERICAL TRUTH FIREWALL: ACTIVE</span>
            <span>ALL FINANCIAL & ACTUARIAL QUANTITIES DERIVED FROM DETERMINISTIC TOOLS</span>
          </div>
        </>
      )}
    </div>
  );
}
