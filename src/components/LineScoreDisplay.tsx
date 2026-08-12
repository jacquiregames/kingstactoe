// src/components/LineScoreDisplay.tsx
import type { GameState, PlayerColor } from '../types';
import { colorMap } from '../utils/colorUtils'; 

interface LineScoreDisplayProps {
  scores: Record<string, number>;
  playerColors: GameState['playerColors'];
  type: 'row' | 'col'; 
}

export function LineScoreDisplay({ scores, playerColors, type }: LineScoreDisplayProps) {
  const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);

  return (
    <div className={`line-score-breakdown ${type}-layout`}>
      {sortedScores.map(([player, score]) => {
        if (score === 0) return null;
        const playerColorName = playerColors[player] as PlayerColor;
        
        return (
          <span
            key={player}
            className="player-line-score"
            style={{ color: colorMap[playerColorName] }} 
          >
            {score > 0 ? `+${score}` : score}
          </span>
        );
      })}
    </div>
  );
}
