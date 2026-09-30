import { type View } from '@/lib/bolt/types';
import { LEDGER_ENTRIES } from '@/lib/bolt/data';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Divider, Section } from './ui/Section';

interface LedgerScreenProps {
  onNavigate: (view: View) => void;
}

export function LedgerScreen({ onNavigate }: LedgerScreenProps) {
  const totalDecisions = LEDGER_ENTRIES.length;
  const exceeded = LEDGER_ENTRIES.filter((e) => e.outcome === 'Exceeded').length;
  const within = LEDGER_ENTRIES.filter((e) => e.outcome === 'Within').length;
  const pending = LEDGER_ENTRIES.filter((e) => e.outcome === 'Pending').length;

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-ink-400 font-medium mb-2">Loss history</div>
          <h1 className="font-serif text-hero text-ink-800 text-balance">
            Loss history ledger
          </h1>
          <p className="mt-3 text-ink-500 text-lg max-w-prose-doc leading-relaxed">
            TRACE remembers what happened. Every approved decision is recorded here with its
            predicted exposure and eventual outcome.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-brass-50 border border-brass-200 rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brass-400" />
            <span className="text-xs text-brass-700 font-medium">Simulated history</span>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-b rule divide-y sm:divide-y-0 sm:divide-x rule mb-10">
          <div className="px-5 py-5">
            <div className="text-xs text-ink-400 mb-2">Decisions logged</div>
            <div className="editorial-num text-2xl text-ink-800 tabular-nums">{totalDecisions}</div>
          </div>
          <div className="px-5 py-5">
            <div className="text-xs text-ink-400 mb-2">Within exposure</div>
            <div className="editorial-num text-2xl text-brass-600 tabular-nums">{within}</div>
          </div>
          <div className="px-5 py-5">
            <div className="text-xs text-ink-400 mb-2">Exceeded exposure</div>
            <div className="editorial-num text-2xl text-vermilion-600 tabular-nums">{exceeded}</div>
          </div>
          <div className="px-5 py-5">
            <div className="text-xs text-ink-400 mb-2">Premium adjustment</div>
            <div className="editorial-num text-2xl text-ink-700 tabular-nums">+4%</div>
          </div>
        </div>

        {/* Ledger table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b rule-strong">
                <th className="text-left text-xs text-ink-400 font-medium py-3 pr-4">Decision</th>
                <th className="text-right text-xs text-ink-400 font-medium py-3 px-4">Predicted premium</th>
                <th className="text-right text-xs text-ink-400 font-medium py-3 px-4">Exposure</th>
                <th className="text-left text-xs text-ink-400 font-medium py-3 px-4">Outcome</th>
                <th className="text-right text-xs text-ink-400 font-medium py-3 px-4">Actual result</th>
                <th className="text-right text-xs text-ink-400 font-medium py-3 pl-4">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y rule">
              {LEDGER_ENTRIES.map((entry) => (
                <tr key={entry.id} className="hover:bg-parchment-50/50 transition-colors">
                  <td className="py-4 pr-4">
                    <div className="text-sm text-ink-800 font-medium">{entry.decision}</div>
                    {entry.simulated && (
                      <div className="text-[10px] text-ink-300 mt-0.5">simulated</div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-sm tabular-nums text-ink-700">
                    {entry.predictedPremium}
                  </td>
                  <td className="py-4 px-4 text-right text-sm tabular-nums text-ink-500">
                    {entry.exposure}
                  </td>
                  <td className="py-4 px-4">
                    <OutcomeBadge outcome={entry.outcome} />
                  </td>
                  <td className="py-4 px-4 text-right text-sm tabular-nums text-ink-700">
                    {entry.actualResult}
                  </td>
                  <td className="py-4 pl-4 text-right">
                    <VarianceDisplay value={entry.variance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calibration view */}
        <Section
          eyebrow="Calibration"
          title="Predicted exposure vs realised outcome"
          subtitle="TRACE tracks whether its predicted exposure matched what actually happened."
        >
          <div className="border-t border-b rule py-8">
            {/* Simple calibration visualization */}
            <div className="space-y-4">
              {LEDGER_ENTRIES.filter((e) => e.outcome !== 'Pending').map((entry) => {
                const predicted = parseFloat(entry.exposure.replace(/[^0-9.-]/g, '')) * -100000;
                const actual = parseFloat(entry.actualResult.replace(/[^0-9.-]/g, '')) * -100000;
                const maxVal = Math.max(Math.abs(predicted), Math.abs(actual), 500000);
                const predictedPct = (Math.abs(predicted) / maxVal) * 100;
                const actualPct = (Math.abs(actual) / maxVal) * 100;
                const exceeded = entry.outcome === 'Exceeded';

                return (
                  <div key={entry.id} className="flex items-center gap-4">
                    <div className="w-40 text-xs text-ink-500 truncate flex-shrink-0">
                      {entry.decision}
                    </div>
                    <div className="flex-1 relative h-5">
                      {/* Predicted bar */}
                      <div className="absolute left-0 top-0 h-2 bg-ink-200 rounded-full" style={{ width: `${predictedPct}%` }} />
                      {/* Actual bar */}
                      <div className={`absolute left-0 top-3 h-2 rounded-full ${exceeded ? 'bg-vermilion-400' : 'bg-brass-300'}`} style={{ width: `${actualPct}%` }} />
                    </div>
                    <div className="w-20 text-right text-xs tabular-nums text-ink-400 flex-shrink-0">
                      {entry.variance}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex items-center gap-6 text-xs text-ink-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1.5 bg-ink-200 rounded-full" />
                Predicted exposure
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1.5 bg-brass-300 rounded-full" />
                Within outcome
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1.5 bg-vermilion-400 rounded-full" />
                Exceeded outcome
              </div>
            </div>
          </div>
        </Section>

        {/* Actions */}
        <Divider className="mt-12" />
        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-ink-400">
            6 decisions logged · 1 exceeded predicted exposure · simulated history
          </div>
          <button
            onClick={() => onNavigate('home')}
            className="group inline-flex items-center gap-2 bg-ink-800 text-parchment-50 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            New decision
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === 'Within') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-brass-600 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-brass-400" />
        Within
      </span>
    );
  }
  if (outcome === 'Exceeded') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-vermilion-600 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-vermilion-500" />
        Exceeded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-400 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-ink-300" />
      Pending
    </span>
  );
}

function VarianceDisplay({ value }: { value: string }) {
  if (value === '—') {
    return <span className="text-sm text-ink-300 tabular-nums">—</span>;
  }
  const positive = value.startsWith('+');
  return (
    <span className={`text-sm tabular-nums font-medium inline-flex items-center gap-1 ${
      positive ? 'text-brass-600' : 'text-vermilion-600'
    }`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {value}
    </span>
  );
}
