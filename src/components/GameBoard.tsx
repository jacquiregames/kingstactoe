// src/components/GameBoard.tsx
import { useState, useRef, useEffect, useMemo } from "react";
import type { GameState, PlayerColor, SelectedPiece, CellCoord, FinalLineScores } from "../types";
import { getTileImagePath } from "../utils";
import { SpecialTileBorders } from "./SpecialTileBorders";
import { LineScoreDisplay } from "./LineScoreDisplay";
import { getLiveRowContribution, getLiveColContribution } from "../utils/liveLineContrib";
import { useScorePositionObserver } from "../hooks/useScorePositionObserver";
import { colorMap } from '../utils/colorUtils'; 

interface GameBoardProps {
  gameState: GameState;
  playerName: string;
  highlightedCells: CellCoord[] | null;
  lastPlaced: CellCoord | null;
  onPlaceOnBoard: (row: number, col: number) => void;
  hoveredCell: CellCoord | null;
  setHoveredCell: (cell: CellCoord | null) => void;
  selectedPiece: SelectedPiece;
  boardShake: boolean;
  isMyTurn: boolean;
  isAnimatingScores: boolean;
  revealedLineScores: FinalLineScores | null;
  boardFlash: { color: string; key: number } | null; 
  lastMove: {row: number, col: number} | null;
  onLineScorePositionsReady: (positions: { rows: Record<number, { x: number, y: number }>, cols: Record<number, { x: number, y: number }> }) => void;
  onTileHover: (tile: string | null) => void;
  boardCellRefs: { [key: string]: HTMLElement | null };
}

