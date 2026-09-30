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
    <div className="min-h-screen flex flex-col md:flex-row relative">
      
      {/* Central Brand Mark (The "Logo" spanning across the split) */}
      <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transform -rotate-12 mix-blend-difference">
        <h1 className="font-serif text-[12vw] text-white leading-none tracking-tighter opacity-90 select-none">
          TRACE
        </h1>
      </div>

      {/* Left Block (Dark) - 40% width */}
      <div className="md:w-[40%] bg-[#0A0A0C] relative flex flex-col justify-between overflow-hidden p-12 md:p-24">
        <div className="absolute inset-0">
          <RiskVisualizer currentPct={60} lapsePct={100} />
        </div>
        
        <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
          <div>
            <h2 className="font-serif text-4xl md:text-6xl text-parchment-100 leading-[0.9] tracking-tight opacity-90">
              Not confidence.
            </h2>
          </div>
          <div className="text-right mt-auto">
            <h2 className="font-serif text-4xl md:text-6xl text-vermilion-500 leading-[0.9] tracking-tight italic opacity-90">
              Coverage.
            </h2>
          </div>
        </div>
      </div>

      {/* Right Block (Input) - 60% width */}
      <div className="md:w-[60%] bg-parchment-100 p-12 md:p-32 flex flex-col justify-center relative">
        <div className="max-w-2xl w-full mx-auto pl-12">
          
          <h2 className="font-serif text-4xl md:text-6xl text-ink-900 mb-16 leading-tight">
            What are you willing to be wrong about?
          </h2>

          <div className="relative group">
            <textarea
              value={decisionText}
              onChange={(e) => onSetDecision(e.target.value)}
              placeholder="E.g., Stop blanket discounts for low-margin customers"
              className="w-full bg-transparent border-b border-ink-300 py-6 text-2xl md:text-3xl font-serif text-ink-900 placeholder:text-ink-300 placeholder:italic resize-none focus:outline-none focus:border-ink-900 transition-colors"
              rows={2}
            />
          </div>

          <div className="mt-16 flex justify-start">
            <button
              onClick={handleStart}
              disabled={!decisionText.trim()}
              className="group flex items-center justify-center w-24 h-24 rounded-full bg-ink-900 text-parchment-50 disabled:bg-ink-200 disabled:text-ink-400 hover:scale-[1.02] transition-all duration-300 shadow-xl"
            >
              <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
