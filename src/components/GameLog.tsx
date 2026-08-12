// src/components/GameLog.tsx
import { useEffect, useRef } from "react";
import type { GameState, PlayerColor } from "../types";
import { getTileImagePath } from "../utils";
import { colorMap } from "../utils/colorUtils";

interface GameLogProps {
  log: string[];
  players: GameState["players"];
  playerColors: GameState["playerColors"];
  hoveredTile: string | null;
  isMyTurn: boolean;
  gameState: GameState;
  onTileHover: (tile: string | null) => void;
}

function getTileIdentifierFromDescription(
  desc: string,
  player: string,
  playerColors: Record<string, PlayerColor>
): string {
  const lower = desc.toLowerCase();

  // --- Special Tiles ---
  if (lower.includes("dragon")) return "dragon";
  if (lower.includes("wizard")) return "wizard";
  if (lower.includes("gold mine")) return "goldmine";
  if (lower.includes("mountain")) return "mounta"; // default

  // --- Plus/Minus Tiles ---
  const pmMatch = lower.match(/([+-])(\d+)([ab])?/);
  if (pmMatch) {
    const type = pmMatch[1] === "+" ? "plus" : "minus";
    const number = pmMatch[2];
    
    // For "plus" tiles, use the captured suffix ('a' or 'b') or default to 'a'.
    if (type === "plus") {
        const suffix = pmMatch[3] || 'a';
        return `plus${number}${suffix}`;
    } 
    // For "minus" tiles, there is no 'a'/'b' variant.
    else {
        return `minus${number}`;
    }
  }

  // --- Castles ---
  const rankMatch = lower.match(/rank (\d)/);
  if (rankMatch) {
    const rank = rankMatch[1];
    const color = playerColors[player];
    if (color) {
      return `${color}CastleR${rank}a`;
    }
  }

  return desc;
}

function ParsedLogMessage({
  message,
  players = [],
  playerColors = {},
  onTileHover,
}: {
  message: string;
  players: GameState["players"];
  playerColors: GameState["playerColors"];
  onTileHover: (tile: string | null) => void;
}) {
  // --- Winner ---
  if (message.startsWith("__WINNER__")) {
    const parts = message.replace("__WINNER__", "").split("|");
    const [winnerName, winnerColor] = parts;
    if (!winnerName || !winnerColor) return <span>{message}</span>;

    return (
      <div className="log-winner-entry">
        <span>
          <img
            src={`/images/stones/${winnerColor}.png`}
            alt={`${winnerName}'s gem`}
            className="log-tile-icon"
          />
          wins the round!
        </span>
      </div>
    );
  }
  
  // ---  Round Start Images --- 
  const roundMatch = message.match(/Round\s+(\d+)\s+Starting/i);
  if (roundMatch) {
    const roundNum = roundMatch[1];
    return (
      <div className="log-round-divider">
        <img 
          src={`/images/rounds/round${roundNum}.png`} 
          alt={`Round ${roundNum}`} 
          className="log-round-image"
        />
      </div>
    );
  } 
  
  // --- System ---
  if (
    message.startsWith("---") ||
    message.startsWith("Game Started") ||
    message.startsWith("Round tied")
  ) {
    return <span className="log-system-message">{message}</span>;
  }

  // --- Round Score Summary lines ---
  const scoreMatch = message.match(/\s•\s(.+?):\s(-?\d+)\spoints/);
  if (scoreMatch) {
    const [, playerName, points] = scoreMatch;
    const playerColor = playerColors ? playerColors[playerName] : undefined;
    if (!playerColor) {
      // Fallback if color isn't found
      return <span className="log-entry">&nbsp;&nbsp;•&nbsp;{`${playerName}: ${points} points`}</span>;
    }
    return (
      <span className="log-entry">
        &nbsp;&nbsp;•&nbsp;
        <img
          src={`/images/stones/${playerColor}.png`}
          alt={`${playerName}'s gem`}
          className="log-tile-icon"
        />
        {`: ${points} points`}
      </span>
    );
  }

  // --- Player action ---
  const actingPlayer = players && players.find((p) => message.startsWith(p + " "));

  if (actingPlayer) {
    const playerColor = playerColors[actingPlayer];
    if (!playerColor) return <span className="log-entry">{message}</span>; // Fallback

    const placeRegex =
      /(?:placed a|played their hole tile,|drew and placed) (.*) on ([A-E][1-6])/;
    const placeMatch = message.match(placeRegex);

    if (placeMatch) {
      let [, tileDescription, coord] = placeMatch;
      tileDescription = tileDescription.trim().replace(/,$/, ""); 

      const tileIdentifier = getTileIdentifierFromDescription(
        tileDescription,
        actingPlayer,
        playerColors
      );
      const tileImg = getTileImagePath(tileIdentifier);

      return (
        <span className="log-entry">
          <img
            src={`/images/stones/${playerColor}.png`}
            alt={`${actingPlayer}'s gem`}
            className="log-tile-icon"
          />
          {" placed "}
          {tileImg ? (
            <img
              src={tileImg}
              alt={tileDescription}
              className="log-tile-icon"
              onMouseEnter={() => onTileHover(tileIdentifier)}
              onMouseLeave={() => onTileHover(null)}
              style={{ cursor: "pointer" }}
            />
          ) : (
            <em>{tileDescription}</em>
          )}
          {` on ${coord}`}
        </span>
      );
    }

    // --- Pass ---
    if (message.includes("passed their turn")) {
      return (
        <span className="log-entry">
          <img
            src={`/images/stones/${playerColor}.png`}
            alt={`${actingPlayer}'s gem`}
            className="log-tile-icon"
          />
          {" passed their turn."}
        </span>
      );
    }
  }

  // Fallback
  return <span className="log-entry">{message}</span>;
}

