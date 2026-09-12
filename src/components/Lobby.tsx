// src/components/Lobby.tsx
import { useState } from "react"; 
import type { PlayerColor, LobbyPlayer, BotDifficulty } from "../types";
import { KingsTacToeLogo } from "./KingsTacToeLogo"; 
import { HighScore } from "./HighScore";

interface LobbyProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  lobbyPlayers: LobbyPlayer[];
  isHost: boolean;
  errorMessage: string;
  onJoin: (name: string, color: PlayerColor) => void;
  onStartGame: (currentPlayers: LobbyPlayer[]) => void;
  onShowHowToPlay: () => void; 
  onAddBot: (difficulty: BotDifficulty) => void;
  onRemoveBot: (botName: string) => void;
}

export function Lobby({
  playerName,
  setPlayerName,
  lobbyPlayers,
  isHost,
  errorMessage,
  onJoin,
  onStartGame,
  onShowHowToPlay, 
  onAddBot,
  onRemoveBot,
}: LobbyProps) {
  const [selectedColor, setSelectedColor] = useState<PlayerColor | null>(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("normal");
  const [isAddingBot, setIsAddingBot] = useState(false);

  const handleAddBotClick = async () => {
    setIsAddingBot(true);
    try {
      await onAddBot(botDifficulty);
    } finally {
      setIsAddingBot(false);
    }
  };

  const handleJoin = async () => {
    const trimmedName = playerName.trim();
    if (!trimmedName || trimmedName.length > 12) {
      setLocalError("Name must be 1-12 characters");
      return;
    }
    if (!selectedColor) {
      setLocalError("Please select a color");
      return;
    }

    setLocalError("");
    setIsLoading(true);
    try {
      await onJoin(trimmedName, selectedColor);
    } finally {
      setIsLoading(false);
    }
  };

  const hasJoined = lobbyPlayers.some((p) => p.name === playerName);
  const takenColors = lobbyPlayers.map((p) => p.color);

  const colorStones: { color: PlayerColor; file: string }[] = [
    { color: "red", file: "/images/stones/red.webp" },
    { color: "blue", file: "/images/stones/blue.webp" },
    { color: "green", file: "/images/stones/green.webp" },
    { color: "yellow", file: "/images/stones/yellow.webp" },
  ];

  return (
    <div className="lobby-container">
      {/* Background Video handled safely in App.tsx */}
      <div className="how-to-play-container">
        <button type="button" className="how-to-play-image-btn" onClick={onShowHowToPlay}>
          <img src="/images/buttons/howtoplay.webp" alt="How To Play" />
        </button>
      </div>
      <div className="intro-logo">
        <KingsTacToeLogo />
      </div>

      <div className="lobby-actions">
        {!hasJoined ? (
          <>
            {(localError || errorMessage) && (
              <div className="error-message">{localError || errorMessage}</div>
            )}
            
            <div> 
              <h2 className="undo-request-title shimmer-text" data-text="Your Name">Your Name</h2>
              <input
                type="text"
                placeholder="Enter name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="lobby-input"
                style={{ textAlign: 'center' }}
              />
            </div>

            <div className="input-group"> 
              <h2 className="undo-request-title shimmer-text" data-text="Choose Your Color">Choose Your Color</h2>
              <div className="landing-stones">
                {colorStones.map(({ color, file }) => {
                  const isTaken = takenColors.includes(color);
                  return (
                    <div
                      key={color}
                      className={`stone-box ${selectedColor === color ? "selected" : ""} ${isTaken ? "taken" : ""}`}
                      onClick={() => !isTaken && setSelectedColor(color)}
                    >
                      <img src={file} alt={color} draggable={false} />
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleJoin}
              disabled={isLoading || !playerName || !selectedColor}
              className="join-game-image-btn"
            >
              <img src="/images/buttons/joingame.webp" alt={isLoading ? "Joining..." : "Join Lobby"} draggable={false} />
            </button>
          </>
        ) : (
          <> 
            <h2 className="undo-request-title shimmer-text" data-text="Lobby">Lobby</h2>
          
            <ul className="player-list">
              {lobbyPlayers.map((p) => (
                <li key={p.name} className="player-list-item">
                  <img 
                    src={`/images/stones/${p.color}.webp`} 
                    className="player-stone-icon" 
                    alt={`${p.color} stone`} 
                  />
                  <span className="player-list-name">
                    {p.name} {p.name === playerName ? "(You)" : ""}
                    {p.isBot && <span className="bot-tag">🤖 Bot · {p.difficulty ?? "normal"}</span>}
                  </span>
                  {isHost && p.isBot && (
                    <button
                      type="button"
                      className="remove-bot-btn"
                      onClick={() => onRemoveBot(p.name)}
                      title={`Remove ${p.name}`}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>             

            {isHost && lobbyPlayers.length < 4 && (
              <div className="add-bot-controls">
                <select
                  value={botDifficulty}
                  onChange={(e) => setBotDifficulty(e.target.value as BotDifficulty)}
                  className="bot-difficulty-select"
                  aria-label="Bot difficulty"
                >
                  <option value="easy">Easy Bot</option>
                  <option value="normal">Normal Bot</option>
                  <option value="hard">Hard Bot</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddBotClick}
                  disabled={isAddingBot}
                  className="add-bot-btn"
                >
                  {isAddingBot ? "Adding..." : "+ Add Computer Opponent"}
                </button>
              </div>
            )}

            {isHost ? (
              lobbyPlayers.length < 2 ? (
                <button disabled className="join-button">
                  Waiting for Players...
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartGame(lobbyPlayers)}
                  className="start-game-image-btn"
                >
                  <img src="/images/buttons/startgame.webp" alt="Start Game" draggable={false} />
                </button>
              )
            ) : (
              <p className="waiting-message" style={{ textAlign: 'center', marginTop: '10px' }}>
                Waiting for the host to start the game...
              </p>
            )}

            {errorMessage && <div className="error-message">{errorMessage}</div>}
          </>
        )}
      </div>

      <HighScore />
    </div>
  );
}
