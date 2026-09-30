import { useState, useEffect } from 'react';

export function useCountUp(end: number, duration: number = 2000, startAnimating: boolean = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startAnimating) return;
    
    let startTime: number | null = null;
    const startValue = 0;
    
    const easeOutQuart = (x: number): number => {
      return 1 - Math.pow(1 - x, 4);
    };

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const currentCount = startValue + (end - startValue) * easeOutQuart(progress);
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, startAnimating]);

  return count;
}