export function GameLog({
  log = [],
  players = [],
  playerColors = {},
  hoveredTile,
  isMyTurn,
  gameState,
  onTileHover,
}: GameLogProps) {
  const logListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (logListRef.current) {
      logListRef.current.scrollTo({
        top: logListRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [log]);

  const currentPlayerColorName = gameState.playerColors[gameState.currentPlayer] as PlayerColor;
  const currentPlayerHex = colorMap[currentPlayerColorName] ?? '#aab2bd';

  // --- Dragon & Wizard Interaction Detection ---
  let hasDragon = false;
  let hasWizard = false;
  for (const row of gameState.board) {
    for (const cell of row) {
      if (cell?.toLowerCase().includes("dragon")) hasDragon = true;
      if (cell?.toLowerCase().includes("wizard")) hasWizard = true;
    }
  }

  let specialVideo: string | null = null;
  if (hasDragon && hasWizard && gameState.gameLog.length > 0) {
    const lastLog = gameState.gameLog[gameState.gameLog.length - 1];
    if (lastLog.includes("the Dragon on ")) {
      specialVideo = "/images/rounds/wizard_dragon.mp4";
    } else if (lastLog.includes("the Wizard on ")) {
      specialVideo = "/images/rounds/dragon_wizard.mp4";
    }
  }

  return (
    <div className="game-log-container" style={{ borderColor: currentPlayerHex }}>
      <ul className="game-log" ref={logListRef}>
        {log.map((entry, i) => (
          <li key={i}>
            <ParsedLogMessage
              message={entry}
              players={players}
              playerColors={playerColors}
              onTileHover={onTileHover}
            />
          </li>
        ))}
      </ul>
      <div className="tile-preview-area">
        {hoveredTile && getTileImagePath(hoveredTile) ? (
          <img src={getTileImagePath(hoveredTile)} alt="Tile Preview" />
        ) : gameState.isGameOver ? (  
          <video src="/images/rounds/gameover.mp4" autoPlay loop playsInline />
        ) : specialVideo ? (
          <video src={specialVideo} autoPlay loop playsInline />
        ) : isMyTurn ? (
          <video src="/images/rounds/yourturn2.mp4" autoPlay loop playsInline />
        ) : (
          <span className="tile-preview-placeholder">
            Hover over a tile on the board or in your hand to see details
          </span>
        )}
      </div>
    </div>
  );
}
