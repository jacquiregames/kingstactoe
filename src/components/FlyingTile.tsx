// src/components/FlyingTile.tsx
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface FlyingTileProps {
  imgSrc: string;
  startRect: DOMRect;
  endRect: DOMRect;
  onAnimationComplete: () => void;
}

export const FlyingTile: React.FC<FlyingTileProps> = ({ 
  imgSrc, 
  startRect, 
  endRect, 
  onAnimationComplete 
}) => {
  // Best Practice: Calculate scale ratios instead of animating width/height directly
  const scaleX = endRect.width / startRect.width;
  const scaleY = endRect.height / startRect.height;

  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        // Lock the initial dimensions to the starting size
        width: startRect.width,
        height: startRect.height,
        // Crucial: Set origin to top-left so X and Y map perfectly to DOMRect coordinates
        transformOrigin: 'top left',
        // Hooking into the new CSS Variable from base.css
        zIndex: 'var(--z-flying-tiles, 2000)',
        pointerEvents: 'none',
      }}
      initial={{
        x: startRect.left,
        y: startRect.top,
        scaleX: 1,
        scaleY: 1,
      }}
      animate={{
        x: endRect.left,
        y: endRect.top,
        scaleX: scaleX,
        scaleY: scaleY,
      }}
      transition={{
        // Reduced motion: jump straight to the end state instead of flying
        // across the screen. Duration 0 still fires onAnimationComplete,
        // so the callback that removes/settles the tile still runs.
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: 'easeInOut',
      }}
      onAnimationComplete={onAnimationComplete}
    >
      <img 
        src={imgSrc} 
        alt="Flying Tile" 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
      />
    </motion.div>
  );
};
