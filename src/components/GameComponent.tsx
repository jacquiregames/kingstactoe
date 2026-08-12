// src/components/GameComponent.tsx
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import type { GameState, SelectedPiece, FinalLineScores } from "../types";
import { GameOverModal } from "./GameOverModal";
import { GameLog } from "./GameLog";
import { GameBoard } from "./GameBoard";
import { PlayerActions } from "./PlayerActions";
import { useGameActions } from "../hooks/useGameActions";
import { GameHeader } from "./GameHeader";
import { FlyingTile } from "./FlyingTile";
import { useScoringAnimation } from "../hooks/useScoringAnimation";
import { usePieceAnimation } from "../hooks/usePieceAnimation";

interface GameComponentProps {
  gameState: GameState;
  playerName: string;
  onApiCall: (endpoint: string, body: object, errorMsg: string) => Promise<any>;
  onReset: () => void;
  onGameStateUpdate: (newState: GameState) => void;
  onShowHowToPlay: () => void;
}

interface FlyingScore {
  id: number; text: string; color: string;
  startX: number; startY: number; endX: number; endY: number;
}

export function GameComponent({
  gameState,
  playerName,
  onApiCall,
  onReset,
  onGameStateUpdate,
  onShowHowToPlay
}: GameComponentProps) {
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece>(null);
  const [drawnTile, setDrawnTile] = useState<string | null>(gameState.pendingDrawTile[playerName] || null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [highlighted, setHighlighted] = useState<{ r: number; c: number }[] | null>(null);
  const [boardShake, setBoardShake] = useState(false);
  const [showEndRoundUI, setShowEndRoundUI] = useState(false);
  const [targetScores, setTargetScores] = useState<Record<string, number> | null>(null);
  const [revealedLineScores, setRevealedLineScores] = useState<FinalLineScores | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const [playerScorePositions, setPlayerScorePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [lineScorePositions, setLineScorePositions] = useState<{ rows: Record<number, { x: number, y: number }>, cols: Record<number, { x: number, y: number }> }>({ rows: {}, cols: {} });
  const [flyingScores, setFlyingScores] = useState<FlyingScore[]>([]);
  const [lastMove, setLastMove] = useState<{row: number, col: number} | null>(null);
  const [poppedPlayers, setPoppedPlayers] = useState<Set<string>>(new Set());
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);

  const actionRefs = useRef<{ [key: string]: HTMLElement | null }>({}).current;
  const boardCellRefs = useRef<{ [key: string]: HTMLElement | null }>({}).current;

  const scoreRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const gameActions = useGameActions(playerName, onApiCall);
  const isMyTurn = gameState.currentPlayer === playerName;
  const isAnimatingScores = gameState.isRoundOver && !gameState.isGameOver && !showEndRoundUI;
  const myHoleTile = gameState.playerHoleTiles[playerName];
  const myCastles = playerName ? gameState.playerCastles[playerName] || [] : [];
  const canPlayerMove = gameState.tilesInBag > 0 || myCastles.length > 0 || !!myHoleTile;
  const showPassButton = isMyTurn && !drawnTile && !selectedPiece && !canPlayerMove;

  const triggerBoardShake = useCallback(() => {
    setBoardShake(true);
    setTimeout(() => setBoardShake(false), 500);
  }, []);

  // Extracted piece-placement animation flow (fly tile/castle/hole-tile from
  // its source to the target cell, then fire the API call) — see usePieceAnimation.
  const {
    flyingTile,
    hiddenPieces,
    lastPlaced,
    boardFlash,
    handlePlaceOnBoard,
    clearFlyingTile,
  } = usePieceAnimation({
    gameState,
    playerName,
    drawnTile,
    selectedPiece,
    actionRefs,
    boardCellRefs,
    onPlaceTile: gameActions.handlePlaceTile,
    onPlaceCastle: gameActions.handlePlaceCastle,
    onPlaceHoleTile: gameActions.handlePlaceHoleTile,
    onGameStateUpdate,
    onClearSelectedPiece: () => setSelectedPiece(null),
    onTriggerBoardShake: triggerBoardShake,
  });

  // Background change based on turn
  useEffect(() => {
    if (isMyTurn && !gameState.isGameOver) {
      document.body.style.backgroundImage = "url('/images/background/yourturn.png')";
    } else {
      document.body.style.backgroundImage = "url('/images/background/background.png')";
    }

    // Cleanup to default background when leaving game
    return () => {
      document.body.style.backgroundImage = "url('/images/background/background.png')";
    };
  }, [isMyTurn, gameState.isGameOver]);
 
  useEffect(() => {
    if (gameState.gameLog.length > 0) {
      const lastLogEntry = gameState.gameLog[gameState.gameLog.length - 1];
      const match = lastLogEntry.match(/ on ([A-E])([1-6])/);
      if (match) {
        const rowLetter = match[1];
        const colNumber = parseInt(match[2], 10);        
        const r = 'ABCDE'.indexOf(rowLetter);
        const c = colNumber - 1;
        if (r !== -1 && c >= 0) {
          setLastMove({ row: r, col: c });
        }
      } else {
        setLastMove(null);
      }
    }
  }, [gameState.gameLog]);

  const handleStartNextRoundClick = async () => {
    const newState = await gameActions.handleStartNextRound();
    if (newState) onGameStateUpdate(newState);
  };

  const handleLineScorePositionsReady = useCallback((positions: { rows: Record<number, { x: number, y: number }>, cols: Record<number, { x: number, y: number }> }) => {
    setLineScorePositions(positions);
  }, []);
  
  useLayoutEffect(() => {
    const newPositions: Record<string, { x: number; y: number }> = {};
    for (const player in scoreRefs.current) {
      const el = scoreRefs.current[player];
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions[player] = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
    }
    setPlayerScorePositions(prev => {
      const keys = Object.keys(newPositions);
      const changed =
        keys.length !== Object.keys(prev).length ||
        keys.some(k =>
          !prev[k] ||
          Math.abs(prev[k].x - newPositions[k].x) > 0.5 ||
          Math.abs(prev[k].y - newPositions[k].y) > 0.5
        );
      return changed ? newPositions : prev;
    });
  }, [gameState.players]);
  
  useEffect(() => {
    if (flyingScores.length === 0) return;
    const timeout = setTimeout(() => setFlyingScores([]), 1400); // Matched to animation duration
    return () => clearTimeout(timeout);
  }, [flyingScores]);

  // Fixes #6 (stale/incomplete dependency array) and #14 (component size).
  // The scoring animation logic now lives in its own hook.
  useScoringAnimation({
    isAnimatingScores,
    gameState,
    playerScorePositions,
    lineScorePositions,
    onSetHighlighted:        setHighlighted,
    onSetTargetScores:       setTargetScores,
    onSetRevealedLineScores: setRevealedLineScores,
    onSetFlyingScores:       setFlyingScores,
    onClearFlyingScore:      (id) => setFlyingScores(fs => fs.filter(f => f.id !== id)),
    onSetPoppedPlayers:      setPoppedPlayers,
    onAnimationComplete:     async (wasRound3) => {
      if (wasRound3) {
        const finalState = await gameActions.handleStartNextRound();
        if (finalState) onGameStateUpdate(finalState);
      } else {
        setShowEndRoundUI(true);
      }
    },
  });

  useEffect(() => {
    if (gameState.currentPlayer !== playerName) setSelectedPiece(null);
    setDrawnTile(gameState.pendingDrawTile[playerName] || null);
  }, [gameState.currentPlayer, gameState.pendingDrawTile, playerName]);

  useEffect(() => {
    if (gameState?.action === "tile_drawn" && gameState.player === playerName) {
      setDrawnTile(gameState.tile || null);
      setIsDrawing(true);
      setTimeout(() => setIsDrawing(false), 500);
    }
  }, [gameState?.action, gameState?.tile, gameState.player, playerName]);

  useEffect(() => {
    if (!gameState.isRoundOver) {
      setShowEndRoundUI(false);
      setRevealedLineScores(null);
    }
  }, [gameState.isRoundOver]);

  // Give tactile feedback when clicking a castle off-turn
  const handleSelectCastle = (castle: string) => {
    if (drawnTile) return;
    if (!isMyTurn) {
      triggerBoardShake();
      return;
    }
    const isCurrentlySelected = selectedPiece?.type === "castle" && selectedPiece.value === castle;
    setSelectedPiece(isCurrentlySelected ? null : { type: "castle", value: castle });
  };

  const handleSelectHoleTile = () => {
    if (drawnTile || !myHoleTile || !isMyTurn) return;
    const isCurrentlySelected = selectedPiece?.type === "hole_tile";
    setSelectedPiece(isCurrentlySelected ? null : { type: "hole_tile", value: myHoleTile });
  };
  
  return (
    <div className="game-screen">
      <GameHeader
        gameState={gameState}
        playerName={playerName}
        scoreRefs={scoreRefs}
        poppedPlayers={poppedPlayers} 
        animatedScores={targetScores}
        isAnimatingScores={isAnimatingScores}
        onShowHowToPlay={onShowHowToPlay}
      />
      <main className="main-game-area">
        <GameLog
          log={gameState.gameLog}
          players={gameState.players}
          playerColors={gameState.playerColors}
          hoveredTile={hoveredTile}
          isMyTurn={isMyTurn}
          gameState={gameState}
          onTileHover={setHoveredTile}
        />
        <GameBoard
          gameState={gameState}
          playerName={playerName}
          highlightedCells={highlighted}
          lastPlaced={lastPlaced}
          onPlaceOnBoard={handlePlaceOnBoard}
          hoveredCell={hoveredCell}
          setHoveredCell={setHoveredCell}
          selectedPiece={selectedPiece}
          boardShake={boardShake}
          isMyTurn={isMyTurn}
          isAnimatingScores={isAnimatingScores}
          revealedLineScores={revealedLineScores}
          boardFlash={boardFlash}
          lastMove={lastMove}
          onLineScorePositionsReady={handleLineScorePositionsReady}
          onTileHover={setHoveredTile}
          boardCellRefs={boardCellRefs}
        />
        {gameState.isGameOver ? (
          <GameOverModal gameState={gameState} onReset={onReset} />
        ) : (
          <PlayerActions
            gameState={gameState}
            playerName={playerName}
            isMyTurn={isMyTurn}
            myHoleTile={myHoleTile}
            myCastles={myCastles}
            selectedPiece={selectedPiece}
            drawnTile={drawnTile}
            isDrawing={isDrawing}
            showPassButton={showPassButton}
            onSelectHoleTile={handleSelectHoleTile}
            onPassTurn={gameActions.handlePassTurn}
            onDrawTile={gameActions.handleDrawTile}
            onSelectCastle={handleSelectCastle}
            isAnimatingScores={isAnimatingScores}
            showNextRoundButton={showEndRoundUI && !gameState.isGameOver}
            onStartNextRound={handleStartNextRoundClick}
            onTileHover={setHoveredTile}
            actionRefs={actionRefs}
            hiddenPieces={hiddenPieces}
          />
        )}
      </main>

      {flyingTile && (
        <FlyingTile
          key={flyingTile.key}
          imgSrc={flyingTile.imgSrc}
          startRect={flyingTile.startRect}
          endRect={flyingTile.endRect}
          onAnimationComplete={async () => {
            if (flyingTile) {
              await flyingTile.onComplete(); // Perform the API call
            }
            clearFlyingTile(); // Clear the animation state
          }}
        />
      )}

      <div className="flying-scores-container">
        {flyingScores.map((flyer) => (
          <div
            key={flyer.id}
            className="flying-score"
            style={{
              color: flyer.color,
              '--start-x': `${flyer.startX}px`,
              '--start-y': `${flyer.startY}px`,
              '--end-x': `${flyer.endX}px`,
              '--end-y': `${flyer.endY}px`
            } as React.CSSProperties}
          >
            {flyer.text}
          </div>
        ))}
      </div>
    </div>
  );
}
