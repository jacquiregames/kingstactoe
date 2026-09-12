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
  
  // Independent refs so concurrent animations never clash
  const roundOverlayRef = useRef<HTMLDivElement | null>(null);
  const roundImgRef = useRef<HTMLImageElement | null>(null);
  const turnOverlayRef = useRef<HTMLDivElement | null>(null);
  const turnImgRef = useRef<HTMLImageElement | null>(null);
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

  const playTransition = (
    imagePath: string,
    staticHoldMs: number,
    transitionMs: number,
    targetSelector: string,
    overlay: HTMLDivElement | null,
    img: HTMLImageElement | null
  ) => {
    const target = document.querySelector(targetSelector) as HTMLElement;

    if (!overlay || !img || !target) {
        console.warn("Transition targets not found in DOM");
        return;
    }

    // Clear any pending timeouts to prevent ghost flashes if called repeatedly
    if ((overlay as any)._timeout1) clearTimeout((overlay as any)._timeout1);
    if ((overlay as any)._timeout2) clearTimeout((overlay as any)._timeout2);

    // 1. Temporarily disable transitions to snap instantly to the starting state
    img.style.transition = 'none';
    overlay.classList.remove("hidden");
    img.style.opacity = '1';
    img.src = imagePath;

    // Start centered and full size
    img.style.position = "absolute";
    img.style.top = "50%";
    img.style.left = "50%";
    img.style.width = "1000px";
    img.style.height = "400px";
    img.style.transform = "translate(-50%, -50%) scale(1)";

    // Force a browser reflow so it registers the non-animated start state
    void img.offsetWidth;

    (overlay as any)._timeout1 = setTimeout(() => {
      // 2. Calculate center points using universal viewport coordinates
      const targetRect = target.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();

      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;
      
      const overlayCenterX = overlayRect.left + overlayRect.width / 2;
      const overlayCenterY = overlayRect.top + overlayRect.height / 2;

      const deltaX = targetCenterX - overlayCenterX;
      const deltaY = targetCenterY - overlayCenterY;

      // 3. Re-enable transitions: transform animates the whole time, opacity fades out at the very end
      const fadeOutDuration = 0.3;
      const fadeOutDelay = Math.max(0, (transitionMs / 1000) - fadeOutDuration);
      
      img.style.transition = `transform ${transitionMs / 1000}s ease-in-out, opacity ${fadeOutDuration}s ease-in-out ${fadeOutDelay}s`;
      
      // 4. Translate by the exact pixel delta, scale down, and drop opacity so it vanishes
      img.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0.25)`;
      img.style.opacity = '0';
    }, staticHoldMs);

    // Hide the overlay completely after the animation fully finishes
    (overlay as any)._timeout2 = setTimeout(() => {
      overlay.classList.add("hidden");
    }, staticHoldMs + transitionMs + 100);
  };

  useEffect(() => {
    const roundImage = `/images/rounds/round${gameState.round}.webp`;
    playTransition(roundImage, 1500, 1100, ".round-info-block", roundOverlayRef.current, roundImgRef.current);
  }, [gameState.round]);

  useEffect(() => {
    if (
      prevPlayerRef.current !== gameState.currentPlayer &&
      gameState.currentPlayer === playerName
    ) {
      playTransition("/images/rounds/yourturn.webp", 1000, 1000, ".turn-indicator", turnOverlayRef.current, turnImgRef.current);
    }
    prevPlayerRef.current = gameState.currentPlayer;
  }, [gameState.currentPlayer, playerName]);

  const currentPlayerColorName = gameState.playerColors[gameState.currentPlayer] as PlayerColor;
  const currentPlayerHex = colorMap[currentPlayerColorName] ?? '#aab2bd';

  return (
    <>
      {/* Separated overlays so concurrent Round and Turn animations don't interrupt each other */}
      <div ref={roundOverlayRef} className="hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 }}>
        <img ref={roundImgRef} alt="Round Banner" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
      </div>

      <div ref={turnOverlayRef} className="hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 }}>
        <img ref={turnImgRef} alt="Turn Banner" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
      </div>
      
      <div 
        className={`board-and-scores-container ${isBoardDisabled ? "disabled-board" : ""} ${boardShake ? "shake" : ""} ${isMyTurn ? 'pulse-border' : ''}`}
        style={{ border: `3px solid ${currentPlayerHex}`, '--pulse-color': currentPlayerHex } as React.CSSProperties}
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