// src/types.ts

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
export type CellCoord = { r: number; c: number };
export type SelectedPiece =
  | { type: 'castle', value: string }
  | { type: 'hole_tile', value: string }
  | null;

export interface ScoringCastle {
  owner: string;
  score: number;
  pos: [number, number];
}

export interface ScoringStep {
  type: 'row' | 'col';
  index: number;
  castles: ScoringCastle[];
}

export type BotDifficulty = 'easy' | 'normal' | 'hard';

// This represents a player in the lobby before the game starts
export interface LobbyPlayer {
  name: string;
  color: PlayerColor;
  // REMOVED: castleStyle is no longer needed
  isBot?: boolean;
  difficulty?: BotDifficulty;
}

export interface FinalLineScores {
  rows: Record<number, Record<string, number>>;
  cols: Record<number, Record<string, number>>;
}

// An in-flight undo request: the requester's whole table votes to
// approve/deny it. `votes` only contains human opponents (bots can't
// respond), null = hasn't answered yet, true = approved. A single false
// never actually appears in state - the backend clears pendingUndo the
// instant anyone denies.
export interface PendingUndo {
  requester: string;
  requesterColor: PlayerColor;
  votes: Record<string, boolean | null>;
}

export interface TravelerConfig {
  src: string;
  direction?: "left-to-right" | "right-to-left";
  duration?: number;
  verticalPercent?: number;
  startDelay?: number;
  loop?: boolean;
  loopDelay?: number;
  width?: number | string;
  height?: number | string;
  animationName?: string;   
  zIndex?: number;
}

// This represents the full game state once started
export interface GameState {
  board: (string | null)[][];
  currentPlayer: string;
  round: number;
  tilesInBag: number;
  players: string[]; 
  playerCastles: Record<string, string[]>;
  totalScores: Record<string, number>;
  isRoundOver: boolean;
  lastRoundScores: Record<string, number>;
  allRoundScores: Record<string, number[]>;
  isGameOver: boolean;
  playerColors: Record<string, PlayerColor>;
  playerIsBot: Record<string, boolean>;
  hostPlayer: string;
  // REMOVED: playerCastleStyles is no longer needed
  has_started: boolean;
  playerHoleTiles: Record<string, string | null>;
  scoringSequence: ScoringStep[];
  gameLog: string[];
  pendingDrawTile: Record<string, string | null>;
  lastMover: string | null;
  pendingUndo: PendingUndo | null;
  // This field is only present in the initial fetch before the game starts
  lobby_players?: LobbyPlayer[];
  // Ephemeral broadcast-only fields:
  action?: 'tile_drawn';
  tile?: string;
  player?: string; // The player who drew the tile
  highlightedCells?: CellCoord[] | null;
  lastPlaced?: CellCoord | null;
}

