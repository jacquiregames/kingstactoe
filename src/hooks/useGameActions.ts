// src/hooks/useGameActions.ts
import { useCallback, useMemo } from 'react'; // <-- Import useMemo

export function useGameActions(
  playerName: string,
  onApiCall: (endpoint: string, body: object, errorMsg: string) => Promise<any>
) {
  const handleDrawTile = useCallback(async () => {
    return await onApiCall('/draw_tile', { player_name: playerName }, 'Draw Tile Failed');
  }, [playerName, onApiCall]);

  const handlePlaceTile = useCallback(async (tile: string, row: number, col: number) => {
    return await onApiCall('/place_tile', { 
      player_name: playerName, 
      tile, 
      row, 
      col 
    }, 'Place Tile Failed');
  }, [playerName, onApiCall]);

  const handlePlaceCastle = useCallback(async (castle: string, row: number, col: number) => {
    return await onApiCall('/place_castle', { 
      player_name: playerName, 
      castle, 
      row, 
      col 
    }, 'Place Castle Failed');
  }, [playerName, onApiCall]);

  const handlePlaceHoleTile = useCallback(async (row: number, col: number) => {
    return await onApiCall('/place_hole_tile', { 
      player_name: playerName, 
      row, 
      col 
    }, 'Place Hole Tile Failed');
  }, [playerName, onApiCall]);

  const handlePassTurn = useCallback(async () => {
    return await onApiCall('/pass_turn', { 
      player_name: playerName 
    }, 'Pass Turn Failed');
  }, [playerName, onApiCall]);

  const handleStartNextRound = useCallback(async () => { 
    return await onApiCall('/start_next_round', { 
      player_name: playerName 
    }, 'Start Next Round Failed');
  }, [playerName, onApiCall]);

  // --- FIX: Memoize the entire returned object ---
  // This ensures the `gameActions` object has a stable reference
  // across re-renders, preventing the useEffect loop.
  return useMemo(() => ({
    handleDrawTile,
    handlePlaceTile,
    handlePlaceCastle,
    handlePlaceHoleTile,
    handlePassTurn,
    handleStartNextRound
  }), [
    handleDrawTile,
    handlePlaceTile,
    handlePlaceCastle,
    handlePlaceHoleTile,
    handlePassTurn,
    handleStartNextRound
  ]);
}
