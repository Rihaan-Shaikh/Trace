import { type View, type SandboxAssumptions, type DecisionCalc } from '@/lib/bolt/types';
import {
  computeDecision,
  formatCurrency,
  DEFAULT_ASSUMPTIONS,
  BASELINE_CALC,
  getCoverageConditions,
} from '@/lib/bolt/data';
import { ArrowLeft, RotateCcw, ArrowRight, Database } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { VerdictBadge, Divider } from './ui/Section';
import { ThresholdTrack } from './ThresholdTrack';
import { api } from '@/lib/api-client';

interface SandboxScreenProps {
  onNavigate: (view: View) => void;
  assumptions: SandboxAssumptions;
  setAssumptions: (a: SandboxAssumptions) => void;
  decisionId?: string;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <div className="py-4">
      <div className="flex items-baseline justify-between mb-3">
        <label className="text-sm text-ink-600">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-16 text-right text-sm tabular-nums text-ink-800 bg-parchment-100 border rule rounded-sm px-2 py-1 focus:outline-none focus:border-vermilion-300"
          />
          <span className="text-xs text-ink-400 w-6">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-ink-100 rounded-full appearance-none cursor-pointer accent-vermilion-500"
      />
    </div>
  );
}

function ComparisonRow({ label, before, after, isCurrency }: { label: string; before: string; after: string; isCurrency?: boolean }) {
  const changed = before !== after;
  return (
    <div className="flex items-baseline justify-between py-3 border-b rule last:border-b-0">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="flex items-baseline gap-3">
        <span className={`text-sm tabular-nums ${changed ? 'text-ink-400' : 'text-ink-700'}`}>
          {before}
        </span>
        {changed && (
          <>
            <ArrowRight className="w-3 h-3 text-ink-300" />
            <span className={`text-sm tabular-nums font-medium ${isCurrency ? 'text-vermilion-600' : 'text-vermilion-600'}`}>
              {after}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function SandboxScreen({ onNavigate, assumptions, setAssumptions, decisionId }: SandboxScreenProps) {
  const fallbackCalc = computeDecision(assumptions);
  const [liveReQuote, setLiveReQuote] = useState<any>(null);
  const [isLiveReQuoting, setIsLiveReQuoting] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const isBaseline = JSON.stringify(assumptions) === JSON.stringify(DEFAULT_ASSUMPTIONS);

  // Trigger live Python actuarial re-quote when assumptions change
  useEffect(() => {
    if (!decisionId) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setIsLiveReQuoting(true);
      try {
        const res = await api.sandbox.requote({
          decision_id: decisionId,
          assumption_adjustments: {
            segment_churn: assumptions.segmentChurn / 100,
            volume_retention: assumptions.retention / 100,
          },
        });
        if (res && res.after) {
          setLiveReQuote(res);
        }
      } catch (e) {
        console.warn('Backend re-quote deferred (using local fallback model):', e);
      } finally {
        setIsLiveReQuoting(false);
      }
    }, 200);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [assumptions, decisionId]);

  // Merge live actuarial output if available
  const calc: DecisionCalc = (liveReQuote && liveReQuote.after)
    ? {
        premium: Math.round(liveReQuote.after.decision_premium),
        premiumRate: Number((liveReQuote.after.premium_rate * 100).toFixed(1)),
        projectedUpside: Math.round(liveReQuote.after.projected_upside),
        netLossProbability: Math.round((liveReQuote.after.probability_of_net_loss || 0) * 100),
        verdict: (liveReQuote.after.verdict || 'Recommended with conditions') as any,
        coverageState: (liveReQuote.coverage_state?.toLowerCase() === 'lapsed' ? 'lapsed' : 'covered') as any,
        exposure: {
          p10: -Math.round(Math.abs(liveReQuote.after.tail_loss || 7935814)),
          avgWorst10: fallbackCalc.exposure.avgWorst10,
          worstPlausible: fallbackCalc.exposure.worstPlausible,
          concentration: fallbackCalc.exposure.concentration,
          dataExposure: fallbackCalc.exposure.dataExposure,
        },
      }
    : fallbackCalc;

  const baselineDisplay = liveReQuote?.before
    ? {
        premium: Math.round(liveReQuote.before.decision_premium),
        premiumRate: Number((liveReQuote.before.premium_rate * 100).toFixed(1)),
        netLossProbability: Math.round((liveReQuote.before.probability_of_net_loss || 0) * 100),
        verdict: liveReQuote.before.verdict,
      }
    : BASELINE_CALC;

  const conditions = getCoverageConditions(assumptions, calc);
  const hasLapsed = calc.coverageState === 'lapsed';

  const update = useCallback((key: keyof SandboxAssumptions, value: number) => {
    setAssumptions({ ...assumptions, [key]: value });
  }, [assumptions, setAssumptions]);

  const reset = () => {
    setAssumptions(DEFAULT_ASSUMPTIONS);
    setLiveReQuote(null);
  };

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => onNavigate('decision-brief')}
            className="text-xs text-ink-400 hover:text-ink-600 transition-colors inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to decision brief
          </button>
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-xs text-ink-400 font-medium">NovaMart - sandbox</div>
            {liveReQuote && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brass-700 bg-brass-50 border border-brass-200 px-2.5 py-1 rounded-sm font-medium">
                <Database className="w-3.5 h-3.5" />
                Live Monte Carlo Engine Connected
              </span>
            )}
          </div>
          <h1 className="font-serif text-hero text-ink-800 ">
            Challenge the decision.
          </h1>
          <p className="mt-3 text-ink-500 text-lg max-w-prose-doc leading-relaxed">
            Change an assumption and re-quote the decision with real actuarial recalculation.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
          {/* ── Assumptions panel ───────────────────────────────────── */}
          <div>
            <div className="text-xs text-ink-400 font-medium mb-4">Assumptions</div>
            <div className="divide-y rule border-t border-b rule bg-parchment-50 px-5 rounded-sm">
              <Slider
                label="Segment churn"
                value={assumptions.segmentChurn}
                min={0}
                max={12}
                step={0.1}
                unit="%"
                onChange={(v) => update('segmentChurn', v)}
              />
              <Slider
                label="Price change"
                value={assumptions.priceChange}
                min={-10}
                max={20}
                step={1}
                unit="%"
                onChange={(v) => update('priceChange', v)}
              />
              <Slider
                label="Retention"
                value={assumptions.retention}
                min={70}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => update('retention', v)}
              />
              <Slider
                label="Top accounts lost"
                value={assumptions.topAccountsLost}
                min={0}
                max={3}
                step={1}
                unit=""
                onChange={(v) => update('topAccountsLost', v)}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={reset}
                className="text-xs text-ink-400 hover:text-vermilion-600 transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to baseline
              </button>
            </div>

            {/* Hint */}
            <div className="mt-6 px-4 py-3 bg-parchment-50 border rule rounded-sm">
              <div className="text-xs text-ink-400 leading-relaxed">
                Drag segment churn above <span className="text-vermilion-600 font-medium">6.2%</span> to
                see the coverage lapse moment solve via Brent&apos;s root finding.
              </div>
            </div>
          </div>

          {/* ── Re-quote result ────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-ink-400 font-medium">Re-quote results</div>
              {isLiveReQuoting && (
                <span className="text-xs text-brass-600 animate-pulse font-mono">
                  Calculating 1000 scenarios…
                </span>
              )}
            </div>

            {/* Before / After premium */}
            <div className="border-t border-b rule py-8 mb-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs text-ink-400 mb-2">Before</div>
                  <div className="text-xs text-ink-400 mb-1">Decision Premium</div>
                  <div className="editorial-num text-3xl text-ink-400 tabular-nums">
                    {formatCurrency(baselineDisplay.premium)}
                  </div>
                  <div className="text-xs text-ink-300 mt-1 tabular-nums">
                    {baselineDisplay.premiumRate.toFixed(1)}% of upside
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-400 mb-2">After</div>
                  <div className="text-xs text-ink-400 mb-1">Decision Premium</div>
                  <div className={`editorial-num text-3xl tabular-nums transition-colors ${
                    hasLapsed ? 'text-vermilion-600' : 'text-ink-800'
                  }`}>
                    {formatCurrency(calc.premium)}
                  </div>
                  <div className={`text-xs mt-1 tabular-nums ${
                    hasLapsed ? 'text-vermilion-500' : 'text-brass-600'
                  }`}>
                    {calc.premiumRate.toFixed(1)}% of upside
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison rows */}
            <div className="border-t rule">
              <ComparisonRow
                label="Premium rate"
                before={`${baselineDisplay.premiumRate.toFixed(1)}%`}
                after={`${calc.premiumRate.toFixed(1)}%`}
              />
              <ComparisonRow
                label="Net-loss probability"
                before={`${baselineDisplay.netLossProbability}%`}
                after={`${calc.netLossProbability}%`}
              />
              <ComparisonRow
                label="Coverage"
                before="covered"
                after={hasLapsed ? 'lapse breached' : 'covered'}
              />
              <ComparisonRow
                label="Verdict"
                before={baselineDisplay.verdict}
                after={calc.verdict}
              />
            </div>

            {/* Verdict change */}
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-400">Verdict:</span>
                <VerdictBadge verdict={calc.verdict} />
              </div>
            </div>

            {/* Lapse moment */}
            {hasLapsed && (
              <div className="mt-6 px-5 py-4 bg-vermilion-50 border border-vermilion-200 rounded-sm animate-fade-in">
                <div className="text-sm font-medium text-vermilion-700 mb-1">
                  Coverage has lapsed.
                </div>
                <div className="text-sm text-vermilion-600 leading-relaxed">
                  Segment churn exceeded the 6.2% threshold. The recommendation should be
                  referred for human judgement. The Decision Premium has been re-quoted to
                  reflect the increased exposure.
                </div>
              </div>
            )}

            {/* Coverage conditions in sandbox */}
            <div className="mt-8">
              <div className="text-xs text-ink-400 font-medium mb-2">Coverage conditions</div>
              <div className="divide-y rule border-t border-b rule">
                {conditions.slice(0, 2).map((condition) => (
                  <ThresholdTrack key={condition.id} condition={condition} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <Divider className="mt-12" />
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => onNavigate('decision-brief')}
            className="text-sm text-ink-500 hover:text-vermilion-600 transition-colors"
          >
            Return to decision brief
          </button>
          <button
            onClick={() => onNavigate('approval')}
            className="group inline-flex items-center gap-2 bg-ink-900 text-parchment-50 px-6 py-3 rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Proceed to approval
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
