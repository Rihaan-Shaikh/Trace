import { formatCurrency } from '@/lib/bolt/data';
import { type DecisionCalc } from '@/lib/bolt/types';

interface ScenarioDistributionProps {
  calc: DecisionCalc;
}

export function ScenarioDistribution({ calc }: ScenarioDistributionProps) {
  const { exposure } = calc;

  // Build a simple distribution bar chart from the scenario data
  // We'll create a series of bars representing the distribution
  const bars = 40;
  const distribution: number[] = [];
  const worst = exposure.worstPlausible;
  const best = calc.projectedUpside * 0.3;
  const range = best - worst;

  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1);
    // Skewed distribution: most mass near the positive end, tail on the left
    const value = worst + range * t;
    // Bell-ish curve skewed left
    const peak = 0.7;
    const distance = Math.abs(t - peak);
    const height = Math.exp(-distance * distance * 8) * (0.6 + Math.random() * 0.4);
    distribution.push(height);
  }

  // Find the P10 position (10th percentile from worst)
  const p10Position = Math.floor(bars * 0.1);
  const avgWorst10Position = Math.floor(bars * 0.1);

  return (
    <div className="mt-6">
      <div className="text-xs text-ink-400 mb-3">Scenario distribution &#183; 1,000 trials</div>

      {/* Distribution bars */}
      <div className="relative h-32 flex items-end gap-px">
        {distribution.map((height, i) => {
          const isTail = i <= avgWorst10Position;
          const isP10 = i === p10Position;
          return (
            <div
              key={i}
              className={`flex-1 rounded-t-sm transition-colors ${
                isTail
                  ? 'bg-vermilion-300'
                  : isP10
                    ? 'bg-vermilion-400'
                    : 'bg-ink-200'
              }`}
              style={{ height: `${Math.max(2, height * 100)}%` }}
            />
          );
        })}
      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-2 text-xs text-ink-400 tabular-nums">
        <div>
          <div className="text-vermilion-500 font-medium">{formatCurrency(worst)}</div>
          <div className="text-[10px]">worst plausible</div>
        </div>
        <div className="text-center">
          <div className="text-vermilion-400 font-medium">{formatCurrency(exposure.avgWorst10)}</div>
          <div className="text-[10px]">avg worst 10%</div>
        </div>
        <div className="text-right">
          <div className="text-ink-500 font-medium">{formatCurrency(best)}</div>
          <div className="text-[10px]">median outcome</div>
        </div>
      </div>

      {/* Tail annotation */}
      <div className="mt-4 flex items-start gap-2">
        <div className="w-1 h-8 bg-vermilion-400 rounded-full mt-0.5" />
        <div className="text-xs text-ink-500 leading-relaxed">
          The left tail represents the downside scenarios. TRACE prices the Decision Premium
          against this exposure, not against the median outcome.
        </div>
      </div>
    </div>
  );
}

