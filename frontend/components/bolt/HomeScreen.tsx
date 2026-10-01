import { ArrowRight } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface HomeScreenProps {
  onNavigate: (view: 'data' | 'investigation') => void;
  onSetDecision: (text: string) => void;
  decisionText: string;
}

export function HomeScreen({ onNavigate, onSetDecision, decisionText }: HomeScreenProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 300, y: 300 });
  const [isHovering, setIsHovering] = useState(false);
  
  const requestRef = useRef<number>();
  const targetProgress = useRef(0);
  const currentProgress = useRef(0);

  // Smooth lerp coordinates for the realistic light physics
  const targetMouse = useRef({ x: 350, y: 350 });
  const currentMouse = useRef({ x: 350, y: 350 });

  useEffect(() => {
    // Set initial position towards the center-left
    if (typeof window !== 'undefined') {
      const initX = window.innerWidth * 0.35;
      const initY = window.innerHeight * 0.45;
      targetMouse.current = { x: initX, y: initY };
      currentMouse.current = { x: initX, y: initY };
      setMousePos({ x: initX, y: initY });
    }

    const handleScroll = () => {
      const rawProgress = window.scrollY / window.innerHeight;
      targetProgress.current = Math.min(Math.max(rawProgress, 0), 1);
    };

    const animate = () => {
      // Smooth scroll progress
      currentProgress.current += (targetProgress.current - currentProgress.current) * 0.07;
      if (Math.abs(targetProgress.current - currentProgress.current) > 0.001) {
        setScrollProgress(currentProgress.current);
      }

      // Smooth mouse follow for realistic inertia
      currentMouse.current.x += (targetMouse.current.x - currentMouse.current.x) * 0.12;
      currentMouse.current.y += (targetMouse.current.y - currentMouse.current.y) * 0.12;

      setMousePos({
        x: Math.round(currentMouse.current.x * 10) / 10,
        y: Math.round(currentMouse.current.y * 10) / 10,
      });

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

  const handleMouseMove = (e: React.MouseEvent) => {
    targetMouse.current = { x: e.clientX, y: e.clientY };
    if (!isHovering) setIsHovering(true);
  };

  const handleStart = () => {
    if (decisionText.trim()) {
      onNavigate('data');
    }
  };

  // Color Interpolation (Refined Warm Editorial White / Luxury Parchment)
  const bgStart = [248, 246, 240]; // #F8F6F0 (bespoke warm luxury parchment white)
  const bgEnd = [245, 245, 243];   // #F5F5F3 (parchment-100)
  
  const colorProgress = Math.max(0, (scrollProgress - 0.6) / 0.4);
  const bgR = Math.round(bgStart[0] + (bgEnd[0] - bgStart[0]) * colorProgress);
  const bgG = Math.round(bgStart[1] + (bgEnd[1] - bgStart[1]) * colorProgress);
  const bgB = Math.round(bgStart[2] + (bgEnd[2] - bgStart[2]) * colorProgress);
  const currentBgColor = `rgb(${bgR}, ${bgG}, ${bgB})`;

  const leftWidth = 100 - (scrollProgress * 50);
  const fontSizeVW = 32 - (scrollProgress * 18);

  // ── Realistic Dynamic Light & Shadow Calculations ─────────────────────────
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;
  
  // Center of the massive TRACE display area
  const textCenterX = (screenW * (leftWidth / 100)) * 0.5;
  const textCenterY = screenH * 0.5;

  const dx = mousePos.x - textCenterX;
  const dy = mousePos.y - textCenterY;
  const dist = Math.hypot(dx, dy);
  const angleRad = Math.atan2(dy, dx);

  // Realistic cast shadow is projected in the OPPOSITE direction of the light point
  const shadowDist = Math.min(36, Math.max(8, (dist / (screenW * 0.5)) * 28));
  const shadowX = -Math.cos(angleRad) * shadowDist;
  const shadowY = -Math.sin(angleRad) * shadowDist;
  const shadowBlur = Math.min(38, Math.max(14, dist * 0.035 + 12));

  // Dynamic specular light highlight on the letters relative to cursor position
  const activeLeftWidthPx = Math.max(1, (screenW * leftWidth) / 100);
  const relCursorPctX = Math.max(0, Math.min(100, (mousePos.x / activeLeftWidthPx) * 100));
  const relCursorPctY = Math.max(0, Math.min(100, (mousePos.y / screenH) * 100));

  return (
    <div 
      className="h-[200vh] bg-parchment-100 relative cursor-none select-none"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* ── Custom Light-Source Cursor (Active ONLY on this Hero Screen) ──── */}
      <div
        className="fixed pointer-events-none z-50 transition-opacity duration-300"
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
          transform: 'translate(-50%, -50%)',
          opacity: isHovering && scrollProgress < 0.95 ? 1 : 0,
        }}
      >
        {/* Ambient atmospheric aura */}
        <div className="w-16 h-16 -m-8 rounded-full bg-brass-400/20 blur-md" />
        
        {/* Concentric precision light emitter ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-brass-600/50 shadow-[0_0_12px_rgba(180,140,50,0.25)]" />
        
        {/* Core luminous point filament */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brass-500 shadow-[0_0_10px_2px_rgba(200,160,60,0.9)]" />
      </div>

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

        {/* Left Block - Refined White/Parchment with Realistic Cursor Light */}
        <div 
          className="absolute top-0 left-0 h-full z-10 flex flex-col justify-center overflow-hidden border-r border-ink-200"
          style={{ 
            width: `${leftWidth}%`, 
            backgroundColor: currentBgColor,
            boxShadow: scrollProgress > 0.1 ? '20px 0 60px rgba(0,0,0,0.08)' : 'none',
            borderTopRightRadius: `${scrollProgress * 24}px`,
            borderBottomRightRadius: `${scrollProgress * 24}px`,
          }}
        >
          {/* Subtle architectural tactile grain texture */}
          <div 
            className="absolute inset-0 transition-opacity duration-75 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(rgba(30, 25, 20, 0.04) 1px, transparent 1px)', 
              backgroundSize: '32px 32px' 
            }} 
          />
          
          {/* ── Realistic Moving Point Source of Light (Follows Cursor) ────── */}
          <div 
            className="absolute rounded-full pointer-events-none transition-opacity duration-200"
            style={{ 
              left: `${mousePos.x - 380}px`,
              top: `${mousePos.y - 380}px`,
              width: '760px',
              height: '760px',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 232, 0.55) 30%, rgba(248, 246, 240, 0) 70%)',
              opacity: Math.max(1 - scrollProgress * 1.8, 0),
            }}
          />

          {/* Background MASSIVE Slanted TRACE text container */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            
            {/* The Illuminated TRACE text with dynamic specular reflection & shadow */}
            <h1 
              className="absolute font-serif italic transform -rotate-12 transition-all duration-75"
              style={{
                fontSize: `${fontSizeVW}vw`, 
                lineHeight: 1,
                letterSpacing: '-0.06em',
                background: `radial-gradient(circle 850px at ${relCursorPctX}% ${relCursorPctY}%, rgba(195, 150, 70, 1) 0%, rgba(135, 100, 50, 0.95) 22%, rgba(55, 45, 40, 0.92) 50%, rgba(22, 22, 26, 0.88) 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px ${shadowBlur.toFixed(1)}px rgba(45, 32, 20, 0.22)) drop-shadow(0 6px 16px rgba(0, 0, 0, 0.06))`,
                opacity: 1 - colorProgress * 0.7,
              }}
            >
              TRACE
            </h1>

          </div>
          
          {/* Foreground Tagline placed on top */}
          <div 
            className="relative z-20 pointer-events-none w-full flex items-center justify-center"
            style={{
              opacity: scrollProgress > 0.8 ? (scrollProgress - 0.8) * 5 : 0, 
              transform: `translate(-1.5rem, calc(2.5rem + ${(1 - scrollProgress) * 60}px))`
            }}
          >
            <h2 
              className="font-serif text-2xl md:text-3xl lg:text-4xl whitespace-nowrap tracking-tight text-ink-900"
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
            >
              Not confidence. <span className="text-vermilion-500 italic ml-4 drop-shadow-sm">Coverage.</span>
            </h2>
          </div>

          {/* Initial Tagline / Scroll prompt */}
          <div 
            className="absolute bottom-12 left-0 w-full text-center z-20 pointer-events-none"
            style={{ 
              opacity: Math.max(1 - scrollProgress * 4, 0),
              transform: `translateY(${scrollProgress * 20}px)`
            }}
          >
            <p className="font-mono text-xs tracking-widest text-ink-400 uppercase">
              Move cursor to illuminate · Scroll to begin
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
