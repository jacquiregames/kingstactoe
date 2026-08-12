// src/hooks/usePieceAnimation.ts
import { useState } from "react";
import type { GameState, SelectedPiece } from "../types";
import { getTileImagePath } from "../utils";

export interface FlyingTileInfo {
  imgSrc: string;
  startRect: DOMRect;
  endRect: DOMRect;
  key: number;
  onComplete: () => Promise<void>; // Runs the deferred API call once the fly-in finishes
}

interface UsePieceAnimationOptions {
  gameState: GameState;
  playerName: string;
  drawnTile: string | null;
  selectedPiece: SelectedPiece;
  actionRefs: { [key: string]: HTMLElement | null };
  boardCellRefs: { [key: string]: HTMLElement | null };
  onPlaceTile: (tile: string, row: number, col: number) => Promise<any>;
  onPlaceCastle: (castle: string, row: number, col: number) => Promise<any>;
  onPlaceHoleTile: (row: number, col: number) => Promise<any>;
  onGameStateUpdate: (newState: GameState) => void;
  onClearSelectedPiece: () => void;
  onTriggerBoardShake: () => void;
}

// Maps a placed piece to a color used for the brief "impact flash" on the board.
function getFlashColorForPiece(piece: string): string {
  const lower = piece.toLowerCase();
  if (lower.includes("dragon")) return "rgba(255, 50, 50, 0.7)";
  if (lower.includes("goldmine")) return "rgba(255, 215, 0, 0.7)";
  if (lower.includes("wizard")) return "rgba(150, 50, 255, 0.7)";
  if (lower.includes("mount")) return "rgba(200, 200, 200, 0.7)";
  return "";
}

/**
 * Owns the "fly a piece from the tray to the board, then call the API" flow:
 * pick which piece/API-call applies based on current selection, animate it from
 * its source element to the target cell, and only fire the network request once
 * the animation completes.
 */
export function usePieceAnimation({
  gameState,
  playerName,
  drawnTile,
  selectedPiece,
  actionRefs,
  boardCellRefs,
  onPlaceTile,
  onPlaceCastle,
  onPlaceHoleTile,
  onGameStateUpdate,
  onClearSelectedPiece,
  onTriggerBoardShake,
}: UsePieceAnimationOptions) {
  const [flyingTile, setFlyingTile] = useState<FlyingTileInfo | null>(null);
  const [hiddenPieces, setHiddenPieces] = useState<Set<string>>(new Set());
  const [lastPlaced, setLastPlaced] = useState<{ r: number; c: number } | null>(null);
  const [boardFlash, setBoardFlash] = useState<{ color: string; key: number } | null>(null);

  const handlePlaceOnBoard = (r: number, c: number) => {
    if (gameState.isGameOver || flyingTile) return;
    if (gameState.board[r][c]) {
      onTriggerBoardShake();
      return;
    }

    let pieceToPlace: string | null = null;
    let sourceRefKey: string | null = null;
    let apiCall: (() => Promise<any>) | null = null;

    if (drawnTile) {
      pieceToPlace = drawnTile;
      sourceRefKey = "drawnTile";
      apiCall = () => onPlaceTile(drawnTile, r, c);
    } else if (selectedPiece?.type === "castle") {
      pieceToPlace = selectedPiece.value;
      sourceRefKey = selectedPiece.value;
      apiCall = () => onPlaceCastle(selectedPiece.value, r, c);
    } else if (selectedPiece?.type === "hole_tile") {
      pieceToPlace = gameState.playerHoleTiles[playerName];
      sourceRefKey = "holeTile";
      apiCall = () => onPlaceHoleTile(r, c);
    }

    if (!apiCall || !pieceToPlace || !sourceRefKey) return;

    const sourceElement = actionRefs[sourceRefKey];
    const targetElement = boardCellRefs[`${r}-${c}`];

    // We must have both elements to animate.
    if (!sourceElement || !targetElement) return;

    const startRect = sourceElement.getBoundingClientRect();
    const endRect = targetElement.getBoundingClientRect();

    // Runs AFTER the fly-in animation completes: fires the API call, then
    // reconciles local UI state (selection, flash, hidden pieces) with the result.
    const onComplete = async () => {
      setLastPlaced({ r, c });
      setTimeout(() => setLastPlaced(null), 500);

      const result = await apiCall!();
      onClearSelectedPiece();

      const flashColor = getFlashColorForPiece(pieceToPlace!);
      if (flashColor) {
        setBoardFlash({ color: flashColor, key: Date.now() });
        setTimeout(() => setBoardFlash(null), 1000);
      }

      if (result) {
        onGameStateUpdate(result);
      }
      setHiddenPieces(new Set()); // Clear hidden pieces after state update
    };

    setHiddenPieces(prev => new Set(prev).add(sourceRefKey!));
    setFlyingTile({
      imgSrc: getTileImagePath(pieceToPlace),
      startRect,
      endRect,
      key: Date.now(),
      onComplete,
    });
  };

  const clearFlyingTile = () => setFlyingTile(null);

  return {
    flyingTile,
    hiddenPieces,
    lastPlaced,
    boardFlash,
    handlePlaceOnBoard,
    clearFlyingTile,
  };
}
