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
    let isMounted = true;
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

  // As scrollProgress goes from 0 -> 1, scale increases massively
  const scale = 1 + scrollProgress * 30; // zoom into the text
  const maskOpacity = Math.max(0, 1 - scrollProgress * 1.5); // fade out mask entirely near end
  
  const opacityTextForm = scrollProgress > 0.3 ? Math.min(1, (scrollProgress - 0.3) * 3) : 0;

  return (
    <div className="h-[250vh] bg-parchment-100 relative select-none">
      
      {/* 
        Fixed full-screen container that holds our zooming text.
        We'll use a simple CSS transform to perfectly center it without React hydration jitter.
      */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden bg-white">
        
        {/* The massive background TRACE text, zooming into the user */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <g style={{ transform: `translate(50vw, 50vh) scale(${scale}) rotate(-12deg)` }}>
              <text 
                x="-1.5vw" y="0" dy=".35em"
                textAnchor="middle" 
                fontFamily="var(--font-serif)" 
                fontStyle="italic"
                fontWeight="bold"
                fontSize="28vw"
                fill="#9ca3af" /* medium grey text */
              >
                TRACE
              </text>
            </g>
          </svg>
        </div>

        {/* Foreground Input Area that fades in as user scrolls through the door */}
        <div 
          className="relative z-50 w-full max-w-2xl px-6 pointer-events-auto mx-auto"
          style={{ 
            opacity: opacityTextForm,
            transform: `translateY(${(1 - opacityTextForm) * 30}px)`
          }}
        >
          <div className="flex flex-col">
              <h2 className="font-serif text-3xl md:text-5xl text-ink-900 mb-8 leading-[1.1] tracking-tight">
                What are you willing to be wrong about?
              </h2>
              <div className="relative group w-full">
                <textarea
                  value={decisionText}
                  onChange={(e) => onSetDecision(e.target.value)}
                  placeholder="E.g., Stop blanket discounts for low-margin customers"
                  className="w-full bg-transparent border-b border-ink-300 py-4 text-xl md:text-2xl font-serif text-ink-900 placeholder:text-ink-300 placeholder:italic resize-none focus:outline-none focus:border-ink-900 transition-colors"
                  rows={2}
                />
              </div>
              <div className="mt-12 flex justify-start">
                <button
                  onClick={handleStart}
                  disabled={!decisionText.trim()}
                  className="group flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-ink-900 text-parchment-50 disabled:bg-ink-200 disabled:text-ink-400 hover:scale-[1.02] transition-all duration-500 shadow-xl"
                >
                  <ArrowRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}