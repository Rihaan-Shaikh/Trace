with open('frontend/components/bolt/HomeScreen.tsx', 'w', encoding='utf-8') as f:
  f.write('''import { ArrowRight } from 'lucide-react';
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
          className="relative z-50 w-full max-w-2xl px-6 pointer-events-auto"
          style={{ 
            opacity: opacityTextForm,
            transform: `translateY(${(1 - opacityTextForm) * 30}px)`
          }}
        >
          <h2 className="text-4xl md:text-5xl font-serif text-ink-900 mb-8 tracking-tight text-center">
            What is the decision?
          </h2>
          <div className="relative group">
            <div className="absolute inset-0 bg-ink-900/5 rounded-sm blur-md group-hover:bg-ink-900/10 transition-colors" />
            <div className="relative bg-white border border-ink-200 p-2 rounded-sm shadow-sm flex items-center">
              <input
                type="text"
                autoFocus
                className="w-full bg-transparent border-none text-xl md:text-2xl font-serif text-ink-900 px-4 py-3 placeholder:text-ink-300 focus:outline-none focus:ring-0"
                placeholder="e.g. Stop blanket discounts for low-margin customers."
                value={decisionText}
                onChange={(e) => onSetDecision(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStart();
                }}
              />
              <button
                onClick={handleStart}
                disabled={!decisionText.trim()}
                className="flex items-center justify-center w-14 h-14 bg-ink-900 text-white rounded-sm disabled:bg-ink-200 disabled:text-ink-400 hover:bg-vermilion-600 transition-colors shrink-0"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}''')
