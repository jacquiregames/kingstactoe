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
    ? '/images/rounds/game_over.png' 
    : `/images/rounds/round${gameState.round}.png`;

  return (
    <header 
      className="game-header"
      style={{ borderBottomColor: currentPlayerHex }}
    >
      <div className="header-info-blocks">
        <div className="info-block round-info-block transparent-bg">
          <img
            src={roundImageSrc} 
            alt={gameState.isGameOver ? "Game Over" : `Round ${gameState.round}`}
            className="round-image"
          />
        </div>
        <button type="button" className="header-help-btn" onClick={onShowHowToPlay} title="How to Play">
          <img src="/images/buttons/howtoplay.png" alt="Help" />
        </button>
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
                src={`/images/flames/${playerColorName}_flame.gif`}
                alt={`${playerColorName} flame`}
                className="player-flame-overlay"
              />
              <div className="player-info-row">
                <img
                  src={`/images/stones/${playerColorName}.png`}
                  alt={`${playerColorName} stone`}
                  className={`player-stone-icon ${
                    gameState.currentPlayer === player ? 'glowing-stone' : ''
                  }`}
                />
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
        <span className="info-block-label">Tiles Left</span>
        <span className="info-block-value">🛍️ {gameState.tilesInBag}</span>
      </div>

      <div
        className={`turn-indicator ${
          gameState.currentPlayer === playerName ? 'active pulse-border' : ''
        }`}
        style={{ border: `3px solid ${currentPlayerHex}` }}
      >
        <img
          src={`/images/stones/${currentPlayerColorName}.png`}
          alt={`${currentPlayerColorName} stone`}
          className={`turn-indicator-stone ${
            gameState.currentPlayer === playerName ? 'glowing-stone' : ''
          }`}
        />
        <div className="turn-text">
          {gameState.currentPlayer === playerName
            ? 'Your Turn'
            : `${gameState.currentPlayer}'s Turn`}
        </div>
      </div>
    </header>
  );
};
