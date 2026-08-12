// src/hooks/useGameTransition.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameState } from '../types';

interface UseGameTransitionProps {
  setGameState: (state: GameState) => void;
  setGameStarted: (started: boolean) => void;
  gameStarted: boolean;
}

export function useGameTransition({ setGameState, setGameStarted, gameStarted }: UseGameTransitionProps) {
  const [videoTransition, setVideoTransition] = useState(false);
  const [transitionVideoSrc, setTransitionVideoSrc] = useState<string>('/images/background/start.mp4');
  const isTransitioningRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const transitionVideoRef = useRef<HTMLVideoElement>(null);
  const gameStartedRef = useRef(gameStarted);

  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);

  const handleTransitionEnd = useCallback(() => {
    if (!isTransitioningRef.current) return;
    setVideoTransition(false);
    setGameStarted(true);
    isTransitioningRef.current = false;
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, [setGameStarted]);

  const startVideoTransition = useCallback((state: GameState, isStart: boolean = false) => {
    if (gameStartedRef.current && isStart) return;
    if (isTransitioningRef.current) return;
    
    isTransitioningRef.current = true;
    setGameState(state);
    
    const src = isStart ? '/images/background/start.mp4' : `/images/rounds/round${state.round}.mp4`;
    setTransitionVideoSrc(src);
    setVideoTransition(true);

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    
    if (isStart) {
      // 7.9s exact timeout for the original start.mp4 animation flow
      transitionTimeoutRef.current = window.setTimeout(() => {
        handleTransitionEnd();
      }, 7900);
    } else {
      // Fallback timeout for round transition videos, relying primarily on onEnded
      transitionTimeoutRef.current = window.setTimeout(() => {
        handleTransitionEnd();
      }, 15000); 
    }
  }, [handleTransitionEnd, setGameState]);

  // Safely play/pause the transition video
  useEffect(() => {
    if (videoTransition && transitionVideoRef.current) {
      transitionVideoRef.current.currentTime = 0; // Reset video to beginning
      const playPromise = transitionVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name !== 'AbortError') console.warn("Transition video play error:", error);
        });
      }
    } else if (!videoTransition && transitionVideoRef.current) {
      transitionVideoRef.current.pause();
    }
  }, [videoTransition, transitionVideoSrc]);

  const cancelTransition = useCallback(() => {
    setVideoTransition(false);
    isTransitioningRef.current = false;
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  return {
    videoTransition,
    transitionVideoSrc,
    transitionVideoRef,
    isTransitioningRef,
    startVideoTransition,
    handleTransitionEnd,
    cancelTransition,
  };
}
