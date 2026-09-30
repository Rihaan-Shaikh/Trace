import { type View } from '@/lib/bolt/types';
import { RATE_DRIVERS } from '@/lib/bolt/data';
import { ArrowRight } from 'lucide-react';
import { Divider, Section } from './ui/Section';

interface RateCardScreenProps {
  onNavigate: (view: View) => void;
}

export function RateCardScreen({ onNavigate }: RateCardScreenProps) {
  const totalWeight = RATE_DRIVERS.reduce((sum, d) => sum + d.weight, 0);

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-ink-400 font-medium mb-2">Configuration</div>
          <h1 className="font-serif text-hero text-ink-800 text-balance">
            Rate card
          </h1>
          <p className="mt-3 text-ink-500 text-lg max-w-prose-doc leading-relaxed">
            The pricing logic, shown openly. No hidden AI magic. No model confidence.
            The Decision Premium is a transparent function of four risk drivers.
          </p>
        </div>

        {/* Total weight */}
        <div className="border-t border-b rule py-6 mb-10">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-ink-400 mb-1">Total premium weight</div>
              <div className="editorial-num text-2xl text-ink-800 tabular-nums">{totalWeight}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-400 mb-1">Drivers</div>
              <div className="editorial-num text-2xl text-ink-700 tabular-nums">{RATE_DRIVERS.length}</div>
            </div>
          </div>
        </div>

        {/* Risk drivers */}
        <div className="border-t rule">
          {RATE_DRIVERS.map((driver, idx) => (
            <div key={driver.id}>
              <div className="py-8">
                <div className="grid lg:grid-cols-[auto_1fr_auto] gap-6 items-start">
                  {/* Weight */}
                  <div className="lg:w-32">
                    <div className="text-xs text-ink-400 mb-1">Weight</div>
                    <div className="editorial-num text-3xl text-brass-600 tabular-nums">
                      {driver.weight}%
                    </div>
                    {/* Weight bar */}
                    <div className="mt-2 h-1 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brass-400 rounded-full"
                        style={{ width: `${(driver.weight / totalWeight) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex-1">
                    <div className="text-base font-medium text-ink-800 mb-2">{driver.name}</div>
                    <div className="text-sm text-ink-500 leading-relaxed max-w-lg">
                      {driver.description}
                    </div>
                  </div>

                  {/* Threshold */}
                  <div className="lg:text-right">
                    <div className="text-xs text-ink-400 mb-1">Threshold</div>
                    <div className="text-sm font-medium text-ink-700 tabular-nums">
                      {driver.threshold}
                    </div>
                  </div>
                </div>
              </div>
              {idx < RATE_DRIVERS.length - 1 && <Divider />}
            </div>
          ))}
        </div>

        {/* Formula explanation */}
        <Section
          eyebrow="How it works"
          title="The premium formula"
          subtitle="The Decision Premium is a transparent, auditable calculation — not a black-box confidence score."
        >
          <div className="border-t border-b rule py-8">
            <div className="font-mono text-sm text-ink-600 leading-relaxed space-y-2">
              <div>
                <span className="text-ink-400">Decision Premium = </span>
                <span className="text-ink-700">Expected Loss</span>
                <span className="text-ink-400"> × </span>
                <span className="text-ink-700">Risk Multiplier</span>
              </div>
              <div className="pl-4 text-xs text-ink-400">
                where Risk Multiplier = Σ(driver weight × driver score)
              </div>
              <div className="pt-2">
                <span className="text-ink-400">Risk Multiplier = </span>
                <span className="text-brass-600">0.25 × Data Quality</span>
                <span className="text-ink-400"> + </span>
                <span className="text-brass-600">0.20 × Verification</span>
                <span className="text-ink-400"> + </span>
                <span className="text-brass-600">0.30 × Contradiction</span>
                <span className="text-ink-400"> + </span>
                <span className="text-brass-600">0.25 × Model Uncertainty</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Actions */}
        <Divider className="mt-12" />
        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-ink-400">
            Transparent pricing policy · no hidden model confidence
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
