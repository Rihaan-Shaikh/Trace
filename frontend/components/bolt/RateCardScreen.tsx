import { type View, type RateDriver } from '@/lib/bolt/types';
import { RATE_DRIVERS } from '@/lib/bolt/data';
import { ArrowRight, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Divider, Section } from './ui/Section';
import { api } from '@/lib/api-client';

interface RateCardScreenProps {
  onNavigate: (view: View) => void;
}

export function RateCardScreen({ onNavigate }: RateCardScreenProps) {
  const [drivers, setDrivers] = useState<RateDriver[]>(RATE_DRIVERS);
  const [activeVersion, setActiveVersion] = useState<string>('1.0.0');
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadRateCard() {
      try {
        const rc = await api.rateCard.getActive();
        if (isMounted && rc) {
          setActiveVersion(rc.version_str || '1.0.0');
          const updatedDrivers: RateDriver[] = [
            {
              id: 'contradiction',
              name: 'Contradiction load',
              weight: Math.round(rc.weight_contradiction * 100),
              description: 'Applies when counter-evidence, contract clauses, or regional exceptions challenge the baseline model.',
              threshold: 'Any material contradiction',
            },
            {
              id: 'data-quality',
              name: 'Data-quality load',
              weight: Math.round(rc.weight_data_quality * 100),
              description: 'Derived from missing fields, duplicate records, staleness, and unmapped entities in the underlying tables.',
              threshold: '>2% missing or duplicate',
            },
            {
              id: 'verification',
              name: 'Verification load',
              weight: Math.round(rc.weight_verification * 100),
              description: 'Penalises unverified figures, calculation discrepancies, and figures that failed independent dual-method checks.',
              threshold: 'Any unverified figure',
            },
            {
              id: 'model-uncertainty',
              name: 'Model uncertainty load',
              weight: Math.round(rc.base_model_uncertainty_weight * 100),
              description: 'Reflects variance across 1,000 Monte Carlo simulation runs and distance from the empirical distribution.',
              threshold: 'P10/P90 spread > 3x',
            },
          ];
          setDrivers(updatedDrivers);
          setIsLive(true);
        }
      } catch (err) {
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadRateCard();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalWeight = drivers.reduce((sum, d) => sum + d.weight, 0);

  
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
            <div className="text-xs text-ink-400 font-medium">Configuration · Policy v{activeVersion}</div>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brass-700 bg-brass-50 border border-brass-200 px-2.5 py-1 rounded-sm font-medium">
                <Database className="w-3.5 h-3.5" />
                Live Rate Card Policy Connected
              </span>
            )}
          </div>
          <h1 className="font-serif text-hero text-ink-800 ">
            Rate card
          </h1>
          <p className="mt-3 text-ink-500 text-lg max-w-prose-doc leading-relaxed">
            The pricing logic, shown openly. No hidden AI magic. No model confidence.
            The Decision Premium is a transparent deterministic function of four risk drivers.
          </p>
        </div>

        {/* Total weight */}
        <div className="border-t border-b rule py-6 mb-10">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-ink-400 mb-1">Total premium weight baseline</div>
              <div className="editorial-num text-2xl text-ink-800 tabular-nums">{totalWeight}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-400 mb-1">Risk drivers</div>
              <div className="editorial-num text-2xl text-ink-700 tabular-nums">{drivers.length}</div>
            </div>
          </div>
        </div>

        {/* Risk drivers */}
        <div className="border-t rule">
          {drivers.map((driver) => (
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
                        style={{ width: `${Math.min(100, (driver.weight / totalWeight) * 100)}%` }}
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
              <Divider />
            </div>
          ))}
        </div>

        {/* Verdict bands */}
        <Section
          eyebrow="Rules"
          title="Verdict bands"
          subtitle="How the premium rate determines the underwriting recommendation."
        >
          <div className="grid sm:grid-cols-3 gap-0 border-t border-b rule divide-y sm:divide-y-0 sm:divide-x rule">
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-1">Premium rate &lt; 10%</div>
              <div className="text-base font-medium text-brass-700 mb-2">Recommended</div>
              <div className="text-xs text-ink-500 leading-relaxed">
                Risk cost is modest relative to projected upside. Evidence is sound.
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-1">Premium rate 10% – 25%</div>
              <div className="text-base font-medium text-brass-600 mb-2">Recommended with conditions</div>
              <div className="text-xs text-ink-500 leading-relaxed">
                Material risks identified. Specific conditions and tripwires must be monitored.
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="text-xs text-ink-400 mb-1">Premium rate &gt; 25% or lapse</div>
              <div className="text-base font-medium text-vermilion-600 mb-2">Refer</div>
              <div className="text-xs text-ink-500 leading-relaxed">
                Risk cost exceeds acceptable bounds or a coverage condition has lapsed.
              </div>
            </div>
          </div>
        </Section>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="text-sm text-ink-500 hover:text-ink-700 transition-colors"
          >
            Back to home
          </button>
          <button
            onClick={() => onNavigate('data')}
            className="group inline-flex items-center gap-2 bg-ink-900 text-parchment-50 px-6 py-3 rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Bring new evidence
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
