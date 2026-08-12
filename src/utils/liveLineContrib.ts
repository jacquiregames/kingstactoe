// src/utils/liveLineContrib.ts
//
// NOTE: This mirrors the backend's authoritative scoring algorithm (line-of-sight
// scan, tile values, wizard adjacency bonus, goldmine doubling) so the board can
// show a live score preview without a round-trip to the server. Keep this in sync
// with: main.py -> GameState.calculate_scores_and_sequence
import type { GameState } from '../types';

// Helper to normalize strings for case-insensitive comparison
function norm(t?: string | null) { return (t || '').toLowerCase(); }

// Helper to get the rank from a castle string (e.g., "redCastleR3a" -> 3)
function rankOfCastle(tile: string): number {
  const m = tile.split('R')[1]?.[0];
  const r = parseInt(m || '1', 10);
  return Number.isFinite(r) ? r : 1;
}

// Helper to find which player owns a castle based on its color
function castleOwner(tile: string, playerColors: GameState['playerColors']): string | null {
  const color = (['red','blue','green','yellow'] as const).find(c => tile.includes(c));
  if (!color) return null;
  return Object.entries(playerColors).find(([, playerColor]) => playerColor === color)?.[0] || null;
}

// Helper to check if a castle at (r, c) is adjacent to the wizard
function isWizardAdj(r: number, c: number, wiz: [number,number] | null): boolean {
  if (!wiz) return false;
  const [wr, wc] = wiz;
  return (r === wr && Math.abs(c - wc) === 1) || (c === wc && Math.abs(r - wr) === 1);
}

// --- NEW HELPER: Gets all tiles in one direction from a point, stopping at mountains ---
function getTilesInLineOfSight(board: (string | null)[][], r: number, c: number, dr: number, dc: number): (string | null)[] {
    const line: (string | null)[] = [];
    let currentR = r + dr;
    let currentC = c + dc;
    // Keep moving in the direction (dr, dc) until we go off the board
    while (currentR >= 0 && currentR < 5 && currentC >= 0 && currentC < 6) {
        const tile = board[currentR][currentC];
        // If we hit a mountain, stop the scan for this direction.
        if (tile && norm(tile).includes('mount')) {
            break;
        }
        line.push(tile);
        currentR += dr;
        currentC += dc;
    }
    return line;
}

// Calculates the base value of a specific line of sight
function getLineValue(tiles: (string | null)[]): number {
  const normalizedTiles = tiles.map(norm);
  const hasDragon = normalizedTiles.includes('dragon');
  let base = 0;

  for (const tile of normalizedTiles) {
    if (!tile || tile.includes('castle')) continue;
    const match = tile.match(/(\d+)/);
    if (!match) continue;
    const value = parseInt(match[0], 10);

    if (tile.includes('plus')) {
      base += hasDragon ? 0 : value;
    }
    if (tile.includes('minus')) {
      base -= value;
    }
  }

  if (normalizedTiles.some(t => t.includes('goldmine'))) {
    base *= 2;
  }
  return base;
}

// Helper to find the wizard's position once per calculation
function findWizard(board: (string | null)[][]): [number, number] | null {
    // --- FIX: Add a guard clause to prevent crash on empty/malformed board ---
    if (!board || board.length === 0) {
        return null;
    }

    for (let r = 0; r < board.length; r++) {
        const row = board[r];
        if (row) { // Check if the row exists
             for (let c = 0; c < row.length; c++) {
                if (norm(board[r][c]) === 'wizard') return [r, c];
            }
        }
    }
    return null;
}

// --- REWRITTEN & FIXED LOGIC ---
// Returns a map of total player scores for a given row
export function getLiveRowContribution(gameState: GameState, rowIdx: number): Record<string, number> {
  const { board, playerColors } = gameState;
  
  // --- FIX: Add guard clause ---
  if (!board || !board[rowIdx]) {
    return {};
  }

  const out: Record<string, number> = {};
  const wizardPos = findWizard(board);

  for (let colIdx = 0; colIdx < board[rowIdx].length; colIdx++) {
    const tile = board[rowIdx][colIdx];
    if (tile && norm(tile).includes('castle')) {
      const owner = castleOwner(tile, playerColors);
      if (!owner) continue;

      const leftTiles = getTilesInLineOfSight(board, rowIdx, colIdx, 0, -1);
      const rightTiles = getTilesInLineOfSight(board, rowIdx, colIdx, 0, 1);
      const lineValue = getLineValue([...leftTiles, ...rightTiles]);

      if (lineValue !== 0) {
        let rank = rankOfCastle(tile);
        if (isWizardAdj(rowIdx, colIdx, wizardPos)) rank += 1;
        out[owner] = (out[owner] || 0) + (lineValue * rank);
      }
    }
  }
  return out;
}

// --- REWRITTEN & FIXED LOGIC ---
// Returns a map of total player scores for a given column
export function getLiveColContribution(gameState: GameState, colIdx: number): Record<string, number> {
  const { board, playerColors } = gameState;

  // --- FIX: Add guard clause ---
  if (!board || board.length === 0) {
    return {};
  }

  const out: Record<string, number> = {};
  const wizardPos = findWizard(board);
  
  for (let rowIdx = 0; rowIdx < board.length; rowIdx++) {
    const tile = board[rowIdx][colIdx];
    if (tile && norm(tile).includes('castle')) {
      const owner = castleOwner(tile, playerColors);
      if (!owner) continue;
      
      const upTiles = getTilesInLineOfSight(board, rowIdx, colIdx, -1, 0);
      const downTiles = getTilesInLineOfSight(board, rowIdx, colIdx, 1, 0);
      const lineValue = getLineValue([...upTiles, ...downTiles]);
      
      if (lineValue !== 0) {
        let rank = rankOfCastle(tile);
        if (isWizardAdj(rowIdx, colIdx, wizardPos)) rank += 1;
        out[owner] = (out[owner] || 0) + (lineValue * rank);
      }
    }
  }
  return out;
}
