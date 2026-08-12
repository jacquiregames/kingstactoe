// src/hooks/useScoringAnimation.ts

import { useEffect, useRef } from 'react';
import type { GameState, FinalLineScores, ScoringStep } from '../types';

interface FlyingScore {
  id: number;
  text: string;
  color: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ScoringAnimationOptions {
  isAnimatingScores: boolean;
  gameState: GameState;
  playerScorePositions: Record<string, { x: number; y: number }>;
  lineScorePositions: {
    rows: Record<number, { x: number; y: number }>;
    cols: Record<number, { x: number; y: number }>;
  };
  onSetHighlighted:        (cells: { r: number; c: number }[] | null) => void;
  onSetTargetScores:       (scores: Record<string, number> | null) => void;
  onSetRevealedLineScores: (updater: (prev: FinalLineScores | null) => FinalLineScores | null) => void;
  onSetFlyingScores:       (updater: (prev: FlyingScore[]) => FlyingScore[]) => void;
  onClearFlyingScore:      (id: number) => void;
  onSetPoppedPlayers:      (updater: (prev: Set<string>) => Set<string>) => void;
  onAnimationComplete:     (wasRound3: boolean) => Promise<void>;
}

const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

export function useScoringAnimation({
  isAnimatingScores,
  gameState,
  playerScorePositions,
  lineScorePositions,
  onSetHighlighted,
  onSetTargetScores,
  onSetRevealedLineScores,
  onSetFlyingScores,
  onClearFlyingScore,
  onSetPoppedPlayers,
  onAnimationComplete,
}: ScoringAnimationOptions) {
  // Keep all callbacks and data in refs so the async closure never goes stale.
  const refs = useRef({
    onSetHighlighted,
    onSetTargetScores,
    onSetRevealedLineScores,
    onSetFlyingScores,
    onClearFlyingScore,
    onSetPoppedPlayers,
    onAnimationComplete,
    playerScorePositions,
    lineScorePositions,
    gameState,
  });

  // Sync refs every render (cheap, no effect re-run)
  refs.current = {
    onSetHighlighted,
    onSetTargetScores,
    onSetRevealedLineScores,
    onSetFlyingScores,
    onClearFlyingScore,
    onSetPoppedPlayers,
    onAnimationComplete,
    playerScorePositions,
    lineScorePositions,
    gameState,
  };

  const playerAnchorCount =  Object.keys(playerScorePositions).length;
  const lineAnchorCount =
    Object.keys(lineScorePositions.rows).length +
    Object.keys(lineScorePositions.cols).length;

  useEffect(() => {
    if (!isAnimatingScores) return;

    const r = refs.current;
    const gs = r.gameState;

    if (!gs.scoringSequence.length) return;
    if (!playerAnchorCount || !lineAnchorCount) return;

    let isCancelled = false;

    const run = async () => {
      // Snapshot everything at animation start
      const snapPlayerPos = { ...r.playerScorePositions };
      const snapLinePos   = {
        rows: { ...r.lineScorePositions.rows },
        cols: { ...r.lineScorePositions.cols },
      };

      const startOfRoundScores: Record<string, number> = {};
      for (const p of gs.players) {
        startOfRoundScores[p] = gs.totalScores[p] - (gs.lastRoundScores[p] || 0);
      }

      r.onSetTargetScores(startOfRoundScores);
      r.onSetRevealedLineScores(() => ({ rows: {}, cols: {} }));

      await delay(1500);
      if (isCancelled) return;

      let runningTotals = { ...startOfRoundScores };

      for (const step of gs.scoringSequence as ScoringStep[]) {
        if (isCancelled) break;

        const cells =
          step.type === 'row'
            ? Array.from({ length: 6 }, (_, i) => ({ r: step.index, c: i }))
            : Array.from({ length: 5 }, (_, i) => ({ r: i, c: step.index }));
        r.onSetHighlighted(cells);

        const startPos =
          step.type === 'row'
            ? snapLinePos.rows[step.index]
            : snapLinePos.cols[step.index];

        const lineScores: Record<string, number> = {};
        step.castles.forEach(c => {
          lineScores[c.owner] = (lineScores[c.owner] || 0) + c.score;
        });

        r.onSetRevealedLineScores(prev => {
          const next = { rows: { ...(prev?.rows ?? {}) }, cols: { ...(prev?.cols ?? {}) } };
          if (step.type === 'row') next.rows[step.index] = lineScores;
          else                     next.cols[step.index] = lineScores;
          return next;
        });

        await delay(500);
        if (isCancelled) break;

        const flyInDuration = 1400;
        step.castles.forEach(castle => {
          const endPos = snapPlayerPos[castle.owner];
          if (startPos && endPos && castle.score !== 0) {
            const flyer: FlyingScore = {
              id:     Date.now() + Math.random(),
              text:   castle.score > 0 ? `+${castle.score}` : `${castle.score}`,
              color:  gs.playerColors[castle.owner],
              startX: startPos.x, startY: startPos.y,
              endX:   endPos.x,   endY:   endPos.y,
            };
            r.onSetFlyingScores(prev => [...prev, flyer]);
            setTimeout(() => r.onClearFlyingScore(flyer.id), flyInDuration);
          }
        });

        await delay(flyInDuration * 0.75);
        if (isCancelled) break;

        const newTotals = { ...runningTotals };
        step.castles.forEach(c => { newTotals[c.owner] = (newTotals[c.owner] || 0) + c.score; });
        r.onSetTargetScores(newTotals);
        r.onSetPoppedPlayers(prev => {
          const next = new Set(prev);
          step.castles.forEach(c => next.add(c.owner));
          return next;
        });
        runningTotals = { ...newTotals };

        setTimeout(() => {
          r.onSetPoppedPlayers(prev => {
            const next = new Set(prev);
            step.castles.forEach(c => next.delete(c.owner));
            return next;
          });
        }, 400);

        await delay(1250);
      }

      if (!isCancelled) {
        r.onSetTargetScores(null);
        r.onSetHighlighted(null);
        r.onSetFlyingScores(() => []);
        await r.onAnimationComplete(gs.round >= 3);
      }
    };

    run();
    return () => { isCancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimatingScores, playerAnchorCount, lineAnchorCount]);
}
