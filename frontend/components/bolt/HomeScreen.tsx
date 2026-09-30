import { ArrowRight } from 'lucide-react';

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
    <div className="h-screen flex flex-col md:flex-row relative bg-parchment-100 overflow-hidden">
      
      {/* Left Block (Dark) - 50% width */}
      <div className="md:w-1/2 bg-[#0A0A0C] relative flex flex-col justify-center overflow-hidden p-12 md:p-16">
        
        {/* Subtle texture/grid */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(#F5F5F3 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
        />
        
        {/* Background MASSIVE TRACE text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07] select-none">
          <h1 className="font-serif text-[28vw] md:text-[18vw] leading-none tracking-tighter text-parchment-100">
            TRACE
          </h1>
        </div>
        
        {/* Foreground Tagline placed ON TOP of TRACE */}
        <div className="relative z-10 pointer-events-none w-full flex flex-col justify-center h-full">
          <h2 className="font-serif text-5xl md:text-7xl text-parchment-100 leading-[1.1] tracking-tight opacity-90 text-left">
            Not confidence. <br/>
            <span className="text-vermilion-500 italic block mt-2">Coverage.</span>
          </h2>
        </div>
      </div>

      {/* Right Block (Input) - 50% width */}
      <div className="md:w-1/2 p-12 md:p-24 flex flex-col justify-center relative bg-parchment-100">
        <div className="w-full">
          
          <h2 className="font-serif text-5xl md:text-6xl text-ink-900 mb-12 leading-[1.1] tracking-tight">
            What are you willing to be wrong about?
          </h2>

          <div className="relative group w-full">
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
