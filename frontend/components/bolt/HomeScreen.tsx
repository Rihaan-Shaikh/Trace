import { ArrowRight } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface HomeScreenProps {
  onNavigate: (view: 'data' | 'investigation') => void;
  onSetDecision: (text: string) => void;
  decisionText: string;
}

export function HomeScreen({ onNavigate, onSetDecision, decisionText }: HomeScreenProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const requestRef = useRef<number>();
  const targetProgress = useRef(0);
  const currentProgress = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const rawProgress = window.scrollY / window.innerHeight;
      targetProgress.current = Math.min(Math.max(rawProgress, 0), 1);
    };

    const animate = () => {
      currentProgress.current += (targetProgress.current - currentProgress.current) * 0.07;
      if (Math.abs(targetProgress.current - currentProgress.current) > 0.001) {
        setScrollProgress(currentProgress.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    requestRef.current = requestAnimationFrame(animate);
    
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

  // Color Interpolation (Oxford Blue to Parchment)
  const bgStart = [11, 16, 26]; // #0B101A
  const bgEnd = [245, 245, 243]; // #F5F5F3 (parchment-100)
  
  const bgR = Math.round(bgStart[0] + (bgEnd[0] - bgStart[0]) * scrollProgress);
  const bgG = Math.round(bgStart[1] + (bgEnd[1] - bgStart[1]) * scrollProgress);
  const bgB = Math.round(bgStart[2] + (bgEnd[2] - bgStart[2]) * scrollProgress);
  const currentBgColor = `rgb(${bgR}, ${bgG}, ${bgB})`;

  // Tagline color goes from Parchment (245,245,243) to Oxford Blue (11,16,26)
  const textR = Math.round(bgEnd[0] + (bgStart[0] - bgEnd[0]) * scrollProgress);
  const textG = Math.round(bgEnd[1] + (bgStart[1] - bgEnd[1]) * scrollProgress);
  const textB = Math.round(bgEnd[2] + (bgStart[2] - bgEnd[2]) * scrollProgress);
  const currentTextColor = `rgb(${textR}, ${textG}, ${textB})`;

  const leftWidth = 100 - (scrollProgress * 50);
  
  // TRACE font size stays massive. Shrinks from 30vw to 22vw
  const fontSizeVW = 30 - (scrollProgress * 8);

  return (
    <div className="h-[200vh] bg-parchment-100 relative">
      <div className="sticky top-0 h-screen w-full flex overflow-hidden">
        
        {/* Right Block (Input) */}
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

        {/* Left Block - Animates background color and width */}
        <div 
          className="absolute top-0 left-0 h-full z-10 flex flex-col justify-center overflow-hidden border-r border-ink-800/20"
          style={{ 
            width: `${leftWidth}%`, 
            backgroundColor: currentBgColor,
            boxShadow: scrollProgress > 0.1 ? '20px 0 60px rgba(0,0,0,0.2)' : 'none',
            borderTopRightRadius: `${scrollProgress * 24}px`,
            borderBottomRightRadius: `${scrollProgress * 24}px`,
          }}
        >
          {/* Grid texture fades out slightly as it gets lighter */}
          <div className="absolute inset-0 transition-opacity duration-75" 
               style={{ 
                 backgroundImage: `radial-gradient(${scrollProgress > 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'} 1px, transparent 1px)`, 
                 backgroundSize: '32px 32px' 
               }} 
          />
          
          {/* Sunshine Light Source fades out */}
          <div 
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
            style={{ 
              background: 'radial-gradient(circle, rgba(255, 240, 200, 0.25) 0%, rgba(255,200,100,0) 70%)',
              opacity: Math.max(1 - scrollProgress * 2, 0)
            }}
          />

          {/* Background MASSIVE Slanted TRACE text container */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            
            {/* Layer 1: The original Sunshine text (fades out) */}
            <h1 
              className="absolute font-serif italic transform -rotate-12 transition-opacity"
              style={{
                fontSize: `${fontSizeVW}vw`, 
                lineHeight: 1,
                letterSpacing: '-0.06em',
                background: 'linear-gradient(135deg, rgba(255,245,220,1) 0%, rgba(255,220,170,0.6) 35%, rgba(150,160,170,0.2) 70%, rgba(20,30,40,0.05) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(8px 15px 25px rgba(0,0,0,0.9))',
                opacity: 1 - scrollProgress
              }}
            >
              TRACE
            </h1>

            {/* Layer 2: The dark Oxford Blue text (fades in) */}
            <h1 
              className="absolute font-serif italic transform -rotate-12 transition-opacity"
              style={{
                fontSize: `${fontSizeVW}vw`, 
                lineHeight: 1,
                letterSpacing: '-0.06em',
                color: '#0B101A',
                opacity: scrollProgress,
                filter: 'drop-shadow(4px 10px 15px rgba(0,0,0,0.1))'
              }}
            >
              TRACE
            </h1>

          </div>
          
          {/* Foreground Tagline placed exactly on top */}
          <div 
            className="relative z-20 pointer-events-none w-full flex items-center justify-center"
            style={{
              opacity: scrollProgress > 0.8 ? (scrollProgress - 0.8) * 5 : 0, 
              transform: `translate(-1.5rem, calc(2.5rem + ${(1 - scrollProgress) * 60}px))`
            }}
          >
            <h2 
              className="font-serif text-3xl md:text-4xl lg:text-5xl whitespace-nowrap tracking-tight"
              style={{ color: currentTextColor, textShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            >
              Not confidence. <span className="text-vermilion-500 italic ml-4 drop-shadow-sm">Coverage.</span>
            </h2>
          </div>

          {/* Initial Tagline */}
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
