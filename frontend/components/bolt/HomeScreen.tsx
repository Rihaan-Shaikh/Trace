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
        <div className="min-h-screen bg-parchment-100 flex flex-col justify-center">
      <div className="max-w-3xl mx-auto px-8 w-full">
        {/* Brand masthead */}
        <div className="mb-12 animate-fade-in text-center">
          <div className="font-serif text-4xl font-semibold text-ink-800 tracking-tight mb-2">
            TRACE
          </div>
          <div className="flex items-center justify-center gap-2 text-ink-800">
            <span className="italic text-ink-500">Not confidence.</span>
            <span className="font-semibold">Coverage.</span>
          </div>
        </div>

        {/* The TRACE Line Motif */}
        <div className="relative mb-16 px-4">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-ink-300"></div>
          <div className="relative flex justify-between text-[10px] uppercase tracking-widest text-ink-400 font-medium bg-parchment-100">
            <span className="bg-parchment-100 pr-2">Evidence</span>
            <span className="bg-parchment-100 pl-2">Decision</span>
          </div>
        </div>

        {/* Main headline */}
        <h1 className="font-serif text-4xl lg:text-5xl text-ink-800 text-center text-balance leading-tight mb-10">
          What are you willing to be wrong about?
        </h1>

        {/* Input surface */}
        <div className="max-w-2xl mx-auto">
          <div className="text-xs text-ink-400 mb-2 text-center uppercase tracking-wide">
            Describe the decision you need to make
          </div>
          <div className="relative group">
            <textarea
              value={decisionText}
              onChange={(e) => onSetDecision(e.target.value)}
              placeholder="e.g. Should we stop discounts for low-margin customers?"
              className="w-full min-h-[100px] bg-parchment-50 border border-ink-200 rounded-none px-5 py-4 text-lg text-ink-800 placeholder:text-ink-300 resize-none focus:outline-none focus:border-ink-500 transition-colors shadow-sm"
            />
            
            {/* Start button appended right below */}
            <div className="mt-4 flex flex-col items-center gap-4">
              <div className="text-xs text-ink-400 text-center">
                TRACE will price the downside, challenge the recommendation and show where the answer breaks.
              </div>
              <button
                onClick={handleStart}
                className="group inline-flex items-center gap-2 bg-ink-800 text-parchment-50 px-8 py-3 rounded-none text-sm font-medium hover:bg-ink-700 transition-colors"
              >
                Start investigation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom philosophy / Acronym */}
        <div className="mt-24 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
            Trust the data <span className="mx-2 opacity-50">&#183;</span> Retrieve the evidence <span className="mx-2 opacity-50">&#183;</span> Analyze the decision <span className="mx-2 opacity-50">&#183;</span> Challenge the conclusion <span className="mx-2 opacity-50">&#183;</span> Explain the outcome
          </p>
        </div>
      </div>
    </div>


  );
}