export function GameBoard({
  gameState,
  playerName,
  highlightedCells,
  lastPlaced,
  onPlaceOnBoard,
  hoveredCell,
  setHoveredCell,
  selectedPiece,
  boardShake,
  isMyTurn,
  isAnimatingScores,
  revealedLineScores,
  boardFlash,
  lastMove,
  onLineScorePositionsReady,
  onTileHover,
  boardCellRefs,
}: GameBoardProps) {
  const isBoardDisabled = isAnimatingScores;
  const [affectedCells, setAffectedCells] = useState<CellCoord[]>([]);
  const rowScoreRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const colScoreRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const overlayImgRef = useRef<HTMLImageElement | null>(null);
  const prevPlayerRef = useRef<string | null>(null);

  const rowScores = useMemo(() => {
    return Array(5).fill(null).map((_, i) => 
      revealedLineScores?.rows?.[i] ?? getLiveRowContribution(gameState, i)
    );
  }, [revealedLineScores, gameState.board, gameState.playerColors]);

  const colScores = useMemo(() => {
    return Array(6).fill(null).map((_, i) => 
      revealedLineScores?.cols?.[i] ?? getLiveColContribution(gameState, i)
    );
  }, [revealedLineScores, gameState.board, gameState.playerColors]);
  
  const totalLiveScores = useMemo(() => {
    const totals: Record<string, number> = {};
    gameState.players.forEach(p => { totals[p] = 0; });

    rowScores.forEach(row => {
      for (const player in row) {
        totals[player] += row[player];
      }
    });

    colScores.forEach(col => {
      for (const player in col) {
        totals[player] += col[player];
      }
    });

    return totals;
  }, [rowScores, colScores, gameState.players]);
 
  useScorePositionObserver({
    rowRefs: rowScoreRefs,
    colRefs: colScoreRefs,
    onPositionsReady: onLineScorePositionsReady,
  });

  const playRoundTransition = (
    imagePath: string,
    staticHoldMs: number,
    transitionMs: number,
    targetSelector: string
  ) => {
    const overlay = overlayRef.current;
    const img = overlayImgRef.current;
    const target = document.querySelector(targetSelector) as HTMLElement;
    const gameContainer = document.querySelector(".board-and-scores-container") as HTMLElement;

    if (!overlay || !img || !target || !gameContainer) {
        console.warn("Transition targets not found in DOM");
        return;
    }

    img.style.transition = `all ${transitionMs / 1000}s ease-in-out`;
    overlay.classList.remove("hidden");
    img.src = imagePath;

    img.style.position = "absolute";
    img.style.top = "50%";
    img.style.left = "50%";
    img.style.transform = "translate(-50%, -50%)";
    img.style.width = "1000px";
    img.style.height = "400px";

    setTimeout(() => {
      const targetRect = target.getBoundingClientRect();
      const gameRect = gameContainer.getBoundingClientRect();
      const targetX = targetRect.left - gameRect.left;
      const targetY = targetRect.top - gameRect.top;

      img.style.transform = "translate(0, 0)";
      img.style.top = `${targetY}px`;
      img.style.left = `${targetX}px`;
      img.style.width = "250px";
      img.style.height = "100px";
    }, staticHoldMs);

    setTimeout(() => {
      overlay.classList.add("hidden");
    }, staticHoldMs + transitionMs + 100);
  };

  useEffect(() => {
    const roundImage = `/images/rounds/round${gameState.round}.png`;
    playRoundTransition(roundImage, 1500, 1100, ".round-info-block");
  }, [gameState.round]);

  useEffect(() => {
    if (
      prevPlayerRef.current !== gameState.currentPlayer &&
      gameState.currentPlayer === playerName
    ) {
      playRoundTransition("/images/rounds/yourturn.png", 1000, 1000, ".turn-indicator");
    }
    prevPlayerRef.current = gameState.currentPlayer;
  }, [gameState.currentPlayer, playerName]);

  const currentPlayerColorName = gameState.playerColors[gameState.currentPlayer] as PlayerColor;
  const currentPlayerHex = colorMap[currentPlayerColorName] ?? '#aab2bd';

  return (
    <>
      <div id="round-transition-overlay" ref={overlayRef} className="hidden">
        <img 
          id="round-transition-image" 
          ref={overlayImgRef} 
          alt="Round Banner" 
          src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" 
        />
      </div>

      <div 
        className={`board-and-scores-container ${isBoardDisabled ? "disabled-board" : ""} ${boardShake ? "shake" : ""}`}
        style={{ borderColor: currentPlayerHex }}
      >
        <div className="game-board">
          {gameState.board.map((row, r_idx) =>
            row.map((cell, c_idx) => {
              const isHighlighted = highlightedCells?.some(c => c.r === r_idx && c.c === c_idx);
              const isLastPlaced = lastPlaced?.r === r_idx && lastPlaced?.c === c_idx;
              const isLastMove = lastMove && lastMove.row === r_idx && lastMove.col === c_idx;
              const isHovered = hoveredCell?.r === r_idx && hoveredCell?.c === c_idx;
              
              const hasPiece = cell && !cell.toLowerCase().includes("mount");
              const isAffectedByBorder = affectedCells.some(c => c.r === r_idx && c.c === c_idx);
              const shouldBeTransparent = hasPiece || (!cell && isAffectedByBorder);

              let ghostTile: string | null = null;
              if (isMyTurn && !cell && isHovered) {
                if (selectedPiece) ghostTile = selectedPiece.value;
                else ghostTile = gameState.pendingDrawTile[playerName] || null;
              }
              
              const hasCastle = cell && cell.toLowerCase().includes("castle");
              const tileAnimationClass = isLastPlaced 
                ? (hasCastle ? "castle-placed" : "tile-placed") 
                : "";
              
              return (
                <div
                  ref={(el) => {
                    if (el) boardCellRefs[`${r_idx}-${c_idx}`] = el;
                    else delete boardCellRefs[`${r_idx}-${c_idx}`];
                  }}
                  key={`${r_idx}-${c_idx}`}
                  className={`board-cell 
                    ${isHighlighted ? "highlighted" : ""} 
                    ${isLastMove ? "last-move" : ""} 
                    ${isHovered ? "hovered" : ""}
                    ${shouldBeTransparent ? "transparent-bg" : ""}`}
                  onClick={() => onPlaceOnBoard(r_idx, c_idx)}
                  onMouseEnter={() => {
                    setHoveredCell({ r: r_idx, c: c_idx });
                    if (cell) {
                      onTileHover(cell);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredCell(null);
                    onTileHover(null);
                  }}
                >
                  {cell && getTileImagePath(cell) && (
                    <div className={`tile-container ${tileAnimationClass}`}>
                      <img 
                        src={getTileImagePath(cell)} 
                        alt={cell || "tile"} 
                        draggable={false} 
                      />
                    </div>
                  )}
                  {ghostTile && getTileImagePath(ghostTile) && (
                    <div className="ghost-tile-container">
                      <img 
                        src={getTileImagePath(ghostTile)} 
                        alt="ghost" 
                        className="ghost-tile" 
                        draggable={false} 
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
          <SpecialTileBorders gameState={gameState} onAffectedCellsChange={setAffectedCells} />
        </div>

        {boardFlash && (
          <div key={boardFlash.key} className="board-flash" style={{ "--flash-color": boardFlash.color } as React.CSSProperties} />
        )}

        <div className="row-scores">
          {rowScores.map((scoresToShow, i) => {
            const scoreKey = `${i}-${JSON.stringify(scoresToShow)}`;
            return (
              <div
                ref={el => rowScoreRefs.current[i] = el}
                key={`rs-${i}`}
                className="score-display-container"
                style={{ gridRow: i + 1, gridColumn: 7 }}
              >
                <div key={scoreKey} className="score-pop-anim">
                  <LineScoreDisplay
                    scores={scoresToShow}
                    playerColors={gameState.playerColors}
                    type="row" 
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="col-scores">
          {colScores.map((scoresToShow, i) => {
            const scoreKey = `${i}-${JSON.stringify(scoresToShow)}`;
            return (
              <div
                ref={el => colScoreRefs.current[i] = el}
                key={`cs-${i}`}
                className="score-display-container"
                style={{ gridRow: 6, gridColumn: i + 1 }}
              >
                <div key={scoreKey} className="score-pop-anim">
                  <LineScoreDisplay
                    scores={scoresToShow}
                    playerColors={gameState.playerColors}
                    type="col" 
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="total-live-scores">
          {Object.entries(totalLiveScores)
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .map(([player, score]) => {
              if (score === 0 && !isAnimatingScores) return null;
              
              const playerColorName = gameState.playerColors[player] as PlayerColor;
              const playerHexColor = colorMap[playerColorName]; 

              return (
                <div key={player} className="player-total-score" style={{ color: playerHexColor }}> 
                   <span>{score > 0 ? `+${score}` : score}</span>
                </div>
              );
          })}
        </div>
      </div>
    </>
  );
}
