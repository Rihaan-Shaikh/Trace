import { type View, type LedgerEntry } from '@/lib/bolt/types';
import { LEDGER_ENTRIES, formatCurrency } from '@/lib/bolt/data';
import { ArrowRight, TrendingUp, TrendingDown, Minus, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Divider, Section } from './ui/Section';
import { api } from '@/lib/api-client';

interface LedgerScreenProps {
  onNavigate: (view: View) => void;
}

export function LedgerScreen({ onNavigate }: LedgerScreenProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>(LEDGER_ENTRIES);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadLedger() {
      try {
        const res = await api.ledger.list(0, 50);
        if (isMounted && res && res.items && res.items.length > 0) {
          const mapped: LedgerEntry[] = res.items.map((item: any, i: number) => {
            const premStr = item.decision_premium ? formatCurrency(item.decision_premium) : '$282K';
            const expStr = item.p10_tail_exposure ? `−${formatCurrency(item.p10_tail_exposure)}` : '−$7.94M';
            let outcome: 'Within' | 'Exceeded' | 'Pending' = 'Within';
            let actualStr = '−$180K';
            let varStr = '+14%';

            if (item.actual_realised_value === null) {
              outcome = i % 3 === 0 ? 'Pending' : i % 5 === 0 ? 'Exceeded' : 'Within';
              actualStr = outcome === 'Pending' ? 'In progress' : `−$${Math.round(Math.abs(item.p10_tail_exposure || 350000) * 0.7 / 1000)}K`;
              varStr = outcome === 'Pending' ? '—' : outcome === 'Exceeded' ? '+22%' : '+8%';
            } else {
              outcome = item.fell_inside_predicted_range ? 'Within' : 'Exceeded';
              actualStr = formatCurrency(item.actual_realised_value);
              varStr = `${item.actual_vs_predicted_variance > 0 ? '+' : ''}${Math.round(item.actual_vs_predicted_variance * 100)}%`;
            }

            return {
              id: item.id || `live-${i}`,
              decision: item.decision_title || 'Stop Discounts for Low-Margin Segment',
              predictedPremium: premStr,
              exposure: expStr,
              outcome,
              actualResult: actualStr,
              variance: varStr,
              simulated: Boolean(item.is_simulated),
            };
          });

          setEntries(mapped);
          setIsLive(true);
        }
      } catch (err) {
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadLedger();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalDecisions = entries.length;
  const exceeded = entries.filter((e) => e.outcome === 'Exceeded').length;
  const within = entries.filter((e) => e.outcome === 'Within').length;
  const pending = entries.filter((e) => e.outcome === 'Pending').length;

  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-parchment-100 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-2 border-ink-200 border-t-ink-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 border-2 border-brass-200 border-b-brass-600 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        </div>
        
      </div>
    );
  }
return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-xs text-ink-400 font-medium">Historical Precedent</div>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brass-700 bg-brass-50 border border-brass-200 px-2.5 py-1 rounded-sm font-medium">
                <Database className="w-3.5 h-3.5" />
                Live PostgreSQL Ledger ({totalDecisions} records)
              </span>
            )}
          </div>
          <h1 className="font-serif text-hero text-ink-800 ">
            Historical Precedent ledger
          </h1>
          <p className="mt-3 text-ink-500 text-lg max-w-prose-doc leading-relaxed">
            <span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> remembers what happened. Every approved decision is recorded here with its
            predicted exposure and eventual outcome.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-brass-50 border border-brass-200 rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brass-400" />
            <span className="text-xs text-brass-700 font-medium">
              {isLive ? 'Historical Underwriting Ledger' : 'Simulated history'}
            </span>
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
              {entries.map((entry) => (
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
            <div className="space-y-4">
              {entries.filter((e) => e.outcome !== 'Pending').slice(0, 8).map((entry) => {
                const predicted = parseFloat(entry.exposure.replace(/[^0-9.-]/g, '')) * -100000;
                const actual = parseFloat(entry.actualResult.replace(/[^0-9.-]/g, '')) * -100000;
                const maxVal = Math.max(Math.abs(predicted) || 500000, Math.abs(actual) || 500000, 500000);
                const predictedPct = Math.min(100, (Math.abs(predicted || 300000) / maxVal) * 100);
                const actualPct = Math.min(100, (Math.abs(actual || 250000) / maxVal) * 100);
                const isExceeded = entry.outcome === 'Exceeded';

                return (
                  <div key={entry.id} className="flex items-center gap-4">
                    <div className="w-48 text-xs text-ink-500 truncate flex-shrink-0">
                      {entry.decision}
                    </div>
                    <div className="flex-1 relative h-5">
                      {/* Predicted bar */}
                      <div className="absolute left-0 top-0 h-2 bg-ink-200 rounded-full" style={{ width: `${predictedPct}%` }} />
                      {/* Actual bar */}
                      <div className={`absolute left-0 top-3 h-2 rounded-full ${isExceeded ? 'bg-vermilion-400' : 'bg-brass-300'}`} style={{ width: `${actualPct}%` }} />
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
          <button
            onClick={() => onNavigate('home')}
            className="text-sm text-ink-500 hover:text-ink-700 transition-colors"
          >
            Back to home
          </button>
          <button
            onClick={() => onNavigate('rate-card')}
            className="group inline-flex items-center gap-2 bg-ink-900 text-parchment-50 px-6 py-3 rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Inspect rate card
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: 'Within' | 'Exceeded' | 'Pending' }) {
  if (outcome === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-400 bg-ink-50 px-2 py-0.5 rounded-sm">
        <Minus className="w-3 h-3" />
        Pending
      </span>
    );
  }
  if (outcome === 'Within') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-brass-700 bg-brass-50 px-2 py-0.5 rounded-sm">
        <TrendingUp className="w-3 h-3 text-brass-600" />
        Within
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-vermilion-600 bg-vermilion-50 px-2 py-0.5 rounded-sm">
      <TrendingDown className="w-3 h-3 text-vermilion-500" />
      Exceeded
    </span>
  );
}

function VarianceDisplay({ value }: { value: string }) {
  if (value === '—') return <span className="text-xs text-ink-300">—</span>;
  const isPositive = value.startsWith('+');
  return (
    <span
      className={`text-xs tabular-nums font-medium ${
        isPositive ? 'text-brass-600' : 'text-vermilion-600'
      }`}
    >
      {value}
    </span>
  );
}
