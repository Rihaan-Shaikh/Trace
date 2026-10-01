import { type View } from '@/lib/bolt/types';
import { INVESTIGATION_STAGES } from '@/lib/bolt/data';
import { ArrowRight, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Divider } from './ui/Section';

interface InvestigationScreenProps {
  onNavigate: (view: View) => void;
  decisionId?: string;
}

export function InvestigationScreen({ onNavigate, decisionId }: InvestigationScreenProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= INVESTIGATION_STAGES.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 450);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  const allComplete = visibleCount >= INVESTIGATION_STAGES.length;

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-16">
        {/* Header */}
        <div className="mb-16">
          <div className="text-xs text-ink-400 font-medium mb-2">NovaMart · investigation</div>
          <h1 className="font-serif text-hero text-ink-800 text-balance">
            The investigation.
          </h1>
          <p className="mt-3 text-ink-500 text-lg max-w-prose-doc leading-relaxed">
            TRACE investigates the decision in stages, leaving evidence behind at each step.
          </p>
        </div>

        {/* Trail */}
        <div className="max-w-2xl">
          {INVESTIGATION_STAGES.slice(0, visibleCount).map((stage, idx) => (
            <div key={stage.id} className="animate-resolve">
              <div className="flex items-start gap-5">
                {/* Trail marker */}
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                    stage.status === 'completed'
                      ? 'bg-parchment-50 border-brass-400 text-brass-600'
                      : 'bg-parchment-50 border-ink-200 text-ink-300'
                  }`}>
                    <Check className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  {idx < INVESTIGATION_STAGES.length - 1 && (
                    <div className="w-px h-12 bg-ink-100 mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-baseline gap-3">
                    <div className="text-xs text-ink-400 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <h3 className="text-base font-medium text-ink-800">{stage.name}</h3>
                    <div className="text-xs text-brass-600 font-medium">completed</div>
                  </div>
                  {stage.output && (
                    <p className="mt-2 text-sm text-ink-600 leading-relaxed max-w-lg">
                      {stage.output}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pending marker */}
          {!allComplete && (
            <div className="flex items-start gap-5 opacity-30">
              <div className="w-7 h-7 rounded-full border border-ink-200 bg-parchment-50" />
              <div className="text-sm text-ink-400 pt-1.5">…</div>
            </div>
          )}
        </div>

        {/* Action */}
        {allComplete && (
          <div className="mt-16 animate-fade-in">
            <Divider className="mb-8" />
            <div className="flex items-center justify-between">
              <div className="text-xs text-ink-400">
                7 stages completed · Decision Premium calculated
              </div>
              <button
                onClick={() => onNavigate('decision-brief')}
                className="group inline-flex items-center gap-2 bg-ink-800 text-parchment-50 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
              >
                Read the decision brief
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
