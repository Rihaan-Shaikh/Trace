import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HomeScreenProps {
  onNavigate: (view: 'data' | 'investigation') => void;
  onSetDecision: (text: string) => void;
  decisionText: string;
}

export function HomeScreen({ onNavigate, onSetDecision, decisionText }: HomeScreenProps) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // The hero section takes up 200vh. We animate during the first 100vh.
      const rawProgress = window.scrollY / window.innerHeight;
      const progress = Math.min(Math.max(rawProgress, 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once on mount
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStart = () => {
    if (decisionText.trim()) {
      onNavigate('data');
    }
  };

  // Color theme: Deep Oxford Blue
  const leftBgColor = '#0B101A';

  // Animation values
  // Width of left panel goes from 100vw (100%) to 50vw (50%)
  const leftWidth = 100 - (scrollProgress * 50);

  return (
    <div className="h-[200vh] bg-parchment-100 relative">
      
      {/* Sticky Container */}
      <div className="sticky top-0 h-screen w-full flex overflow-hidden">
        
        {/* Right Block (Input) - Always on the right, taking 50% width.
            It's hidden initially by being behind the left block (or just revealed as left block shrinks) */}
        <div className="absolute top-0 right-0 h-full w-[50%] p-12 md:p-24 flex flex-col justify-center bg-parchment-100 z-0">
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

        {/* Left Block (Dark) - Starts at 100% width, shrinks to 50% */}
        <div 
          className="absolute top-0 left-0 h-full z-10 flex flex-col justify-center overflow-hidden transition-all duration-75"
          style={{ 
            width: `${leftWidth}%`, 
            backgroundColor: leftBgColor,
            boxShadow: scrollProgress > 0 ? '10px 0 50px rgba(0,0,0,0.5)' : 'none'
          }}
        >
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-[0.03]" 
               style={{ backgroundImage: 'radial-gradient(#F5F5F3 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
          />
          
          {/* Sunshine Light Source (Top Left) */}
          <div 
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-opacity duration-500"
            style={{ 
              background: 'radial-gradient(circle, rgba(255, 230, 180, 0.4) 0%, rgba(255,200,100,0) 70%)',
              opacity: 1 - scrollProgress * 0.5 // dims slightly as you scroll
            }}
          />

          {/* Background MASSIVE Slanted TRACE text with "sunshine" clipping */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <h1 
              className="font-serif italic transform -rotate-12 transition-transform duration-500"
              style={{
                fontSize: `${35 - scrollProgress * 15}vw`, // Shrinks slightly on scroll
                lineHeight: 1,
                letterSpacing: '-0.05em',
                background: 'linear-gradient(135deg, rgba(255,240,210,0.8) 0%, rgba(20,30,40,0.1) 60%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                // Add a drop shadow to emphasize the 3D light effect
                filter: 'drop-shadow(10px 20px 20px rgba(0,0,0,0.8))'
              }}
            >
              TRACE
            </h1>
          </div>
          
          {/* Foreground Tagline placed exactly on top, single line */}
          <div 
            className="relative z-20 pointer-events-none w-full flex items-center justify-center transition-all duration-75"
            style={{
              opacity: scrollProgress > 0.8 ? 1 : 0, // Fades in as it reaches the layout state
              transform: `translateY(${(1 - scrollProgress) * 50}px)`
            }}
          >
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl whitespace-nowrap text-parchment-100 tracking-tight">
              Not confidence. <span className="text-vermilion-500 italic ml-4">Coverage.</span>
            </h2>
          </div>

          {/* Initial Tagline (Fades out on scroll) */}
          <div 
            className="absolute bottom-12 left-0 w-full text-center z-20 pointer-events-none transition-opacity duration-300"
            style={{ opacity: scrollProgress > 0.1 ? 0 : 1 }}
          >
            <p className="font-mono text-xs tracking-widest text-parchment-100/50 uppercase">
              Scroll to begin
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
