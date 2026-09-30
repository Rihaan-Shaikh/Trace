import { ArrowRight } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface HomeScreenProps {
  onNavigate: (view: 'data' | 'investigation') => void;
  onSetDecision: (text: string) => void;
  decisionText: string;
}

export function HomeScreen({ onNavigate, onSetDecision, decisionText }: HomeScreenProps) {
  // We store the raw scroll progress
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Refs for smooth animation (LERP)
  const requestRef = useRef<number>();
  const targetProgress = useRef(0);
  const currentProgress = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      // The hero section takes up 200vh. We animate during the first 100vh.
      const rawProgress = window.scrollY / window.innerHeight;
      targetProgress.current = Math.min(Math.max(rawProgress, 0), 1);
    };

    const animate = () => {
      // LERP formula for buttery smooth inertia
      currentProgress.current += (targetProgress.current - currentProgress.current) * 0.07;
      
      // Only trigger re-render if there's a meaningful change
      if (Math.abs(targetProgress.current - currentProgress.current) > 0.001) {
        setScrollProgress(currentProgress.current);
      }
      
      requestRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    requestRef.current = requestAnimationFrame(animate);
    
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleStart = () => {
    if (decisionText.trim()) {
      onNavigate('data');
    }
  };

  // Color theme: Deep Oxford Blue
  const leftBgColor = '#0B101A';

  // Animation values based on the smoothly interpolated scrollProgress
  // Width of left panel goes from 100vw (100%) to 50vw (50%)
  const leftWidth = 100 - (scrollProgress * 50);
  
  // Font size goes from 30vw to 12vw so it fits perfectly in the 50% block
  const fontSizeVW = 30 - (scrollProgress * 18);

  return (
    <div className="h-[200vh] bg-parchment-100 relative">
      
      {/* Sticky Container */}
      <div className="sticky top-0 h-screen w-full flex overflow-hidden">
        
        {/* Right Block (Input) - Always on the right, taking 50% width. */}
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
                className="group flex items-center justify-center w-24 h-24 rounded-full bg-ink-900 text-parchment-50 disabled:bg-ink-200 disabled:text-ink-400 hover:scale-[1.02] transition-all duration-500 shadow-xl"
              >
                <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Left Block (Dark) - Starts at 100% width, shrinks to 50% smoothly */}
        <div 
          className="absolute top-0 left-0 h-full z-10 flex flex-col justify-center overflow-hidden border-r border-ink-800/30"
          style={{ 
            width: `${leftWidth}%`, 
            backgroundColor: leftBgColor,
            boxShadow: scrollProgress > 0.1 ? '20px 0 60px rgba(0,0,0,0.6)' : 'none',
            // Add a tiny bit of border radius when it shrinks for a premium feel
            borderTopRightRadius: `${scrollProgress * 24}px`,
            borderBottomRightRadius: `${scrollProgress * 24}px`,
          }}
        >
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-[0.03]" 
               style={{ backgroundImage: 'radial-gradient(#F5F5F3 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
          />
          
          {/* Sunshine Light Source (Top Left) */}
          <div 
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
            style={{ 
              background: 'radial-gradient(circle, rgba(255, 240, 200, 0.25) 0%, rgba(255,200,100,0) 70%)',
              opacity: 1 - scrollProgress * 0.4
            }}
          />

          {/* Background MASSIVE Slanted TRACE text with extended "sunshine" clipping */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <h1 
              className="font-serif italic transform -rotate-12"
              style={{
                fontSize: `${fontSizeVW}vw`, 
                lineHeight: 1,
                letterSpacing: '-0.06em',
                // Extended gradient so light hits the C and E
                background: 'linear-gradient(135deg, rgba(255,245,220,1) 0%, rgba(255,220,170,0.6) 35%, rgba(150,160,170,0.2) 70%, rgba(20,30,40,0.05) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(8px 15px 25px rgba(0,0,0,0.9))'
              }}
            >
              TRACE
            </h1>
          </div>
          
          {/* Foreground Tagline placed exactly on top, slightly left and lower */}
          <div 
            className="relative z-20 pointer-events-none w-full flex items-center justify-center"
            style={{
              opacity: scrollProgress > 0.8 ? (scrollProgress - 0.8) * 5 : 0, 
              // Moving it a little left (-2rem) and a little low (3rem)
              transform: `translate(-2rem, calc(3rem + ${(1 - scrollProgress) * 60}px))`
            }}
          >
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl whitespace-nowrap text-parchment-100 tracking-tight drop-shadow-2xl">
              Not confidence. <span className="text-vermilion-500 italic ml-4">Coverage.</span>
            </h2>
          </div>

          {/* Initial Tagline (Fades out smoothly on scroll) */}
          <div 
            className="absolute bottom-12 left-0 w-full text-center z-20 pointer-events-none"
            style={{ 
              opacity: Math.max(1 - scrollProgress * 4, 0),
              transform: `translateY(${scrollProgress * 20}px)`
            }}
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
