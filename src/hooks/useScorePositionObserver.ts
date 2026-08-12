// src/hooks/useScorePositionObserver.ts
import { useLayoutEffect } from "react";
type Key = string | number;

export function useScorePositionObserver({
  rowRefs,
  colRefs,
  onPositionsReady,
}: {
  rowRefs: React.MutableRefObject<Record<Key, HTMLElement | null>>;
  colRefs: React.MutableRefObject<Record<Key, HTMLElement | null>>;
  onPositionsReady: (positions: {
    rows: Record<Key, { x: number; y: number }>;
    cols: Record<Key, { x: number; y: number }>;
  }) => void;
}) {
  useLayoutEffect(() => {
    let animationFrameId: number | null = null;

    const measurePositions = () => {
      const positions: {
        rows: Record<Key, { x: number; y: number }>;
        cols: Record<Key, { x: number; y: number }>;
      } = { rows: {}, cols: {} };

      for (const key in rowRefs.current) {
        const el = rowRefs.current[key];
        if (el) {
          const rect = el.getBoundingClientRect();
          positions.rows[key] = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
      for (const key in colRefs.current) {
        const el = colRefs.current[key];
        if (el) {
          const rect = el.getBoundingClientRect();
          positions.cols[key] = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
      if (Object.keys(positions.rows).length || Object.keys(positions.cols).length) {
        onPositionsReady(positions);
      }
    };

    // Immediate first measure
    animationFrameId = requestAnimationFrame(measurePositions);

    if (typeof ResizeObserver === "undefined") {
      // No observer: at least do the first measure
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    }

    const observer = new ResizeObserver(() => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(measurePositions);
    });

    Object.values(rowRefs.current).forEach(el => el && observer.observe(el));
    Object.values(colRefs.current).forEach(el => el && observer.observe(el));

    return () => {
      observer.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [rowRefs, colRefs, onPositionsReady]);
}
