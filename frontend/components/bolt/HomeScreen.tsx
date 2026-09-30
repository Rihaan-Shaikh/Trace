import { ArrowRight } from 'lucide-react';
import { RiskVisualizer } from '@/components/bolt/RiskVisualizer';

interface HomeScreenProps {
  onNavigate: (view: 'data' | 'investigation') => void;
  onSetDecision: (text: string) => void;
  decisionText: string;
}

export function HomeScreen({ onNavigate, onSetDecision, decisionText }: HomeScreenProps) {
  const handleStart = () => {
    if (decisionText.trim()) {
      onNavigate('data');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Block (Color Block) */}
      
      <div className="flex-1 bg-[#0A0A0C] relative flex flex-col justify-end overflow-hidden">
        <div className="absolute inset-0">
          <RiskVisualizer currentPct={60} lapsePct={100} />
        </div>
        <div className="relative z-10 p-12 md:p-24 pointer-events-none">
          <h1 className="font-serif text-5xl md:text-8xl text-vermilion-50 leading-[0.9] tracking-tight mix-blend-overlay opacity-80">
            Not confidence. <br />
            <span className="italic">Coverage.</span>
          </h1>
        </div>
      </div>

      {/* Right Block (Input) */}
      <div className="flex-1 bg-parchment-100 p-12 md:p-24 flex flex-col justify-center relative">
        
        <div className="max-w-md w-full">
          <div className="text-[10px] tracking-widest text-ink-400 uppercase font-mono mb-8">
            01 / Define the decision
          </div>
          
          <h2 className="font-serif text-3xl md:text-5xl text-ink-900 mb-12 leading-tight">
            What are you willing to be wrong about?
          </h2>

          <div className="relative">
            <textarea
              value={decisionText}
              onChange={(e) => onSetDecision(e.target.value)}
              placeholder="Stop blanket discounts for low-margin customers..."
              className="w-full bg-transparent border-b-2 border-ink-900 py-4 text-xl text-ink-900 placeholder:text-ink-300 resize-none focus:outline-none transition-colors"
              rows={2}
            />
          </div>

          <div className="mt-12 flex justify-start">
            <button
              onClick={handleStart}
              disabled={!decisionText.trim()}
              className="group flex items-center justify-center w-24 h-24 rounded-full bg-ink-900 text-parchment-50 disabled:bg-ink-200 disabled:text-ink-400 hover:scale-105 transition-all duration-300 shadow-2xl"
            >
              <ArrowRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
