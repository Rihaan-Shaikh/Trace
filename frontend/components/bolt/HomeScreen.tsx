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
            <div className="min-h-screen bg-base-900 flex flex-col justify-center items-center text-ink-50 selection:bg-vermilion-500/30">
      <div className="w-full max-w-4xl px-8">
        {/* Masthead */}
        <div className="flex flex-col items-center mb-16 text-center animate-fade-in">
          <h1 className="text-4xl tracking-[0.2em] font-medium text-ink-50 mb-4">
            TRACE
          </h1>
          <div className="flex flex-col items-center">
            <span className="text-[10px] tracking-widest text-ink-300 uppercase mb-1">Not confidence.</span>
            <div className="flex items-center gap-4">
              <span className="text-[10px] tracking-widest text-ink-50 uppercase font-semibold">Coverage</span>
              <div className="w-32 h-[1px] bg-base-600 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-vermilion-500"></div>
              </div>
            </div>
          </div>
        </div>

        {/* The Instrument Canvas */}
        <div className="border border-base-600 bg-base-800 p-8 md:p-12 w-full animate-fade-in" style={{ animationDelay: '0.1s' }}>
          
          <div className="text-[10px] tracking-widest text-ink-300 uppercase mb-4">
            What decision are we pricing?
          </div>
          
          <div className="relative group mb-10">
            <textarea
              value={decisionText}
              onChange={(e) => onSetDecision(e.target.value)}
              placeholder="e.g. Stop blanket discounts for low-margin customers"
              className="w-full bg-base-900 border border-base-600 px-6 py-5 text-xl text-ink-50 placeholder:text-base-500 resize-none focus:outline-none focus:border-ink-300 transition-colors"
              rows={2}
            />
          </div>

          <div className="w-full h-[1px] bg-base-600 mb-10"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Col: Cost */}
            <div>
              <div className="text-[10px] tracking-widest text-ink-300 uppercase mb-6">
                Cost if wrong
              </div>
              <div className="mb-4">
                <div className="text-4xl text-ink-50 tabular-nums font-light mb-1"></div>
                <div className="text-xs text-ink-300">decision premium</div>
              </div>
              <div>
                <div className="text-xl text-ink-50 tabular-nums font-light mb-1">8.0%</div>
                <div className="text-xs text-ink-300">of projected upside</div>
              </div>
            </div>

            {/* Right Col: Boundary */}
            <div>
              <div className="text-[10px] tracking-widest text-ink-300 uppercase mb-6">
                Where it breaks
              </div>
              <div className="mb-8">
                <div className="flex justify-between items-end mb-3">
                  <div className="text-xl text-ink-50 tabular-nums font-light">6.2%</div>
                  <div className="text-xs text-ink-300 text-right">churn threshold</div>
                </div>
                
                {/* The instrument track */}
                <div className="relative h-[2px] bg-base-600 w-full mb-3">
                  <div className="absolute left-0 top-0 h-full bg-ink-300" style={{ width: '50%' }}></div>
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-vermilion-500" style={{ left: '50%' }}></div>
                </div>
                
                <div className="flex justify-between text-xs text-ink-300">
                  <span>3.1% current</span>
                  <span>3.1 pts of room</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleStart}
                  className="bg-ink-50 text-base-900 px-6 py-3 text-xs font-semibold tracking-wider uppercase hover:bg-ink-300 transition-colors"
                >
                  Challenge the decision
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

  );
}