import { type View } from '@/lib/bolt/types';
import { api } from '@/lib/api-client';
import { ArrowRight, ChevronRight } from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (view: View) => void;
  onSetDecision: (decision: string) => void;
  decisionText: string;
}

const EXAMPLES = [
  'Change pricing',
  'Reduce discounts',
  'Shift regional investment',
  'Change retention strategy',
];

const EXAMPLE_PROMPTS: Record<string, string> = {
  'Change pricing': 'Should we increase prices on premium-tier products?',
  'Reduce discounts': 'Should we stop discounts for low-margin customers?',
  'Shift regional investment': 'Should we reallocate marketing budget from the west to the south region?',
  'Change retention strategy': 'Should we launch a loyalty programme for at-risk customers?',
};

export function HomeScreen({ onNavigate, onSetDecision, decisionText }: HomeScreenProps) {
  const handleStart = () => {
    if (!decisionText.trim()) {
      onSetDecision('Should we stop discounts for low-margin customers?');
    }
    onNavigate('data');
  };

  const handleExample = (example: string) => {
    onSetDecision(EXAMPLE_PROMPTS[example] || example);
    onNavigate('data');
  };

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-24 pb-16">
        {/* Tagline */}
        <div className="mb-16 animate-fade-in">
          <div className="text-xs text-ink-400 font-medium tracking-wide mb-1">
            NovaMart · retail dataset
          </div>
          <div className="text-xs text-ink-300 italic">
            Not confidence. Coverage.
          </div>
        </div>

        {/* Main headline */}
        <h1 className="font-serif text-hero text-ink-800 text-balance max-w-3xl leading-[1.05]">
          Which decision are you underwriting?
        </h1>

        {/* Input surface */}
        <div className="mt-10 max-w-3xl">
          <div className="relative">
            <textarea
              value={decisionText}
              onChange={(e) => onSetDecision(e.target.value)}
              placeholder="Describe the decision you need to make…"
              className="w-full min-h-[120px] bg-parchment-50 border rule rounded-sm px-5 py-4 text-lg text-ink-800 placeholder:text-ink-300 resize-none focus:outline-none focus:border-vermilion-300 transition-colors"
            />
          </div>

          {/* Example prompt */}
          <div className="mt-3 px-1">
            <div className="text-xs text-ink-400">
              e.g. “Should we stop discounts for low-margin customers?”
            </div>
          </div>

          {/* Start button */}
          <div className="mt-6">
            <button
              onClick={handleStart}
              className="group inline-flex items-center gap-2 bg-ink-800 text-parchment-50 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
            >
              Start investigation
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Example links */}
          <div className="mt-12">
            <div className="text-xs text-ink-400 mb-3">Or start from a common decision</div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleExample(ex)}
                  className="group inline-flex items-center gap-1 text-sm text-ink-500 hover:text-vermilion-600 transition-colors"
                >
                  {ex}
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom philosophy */}
        <div className="mt-24 max-w-2xl border-t rule pt-8">
          <p className="text-sm text-ink-500 leading-relaxed">
            TRACE does not tell a business what it thinks. TRACE tells a business what a decision
            costs if it is wrong, and exactly when that decision should no longer be trusted.
          </p>
        </div>
      </div>
    </div>
  );
}


