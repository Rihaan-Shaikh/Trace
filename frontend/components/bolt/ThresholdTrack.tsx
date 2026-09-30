import { type CoverageCondition } from '@/lib/bolt/types';
import { AlertTriangle } from 'lucide-react';

interface ThresholdTrackProps {
  condition: CoverageCondition;
}

export function ThresholdTrack({ condition }: ThresholdTrackProps) {
  const { currentNumeric, lapseNumeric, direction, state, unit } = condition;

  const maxVal = direction === 'above' ? lapseNumeric * 1.6 : lapseNumeric * 1.6;
  const currentPct = Math.min(100, Math.max(0, (currentNumeric / maxVal) * 100));
  const lapsePct = Math.min(100, (lapseNumeric / maxVal) * 100);

  const isLapsed = state === 'lapsed';
  const isNear = state === 'near-lapse';
  const isUnknown = state === 'unknown';

  const accentColor = isLapsed
    ? 'bg-vermilion-500'
    : isNear
      ? 'bg-vermilion-500'
      : 'bg-ink-50';

  return (
    <div className="py-5">
      {/* Label row */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-sm font-medium text-ink-50">{condition.label}</div>
          <div className="text-xs text-ink-300 mt-0.5">{condition.description}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-ink-300">distance to lapse</div>
          <div className={`text-sm font-mono font-medium ${
            isLapsed ? 'text-vermilion-500' : isNear ? 'text-vermilion-500' : 'text-ink-50'
          }`}>
            {condition.distance}
          </div>
        </div>
      </div>

      {/* Track */}
      {isUnknown ? (
        <div className="py-3">
          <div className="flex justify-between text-[10px] font-medium tracking-widest uppercase mb-4 text-ink-300 opacity-50">
            <span>SUPPORTED</span>
            <span>COVERAGE LAPSED</span>
          </div>
          <div className="h-[2px] bg-base-700 rounded-none relative mb-6">
            <div className="absolute top-1/2 -translate-y-1/2 left-[60%] w-2 h-2 rounded-full bg-ink-300" />
            <div className="absolute top-1/2 -translate-y-1/2 left-[60%] w-px h-4 bg-ink-300" />
          </div>
        </div>
      ) : (
        <div className="py-4">
          <div className="flex justify-between text-[10px] font-medium tracking-widest uppercase mb-4">
            <span className={isLapsed ? 'text-ink-400' : 'text-ink-50'}>SUPPORTED</span>
            <span className={isLapsed ? 'text-vermilion-500' : 'text-ink-400'}>COVERAGE LAPSED</span>
          </div>
          <div className="relative h-[1px] rounded-none bg-base-600 mb-6">
            {/* The line to current position */}
            <div
              className={`absolute left-0 top-0 h-full ${isLapsed ? 'bg-vermilion-500' : 'bg-ink-300'}`}
              style={{ width: `${currentPct}%` }}
            />
            {/* The coordinate markers */}
            <div className="absolute -top-1 h-2 w-[1px] bg-ink-50 left-0"></div>
            <div className="absolute -top-1 h-2 w-[1px] bg-ink-50 right-0"></div>
            
            {/* Lapse threshold marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-px h-6 bg-ink-300"
              style={{ left: `${lapsePct}%` }}
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-ink-300 font-mono whitespace-nowrap">
                {condition.lapseValue}
              </div>
            </div>
            {/* Current position marker */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${accentColor} border-none transition-all duration-300`}
              style={{ left: `${currentPct}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-ink-50 font-mono font-medium whitespace-nowrap">
                {condition.currentValue}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lapse warning */}
      {isLapsed && (
        <div className="mt-3 flex items-start gap-3 px-4 py-3 bg-base-800 border-l-2 border-vermilion-500 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-vermilion-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-ink-50 leading-relaxed">
            <span className="font-semibold text-vermilion-500 uppercase tracking-widest text-[10px] block mb-1">Coverage has lapsed.</span>
            {condition.label.toLowerCase()} exceeded the {condition.lapseValue} threshold.
          </div>
        </div>
      )}
    </div>
  );
}
