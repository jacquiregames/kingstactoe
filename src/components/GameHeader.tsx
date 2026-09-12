// src/components/GameHeader.tsx
import React from 'react';
import { AnimatedScoreValue } from './AnimatedScoreValue';
import { getTileImagePath } from '../utils';
import type { GameState, PlayerColor } from '../types';
import { colorMap, lightColorMap } from '../utils/colorUtils';

interface GameHeaderProps {
  gameState: GameState;
  playerName: string;
  scoreRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  poppedPlayers: Set<string>;
  animatedScores: Record<string, number> | null;
  isAnimatingScores: boolean;
  onShowHowToPlay: () => void; 
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  gameState,
  playerName,
  scoreRefs,
  poppedPlayers,
  animatedScores,
  isAnimatingScores,
  onShowHowToPlay  
}) => {
  const currentPlayerColorName = gameState.playerColors[gameState.currentPlayer] as PlayerColor;
  const currentPlayerHex = colorMap[currentPlayerColorName] ?? '#ccc';
 
  const roundImageSrc = gameState.isGameOver 
    ? '/images/rounds/game_over.webp' 
    : `/images/rounds/round${gameState.round}.webp`;

  const playedTiles = new Set<string>();
  gameState.board.forEach(row => {
    row.forEach(cell => {
      // Add any tile on the board to the played set (excluding castles)
      if (cell && !cell.toLowerCase().includes('castle')) {
        playedTiles.add(cell.toLowerCase());
      }
    });
  });

  return (
    <header 
      className={`game-header ${
        gameState.currentPlayer === playerName ? 'pulse-border' : ''
      }`}
      style={{ border: `3px solid ${currentPlayerHex}`, '--pulse-color': currentPlayerHex } as React.CSSProperties}
    >
      <div className="header-info-blocks">
        <button type="button" className="header-help-btn" onClick={onShowHowToPlay} title="How to Play">
          <img src="/images/buttons/howtoplay.webp" alt="Help" />
        </button>
        <div className="info-block round-info-block transparent-bg">
          <img
            src={roundImageSrc} 
            alt={gameState.isGameOver ? "Game Over" : `Round ${gameState.round}`}
            className="round-image"
          />
        </div>

      </div>

      <ul className="header-player-list">
        {gameState.players.map((player: string) => {
          const playerColorName = gameState.playerColors[player] as PlayerColor;
          const playerHexColor = colorMap[playerColorName] ?? '#ccc';
          const playerLightHexColor = lightColorMap[playerColorName] ?? '#fff';
          const playerCastles = gameState.playerCastles[player] || [];

          const sortedCastles = [...playerCastles].sort((a, b) => {
            const rankA = parseInt(a.match(/R(\d)/)?.[1] || '0');
            const rankB = parseInt(b.match(/R(\d)/)?.[1] || '0');
            return rankA - rankB;
          });
          
          const scoreToDisplay = isAnimatingScores && animatedScores
            ? (animatedScores[player] ?? gameState.totalScores[player])
            : (gameState.totalScores[player] ?? 0);

          return (
            <li
              key={player}
              className={`header-player-item ${
                gameState.currentPlayer === player ? 'pulse-border' : ''
              }`}
              style={{ border: `3px solid ${playerHexColor}` }}
            >
              <img
                src={`/images/flames/${playerColorName}_flame.webp`}
                alt={`${playerColorName} flame`}
                className="player-flame-overlay"
              />
              <div className="player-info-row">
                <img
                  src={`/images/stones/${playerColorName}.webp`}
                  alt={`${playerColorName} stone`}
                  className={`player-stone-icon ${
                    gameState.currentPlayer === player ? 'glowing-stone' : ''
                  }`}
                />
                {gameState.playerHoleTiles[player] && (
                  <img
                    src="/images/icons/hole.webp"
                    alt="Hole Tile Available"
                    className="player-hole-tile"
                    title="Hole tile available"
                  />
                )}
                <div className="player-info-name">
                  <span>{player}</span>
                  {gameState.playerIsBot?.[player] && (
                    <span className="player-bot-badge" title="Computer opponent">🤖</span>
                  )}
                </div>
                <div
                  ref={(el) => (scoreRefs.current[player] = el)}
                  className={`player-info-score ${
                    poppedPlayers.has(player) ? 'score-pop-landing' : ''
                  }`}
                  style={{ color: playerLightHexColor }}
                >
                  <AnimatedScoreValue score={scoreToDisplay} />
                </div>
              </div>

              <div className="header-castle-inventory">
                {sortedCastles.map(castle => {
                  const imagePath = getTileImagePath(castle); 
                  return imagePath ? (
                    <img
                      key={castle}
                      src={imagePath}
                      alt={castle}
                      className="header-castle-icon"
                    />
                  ) : null;
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="tile-info-block">
        <div className="tile-tracker">
          {/* Row 1: Bag count + Special Tiles */}
          <div className="tracker-bag-count" title="Tiles Left in Bag">{gameState.tilesInBag}</div>
          {['wizard', 'goldmine', 'dragon', 'mounta', 'mountb'].map(t => (
            <img key={t} src={`/images/icons/${t}.webp`} className={`tracker-icon ${playedTiles.has(t) ? 'played' : ''}`} alt={t} />
          ))}
          {/* Row 2: Minus Tiles */}
          {[1, 2, 3, 4, 5, 6].map(n => `minus${n}`).map(t => (
            <img key={t} src={`/images/icons/${t}.webp`} className={`tracker-icon ${playedTiles.has(t) ? 'played' : ''}`} alt={t} />
          ))}
          {/* Row 3: Plus "a" Tiles */}
          {[1, 2, 3, 4, 5, 6].map(n => `plus${n}a`).map(t => (
            <img key={t} src={`/images/icons/${t}.webp`} className={`tracker-icon ${playedTiles.has(t) ? 'played' : ''}`} alt={t} />
          ))}
          {/* Row 4: Plus "b" Tiles */}
          {[1, 2, 3, 4, 5, 6].map(n => `plus${n}b`).map(t => (
            <img key={t} src={`/images/icons/${t}.webp`} className={`tracker-icon ${playedTiles.has(t) ? 'played' : ''}`} alt={t} />
          ))}
        </div>
      </div>

      <div
        className={`turn-indicator ${
          gameState.currentPlayer === playerName ? 'active pulse-border' : ''
        }`}
        style={{ border: `3px solid ${currentPlayerHex}`, '--pulse-color': currentPlayerHex } as React.CSSProperties}
      >
        <img
          src={`/images/stones/${currentPlayerColorName}.webp`}
          alt={`${currentPlayerColorName} stone`}
          className={`turn-indicator-stone ${
            gameState.currentPlayer === playerName ? 'glowing-stone' : ''
          }`}
        />
      </div>
    </header>
  );
};
