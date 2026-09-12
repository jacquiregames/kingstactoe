// src/components/GameOverModal.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Confetti from "react-confetti";
import type { GameState } from "../types";

interface GameOverModalProps {
  gameState: GameState;
  onReset: () => void;
}

export function GameOverModal({ gameState, onReset }: GameOverModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const [showConfetti, setShowConfetti] = useState(!shouldReduceMotion);
  const [animatedPlayers, setAnimatedPlayers] = useState<
    { name: string; scoresByRound: (number | null)[] }[]
  >([]);

  useEffect(() => {
    setAnimatedPlayers(
      gameState.players.map(player => ({
        name: player,
        scoresByRound: [null, null, null],
      }))
    );

    gameState.players.forEach(player => {
      gameState.allRoundScores[player].forEach((roundScore, roundIdx) => {
        setTimeout(() => {
          setAnimatedPlayers(prev =>
            prev.map(p => {
              if (p.name === player) {
                const newScores = [...p.scoresByRound];
                newScores[roundIdx] = roundScore;
                return { ...p, scoresByRound: newScores };
              }
              return p;
            })
          );
        }, (roundIdx + 1) * 1200);
      });
    });

    const timer = setTimeout(() => setShowConfetti(false), 8000);
    return () => clearTimeout(timer);
  }, [gameState]);

  const winnerName = Object.entries(gameState.totalScores).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  return (
    <div className="player-actions gameover-container">
      {showConfetti && <Confetti recycle={false} numberOfPieces={400} />}

      <div className="podium-container">
        <img src="/images/podium.webp" alt="Winner's Podium" className="podium-image" />
        <div className="crown-container">
          <img src="/images/stones/crown.webp" alt="Winner's Crown" className="crown-image" />
        </div>
        <div className="winner-banner">
          {winnerName}
        </div>
      </div>

      <h2 className="shimmer-text gameover-title" data-text="Final Scores">
        Final Scores
      </h2>
      <table className="gameover-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Round 1</th>
            <th>Round 2</th>
            <th>Round 3</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {animatedPlayers.map(player => {
            const isWinner = player.name === winnerName;
            return (
              <tr key={player.name} className={isWinner ? "winner-row" : ""}>
                <td>{player.name}</td>
                {player.scoresByRound.map((score, idx) => (
                  <td key={idx}>
                    <AnimatePresence>
                      {score !== null && (
                        <motion.span
                          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
                          transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
                        >
                          {score}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </td>
                ))}
                <td>
                  <strong>{gameState.totalScores[player.name]}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button type="button" className="play-again-btn" onClick={onReset}>
        🔄 Play Again
      </button>
    </div>
  );
}
