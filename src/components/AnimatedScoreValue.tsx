// src/components/AnimatedScoreValue.tsx
import { useEffect, useState, useRef } from 'react';

export function AnimatedScoreValue({ score }: { score: number }) {
  // We keep track of what number is actually on the screen
  const [displayScore, setDisplayScore] = useState(score);
  const displayScoreRef = useRef(displayScore);
  
  useEffect(() => {
    displayScoreRef.current = displayScore;
  }, [displayScore]);
  
  // Ref to store animation state so it persists across renders
  const animationRef = useRef<{ start: number; end: number; startTime: number } | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    // If the prop matches what we are displaying, do nothing
    if (score === displayScoreRef.current) return;

    // Initialize animation from CURRENT display value to NEW target value
    animationRef.current = {
      start: displayScoreRef.current,
      end: score,
      startTime: performance.now(),
    };

    const duration = 1200; // Animation duration in ms

    const animate = (time: number) => {
      if (!animationRef.current) return;
      
      const { start, end, startTime } = animationRef.current;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Calculate current frame value
      // Math.floor ensures we stick to integers
      const current = Math.floor(start + (end - start) * progress);

      setDisplayScore(current);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        // Animation finished, ensure we land exactly on the target
        setDisplayScore(score);
        animationRef.current = null;
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [score]); // Re-run whenever the parent passes a new score

  return <>{displayScore}</>;
}
