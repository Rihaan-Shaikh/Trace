import { type CoverageCondition } from '@/lib/bolt/types';
import { AlertTriangle } from 'lucide-react';

interface ThresholdTrackProps {
  condition: CoverageCondition;
}

export function ThresholdTrack({ condition }: ThresholdTrackProps) {
  const { currentNumeric, lapseNumeric, direction, state, unit } = condition;

  // Calculate position on track (0-100%)
  // For "above" direction: risk increases as value goes up, lapse is at the right
  // For "below" direction: risk increases as value goes down
  const maxVal = direction === 'above' ? lapseNumeric * 1.6 : lapseNumeric * 1.6;
  const currentPct = Math.min(100, Math.max(0, (currentNumeric / maxVal) * 100));
  const lapsePct = Math.min(100, (lapseNumeric / maxVal) * 100);

  const isLapsed = state === 'lapsed';
  const isNear = state === 'near-lapse';
  const isUnknown = state === 'unknown';

  const accentColor = isLapsed
    ? 'bg-vermilion-500'
    : isNear
      ? 'bg-vermilion-400'
      : 'bg-ink-400';

  const trackColor = isLapsed
    ? 'bg-vermilion-200'
    : isNear
      ? 'bg-vermilion-100'
      : 'bg-ink-100';

  return (
    <div className="py-5">
      {/* Label row */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-sm font-medium text-ink-800">{condition.label}</div>
          <div className="text-xs text-ink-400 mt-0.5">{condition.description}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-400">distance to lapse</div>
          <div className={`text-sm font-medium tabular-nums ${
            isLapsed ? 'text-vermilion-600' : isNear ? 'text-vermilion-500' : 'text-ink-600'
          }`}>
            {condition.distance}
          </div>
        </div>
      </div>

      {/* Track */}
      {isUnknown ? (
        <div className="py-3">
          <div className="h-1.5 bg-ink-100 rounded-full relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-[60%] w-3 h-3 rounded-full bg-ink-300 border-2 border-parchment-50" />
            <div className="absolute top-1/2 -translate-y-1/2 left-[60%] w-px h-4 bg-ink-300" />
          </div>
          <div className="flex justify-between mt-2 text-xs text-ink-400">
            <span className="tabular-nums">current: {condition.currentValue}</span>
            <span className="tabular-nums">lapse: {condition.lapseValue}</span>
          </div>
        </div>
      ) : (
        <div className="py-3">
          {/* Track bar */}
          <div className="relative h-1.5 rounded-full bg-ink-100">
            {/* Filled portion */}
            <div
              className={`absolute left-0 top-0 h-full rounded-full ${trackColor}`}
              style={{ width: `${currentPct}%` }}
            />
            {/* Lapse threshold marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-px h-5 bg-vermilion-500"
              style={{ left: `${lapsePct}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-vermilion-600 font-medium whitespace-nowrap">
                lapse
              </div>
            </div>
            {/* Current position marker */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${accentColor} border-2 border-parchment-50 transition-all duration-300`}
              style={{ left: `${currentPct}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-3 text-xs">
            <div>
              <span className="text-ink-400">current </span>
              <span className="text-ink-700 font-medium tabular-nums">{condition.currentValue}</span>
            </div>
            <div>
              <span className="text-vermilion-500">lapse </span>
              <span className="text-vermilion-600 font-medium tabular-nums">{condition.lapseValue}</span>
            </div>
          </div>
        </div>
      )}

      {/* Lapse warning */}
      {isLapsed && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-vermilion-50 border border-vermilion-200 rounded-sm animate-fade-in">
          <AlertTriangle className="w-3.5 h-3.5 text-vermilion-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-vermilion-700 leading-relaxed">
            Coverage has lapsed. {condition.label.toLowerCase()} exceeded the {condition.lapseValue} threshold.
          </div>
        </div>
      )}
      {isNear && !isLapsed && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-vermilion-50/50 border border-vermilion-100 rounded-sm">
          <div className="text-xs text-vermilion-600 leading-relaxed">
            Approaching lapse threshold. {condition.distance} remaining.
          </div>
        </div>
      )}
    </div>
  );
}
