import { type View, type SandboxAssumptions, type DecisionCalc, type CoverageCondition } from '@/lib/bolt/types';
import {
  computeDecision,
  getCoverageConditions,
  formatCurrency,
  BASELINE_CALC,
  EXPOSURE_METRICS,
  COUNTER_FINDINGS,
  SCRUTINY_STEPS,
  EVIDENCE_CHAIN_PREMIUM,
  EVIDENCE_CHAIN_EXPOSURE,
  EVIDENCE_CHAIN_COUNTER,
  DEFAULT_ASSUMPTIONS,
} from '@/lib/bolt/data';
import { ArrowRight, ChevronRight, Scale, FileText, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { EvidenceDrawer, EvidenceLink } from './EvidenceDrawer';
import { ThresholdTrack } from './ThresholdTrack';
import { ScenarioDistribution } from './ScenarioDistribution';
import { VerdictBadge, Divider, Section } from './ui/Section';
import { api } from '@/lib/api-client';

interface DecisionBriefProps {
  onNavigate: (view: View) => void;
  assumptions: SandboxAssumptions;
  setAssumptions: (a: SandboxAssumptions) => void;
  decisionId?: string;
}

export function DecisionBrief({ onNavigate, assumptions, setAssumptions, decisionId }: DecisionBriefProps) {
  const [drawerState, setDrawerState] = useState<{ open: boolean; title: string; root: typeof EVIDENCE_CHAIN_PREMIUM }>({
    open: false,
    title: '',
    root: EVIDENCE_CHAIN_PREMIUM,
  });

  const [liveBrief, setLiveBrief] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real underwritten brief from FastAPI backend if decisionId is provided
  useEffect(() => {
    let isMounted = true;
    async function loadBrief() {
      if (!decisionId) return;
      setIsLoading(true);
      try {
        const briefData = await api.approvals.getBrief(decisionId);
        if (isMounted && briefData && briefData.sections_json) {
          setLiveBrief(briefData);
        }
      } catch (err) {
        console.warn('Live brief fetch deferred (falling back to deterministic baseline):', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadBrief();
    return () => {
      isMounted = false;
    };
  }, [decisionId]);

  const fallbackCalc = computeDecision(assumptions);
  const isBaseline = JSON.stringify(assumptions) === JSON.stringify(DEFAULT_ASSUMPTIONS);

  // Parse live metrics from backend sections_json if available
  const secPrem = liveBrief?.sections_json?.decision_premium;
  const secExp = liveBrief?.sections_json?.exposure_report;
  const secVerd = liveBrief?.sections_json?.decision_and_verdict;
  const secLapse = liveBrief?.sections_json?.coverage_lapse?.conditions;
  const secScrutiny = liveBrief?.sections_json?.what_survived_scrutiny;
  const secHealth = liveBrief?.sections_json?.data_health;
  const secVerification = liveBrief?.sections_json?.verification;

  // Active calculated metrics
  const calc: DecisionCalc = (liveBrief && isBaseline && secPrem)
    ? {
        premium: Math.round(secPrem.total_decision_premium),
        premiumRate: Number((secPrem.premium_rate * 100).toFixed(1)),
        projectedUpside: Math.round(secPrem.projected_upside),
        netLossProbability: Math.round((secExp?.probability_of_net_loss ?? 0.012) * 100),
        verdict: (secVerd?.verdict || 'Recommended with conditions') as any,
        coverageState: (secVerd?.coverage_state?.toLowerCase() === 'lapsed' ? 'lapsed' : 'covered') as any,
        exposure: {
          p10: -Math.round(secExp?.tail_exposure ?? 7935814),
          avgWorst10: -Math.round(secExp?.tail_average_loss ?? 3806105),
          worstPlausible: -Math.round(Math.abs(secExp?.worst_plausible_case ?? 12852875)),
          concentration: 'Top 10% accounts = 61%',
          dataExposure: -Math.round(secPrem.loads?.data_quality_load ?? 89943),
        },
      }
    : fallbackCalc;

  // Active conditions
  const conditions: CoverageCondition[] = (secLapse && Array.isArray(secLapse) && secLapse.length > 0 && isBaseline)
    ? secLapse.map((c: any) => ({
        id: c.condition_id || c.title,
        label: c.title,
        currentValue: `${c.current_modelled_value}${c.unit}`,
        currentNumeric: c.current_modelled_value,
        lapseValue: `${c.lapse_threshold_value}${c.unit}`,
        lapseNumeric: c.lapse_threshold_value,
        unit: c.unit,
        direction: 'above' as const,
        state: c.is_breached ? 'lapsed' : (c.distance_to_lapse_percent < 20 ? 'near-lapse' : 'covered'),
        distance: `${c.distance_to_lapse_percent?.toFixed(1) || 0}% margin`,
        description: c.description,
      }))
    : getCoverageConditions(assumptions, calc);

  // Active counter findings
  const counterFindings = (secScrutiny?.adverse_findings && Array.isArray(secScrutiny.adverse_findings) && secScrutiny.adverse_findings.length > 0)
    ? secScrutiny.adverse_findings.map((f: any, idx: number) => ({
        id: `af-${idx}`,
        statement: f.finding_text || f.title,
        magnitude: f.quantified_impact ? `≈${formatCurrency(f.quantified_impact)} impact` : undefined,
      }))
    : COUNTER_FINDINGS;

  // Active scrutiny steps
  const scrutinySteps = secScrutiny
    ? [
        {
          stage: 'Initial recommendation',
          content: secScrutiny.initial_recommendation || 'Terminate all commercial discounts exceeding 15.0% across the wholesale customer base.',
        },
        {
          stage: 'Adversarial audit findings',
          content: secScrutiny.counter_evidence_summary || 'Retrieved Enterprise MSAs contractually guarantee commercial discounts; unilateral clawback triggers contractual liquidated damages.',
        },
        {
          stage: 'Policy surviving scrutiny',
          content: secScrutiny.final_recommendation || 'Rescale and terminate discretionary discounts exclusively for non-contracted SMB and Mid-Market accounts. Preserve active enterprise contracts.',
        },
      ]
    : SCRUTINY_STEPS;

  // Active exposure summary cards
  const exposureMetrics = [
    { label: 'Probability of net loss', value: `≈ ${calc.netLossProbability}%` },
    { label: 'P10 tail loss', value: formatCurrency(calc.exposure.p10) },
    { label: 'Average worst 10% (CVaR)', value: formatCurrency(calc.exposure.avgWorst10) },
    { label: 'Worst plausible case', value: formatCurrency(calc.exposure.worstPlausible) },
    { label: 'Revenue concentration', value: calc.exposure.concentration },
  ];

  const hasLapsed = calc.coverageState === 'lapsed';

  const openDrawer = (title: string, root: typeof EVIDENCE_CHAIN_PREMIUM) => {
    setDrawerState({ open: true, title, root });
  };

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* ── Decision header ─────────────────────────────────────────── */}
        <div className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="text-xs text-ink-400 font-medium">
              NovaMart · pricing decision
            </div>
            {liveBrief && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brass-700 bg-brass-50 border border-brass-200 px-2.5 py-1 rounded-sm font-medium">
                <Database className="w-3.5 h-3.5" />
                Live Underwriting Metrics Connected
              </span>
            )}
          </div>
          <h1 className="font-serif text-6xl md:text-8xl tracking-tight leading-[0.9] text-ink-800 text-balance leading-[1.05] w-full pr-12">
            {liveBrief?.brief_title || 'Stop blanket discounts for low-margin customers.'}
          </h1>

          <div className="mt-6 flex items-center gap-4">
            <VerdictBadge verdict={calc.verdict} size="lg" />
            {!isBaseline && (
              <button
                onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}
                className="text-xs text-ink-400 hover:text-vermilion-600 transition-colors"
              >
                Reset to baseline
              </button>
            )}
          </div>
        </div>

        {/* ── Decision Premium ───────────────────────────────────────── */}
        <div className="border-t border-b rule py-12">
          <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-end">
            <div>
              <div className="text-xs text-ink-400 font-medium mb-3">Decision Premium</div>
              <div className="flex items-baseline gap-4">
                <div className={`editorial-num text-display ${
                  hasLapsed ? 'text-vermilion-600' : 'text-ink-800'
                }`}>
                  {formatCurrency(calc.premium)}
                </div>
                <EvidenceLink onClick={() => openDrawer('Decision Premium', EVIDENCE_CHAIN_PREMIUM)}>
                  Evidence
                </EvidenceLink>
              </div>
              <div className="mt-3 text-lg text-ink-500">
                <span className="tabular-nums font-medium text-brass-600">{calc.premiumRate.toFixed(1)}%</span>
                {' '}of projected upside
              </div>
              <div className="mt-2 text-sm text-ink-400">
                {formatCurrency(calc.premium)} risk cost against {formatCurrency(calc.projectedUpside)} projected upside.
              </div>
            </div>

            <div className="lg:text-right">
              <div className="text-xs text-ink-400 mb-1">Projected upside</div>
              <div className="editorial-num text-2xl text-ink-700 tabular-nums">
                {formatCurrency(calc.projectedUpside)}
              </div>
              <div className="text-xs text-ink-400 mt-1">
                over 90-day validity horizon
              </div>
            </div>
          </div>
        </div>

        {/* ── Coverage Lapse Conditions ──────────────────────────────── */}
        <Section
          eyebrow="The signature"
          title="Coverage lapse conditions"
          subtitle="When should you stop trusting this recommendation?"
          className={hasLapsed ? 'animate-fade-in' : ''}
        >
          {hasLapsed && (
            <div className="mb-6 px-5 py-4 bg-vermilion-50 border border-vermilion-200 rounded-sm">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-vermilion-600" />
                <span className="text-sm font-medium text-vermilion-700">Coverage has lapsed.</span>
              </div>
              <div className="text-sm text-vermilion-600 leading-relaxed">
                {conditions.find((c) => c.state === 'lapsed')?.label || 'Segment churn'} exceeded
                its threshold. The recommendation should be referred for human judgement.
              </div>
            </div>
          )}

          <div className="divide-y rule border-t border-b rule">
            {conditions.map((condition) => (
              <ThresholdTrack key={condition.id} condition={condition} />
            ))}
          </div>
        </Section>

        {/* ── Exposure Report ────────────────────────────────────────── */}
        <Section
          eyebrow="Downside"
          title="Exposure report"
          subtitle="The price of being wrong, modelled across 1,000 Monte Carlo scenarios."
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-b rule divide-y sm:divide-y-0 sm:divide-x rule">
            {exposureMetrics.map((metric, idx) => (
              <div
                key={metric.label}
                className={`px-5 py-5 ${
                  idx >= 3 ? 'sm:border-t rule' : ''
                } ${idx >= 4 ? 'lg:border-l-0' : ''}`}
              >
                <div className="text-xs text-ink-400 mb-2">{metric.label}</div>
                <div className="editorial-num text-2xl text-ink-800 tabular-nums">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2">
            <EvidenceLink onClick={() => openDrawer('Exposure report', EVIDENCE_CHAIN_EXPOSURE)}>
              Evidence behind these numbers
            </EvidenceLink>
          </div>

          <div className="mt-8">
            <ScenarioDistribution calc={calc} />
          </div>
        </Section>

        {/* ── Counter-Decision Underwriter ───────────────────────────── */}
        <Section
          eyebrow="The opposition file"
          title="Counter-decision underwriter"
          subtitle="What argues against this decision?"
        >
          <div className="border-l-2 border-vermilion-300 pl-6 space-y-6">
            {counterFindings.map((finding) => (
              <div key={finding.id} className="animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-vermilion-400 mt-2.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-base text-ink-700 leading-relaxed">
                      {finding.statement}
                    </div>
                    {finding.magnitude && (
                      <div className="mt-1.5 text-sm text-vermilion-600 font-medium tabular-nums">
                        {finding.magnitude}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <EvidenceLink onClick={() => openDrawer('Counter-decision', EVIDENCE_CHAIN_COUNTER)}>
              Evidence behind the counter-decision
            </EvidenceLink>
          </div>
        </Section>

        {/* ── What survived scrutiny ─────────────────────────────────── */}
        <Section
          eyebrow="Red-team review"
          title="What survived scrutiny"
          subtitle="How the recommendation changed after TRACE argued against itself."
        >
          <div className="w-full pr-12">
            {scrutinySteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-5">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                    idx === 0
                      ? 'bg-ink-100 text-ink-500'
                      : idx === 1
                        ? 'bg-vermilion-100 text-vermilion-600'
                        : 'bg-brass-100 text-brass-600'
                  }`}>
                    {idx + 1}
                  </div>
                  {idx < scrutinySteps.length - 1 && (
                    <div className="w-px h-10 bg-ink-100 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className="text-xs text-ink-400 mb-1">{step.stage}</div>
                  <div className="text-base text-ink-700 leading-relaxed">
                    {step.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Cost of inaction ───────────────────────────────────────── */}
        <Section
          eyebrow="The alternative"
          title="Cost of inaction"
        >
          <div className="grid sm:grid-cols-3 gap-0 border-t border-b rule divide-y sm:divide-y-0 sm:divide-x rule">
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-2">Margin erosion</div>
              <div className="editorial-num text-2xl text-ink-700 tabular-nums">−$340K</div>
              <div className="text-xs text-ink-400 mt-1">over 4 quarters if discounts continue</div>
            </div>
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-2">Competitor exposure</div>
              <div className="editorial-num text-2xl text-ink-700 tabular-nums">Unknown</div>
              <div className="text-xs text-ink-400 mt-1">not observable from current data</div>
            </div>
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-2">Churn acceleration</div>
              <div className="editorial-num text-2xl text-ink-700 tabular-nums">+1.2pp</div>
              <div className="text-xs text-ink-400 mt-1">estimated if discount dependency continues</div>
            </div>
          </div>
        </Section>

        {/* ── Data health summary ────────────────────────────────────── */}
        <Section
          eyebrow="Verification"
          title="Data health and verification"
          subtitle="Real data-quality findings were priced into this premium."
        >
          <div className="grid sm:grid-cols-4 gap-0 border-t border-b rule divide-y sm:divide-y-0 sm:divide-x rule">
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-2">Health Score</div>
              <div className="editorial-num text-xl text-ink-700">
                {secHealth ? `${Math.round(secHealth.overall_health_score * 100)}%` : '94%'}
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-2">Data exposure load</div>
              <div className="editorial-num text-xl text-vermilion-600">
                {secHealth?.data_quality_load_charged ? `+${formatCurrency(secHealth.data_quality_load_charged)}` : '+89.9K'}
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-2">Verification</div>
              <div className="text-sm font-medium text-brass-600">
                {secVerification?.verified_count ? `${secVerification.verified_count} figures verified` : 'Verified (5/5)'}
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-2">Source records</div>
              <div className="text-sm font-medium text-ink-600">125,519 rows reconciled</div>
            </div>
          </div>
        </Section>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <Divider className="mt-12" />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-ink-400">
            Decision brief · version 1.0 · NovaMart benchmark database
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('sandbox')}
              className="text-sm text-ink-600 hover:text-vermilion-600 transition-colors font-medium inline-flex items-center gap-1.5"
            >
              <Scale className="w-4 h-4" />
              Challenge the decision
            </button>
            <button
              onClick={() => onNavigate('approval')}
              className="group inline-flex items-center gap-2 bg-ink-800 text-parchment-50 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
            >
              <FileText className="w-4 h-4" />
              Your decision
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <EvidenceDrawer
        open={drawerState.open}
        onClose={() => setDrawerState((s) => ({ ...s, open: false }))}
        title={drawerState.title}
        root={drawerState.root}
      />
    </div>
  );
}
