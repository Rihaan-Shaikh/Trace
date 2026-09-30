import { type View, type SandboxAssumptions, type DecisionCalc } from '@/lib/bolt/types';
import {
  computeDecision,
  formatCurrency,
  DEFAULT_ASSUMPTIONS,
  BASELINE_CALC,
  getCoverageConditions,
} from '@/lib/bolt/data';
import { ArrowLeft, RotateCcw, ArrowRight } from 'lucide-react';
import { useState, useCallback } from 'react';
import { VerdictBadge, Divider } from './ui/Section';
import { ThresholdTrack } from './ThresholdTrack';

interface SandboxScreenProps {
  onNavigate: (view: View) => void;
  assumptions: SandboxAssumptions;
  setAssumptions: (a: SandboxAssumptions) => void;
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
        <label className="text-sm text-ink-200">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-16 text-right text-sm tabular-nums text-ink-50 bg-base-900 border rule rounded-sm px-2 py-1 focus:outline-none focus:border-vermilion-300"
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
        className="w-full h-1 bg-base-700 rounded-full appearance-none cursor-pointer accent-vermilion-500"
      />
    </div>
  );
}

function ComparisonRow({ label, before, after, isCurrency }: { label: string; before: string; after: string; isCurrency?: boolean }) {
  const changed = before !== after;
  return (
    <div className="flex items-baseline justify-between py-3 border-b rule last:border-b-0">
      <div className="text-sm text-ink-300">{label}</div>
      <div className="flex items-baseline gap-3">
        <span className={`text-sm tabular-nums ${changed ? 'text-ink-400' : 'text-ink-100'}`}>
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

export function SandboxScreen({ onNavigate, assumptions, setAssumptions }: SandboxScreenProps) {
  const calc = computeDecision(assumptions);
  const conditions = getCoverageConditions(assumptions, calc);
  const isBaseline = JSON.stringify(assumptions) === JSON.stringify(DEFAULT_ASSUMPTIONS);
  const hasLapsed = calc.coverageState === 'lapsed';

  const update = useCallback((key: keyof SandboxAssumptions, value: number) => {
    setAssumptions({ ...assumptions, [key]: value });
  }, [assumptions, setAssumptions]);

  const reset = () => setAssumptions(DEFAULT_ASSUMPTIONS);

  return (
    <div className="min-h-screen bg-base-900">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => onNavigate('decision-brief')}
            className="text-xs text-ink-400 hover:text-ink-200 transition-colors inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to decision brief
          </button>
          <div className="text-xs text-ink-400 font-medium mb-2">NovaMart · sandbox</div>
          <h1 className="font-serif text-hero text-ink-50 text-balance">
            Challenge the decision.
          </h1>
          <p className="mt-3 text-ink-300 text-lg max-w-prose-doc leading-relaxed">
            Change an assumption and re-quote the decision.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
          {/* ── Assumptions panel ───────────────────────────────────── */}
          <div>
            <div className="text-xs text-ink-400 font-medium mb-4">Assumptions</div>
            <div className="divide-y rule border-t border-b rule bg-base-800 px-5 rounded-sm">
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
            <div className="mt-6 px-4 py-3 bg-base-800 border rule rounded-sm">
              <div className="text-xs text-ink-400 leading-relaxed">
                Drag segment churn above <span className="text-vermilion-600 font-medium">6.2%</span> to
                see the coverage lapse moment.
              </div>
            </div>
          </div>

          {/* ── Re-quote result ────────────────────────────────────── */}
          <div>
            <div className="text-xs text-ink-400 font-medium mb-4">Re-quote</div>

            {/* Before / After premium */}
            <div className="border-t border-b rule py-8 mb-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs text-ink-400 mb-2">Before</div>
                  <div className="text-xs text-ink-400 mb-1">Decision Premium</div>
                  <div className="editorial-num text-3xl text-ink-400 tabular-nums">
                    {formatCurrency(BASELINE_CALC.premium)}
                  </div>
                  <div className="text-xs text-ink-300 mt-1 tabular-nums">
                    {BASELINE_CALC.premiumRate.toFixed(1)}% of upside
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-400 mb-2">After</div>
                  <div className="text-xs text-ink-400 mb-1">Decision Premium</div>
                  <div className={`editorial-num text-3xl tabular-nums transition-colors ${
                    hasLapsed ? 'text-vermilion-600' : 'text-ink-50'
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
                before={`${BASELINE_CALC.premiumRate.toFixed(1)}%`}
                after={`${calc.premiumRate.toFixed(1)}%`}
              />
              <ComparisonRow
                label="Net-loss probability"
                before={`${BASELINE_CALC.netLossProbability}%`}
                after={`${calc.netLossProbability}%`}
              />
              <ComparisonRow
                label="Coverage"
                before="covered"
                after={hasLapsed ? 'lapse breached' : 'covered'}
              />
              <ComparisonRow
                label="Verdict"
                before={BASELINE_CALC.verdict}
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
            className="text-sm text-ink-300 hover:text-vermilion-600 transition-colors"
          >
            Return to decision brief
          </button>
          <button
            onClick={() => onNavigate('approval')}
            className="group inline-flex items-center gap-2 bg-ink-50 text-base-900 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Proceed to approval
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
