// src/components/PlayerActions.tsx
import type { GameState, SelectedPiece, PlayerColor } from "../types";
import { getTileImagePath } from "../utils";
import { colorMap } from "../utils/colorUtils";

interface PlayerActionsProps {
  gameState: GameState;
  playerName: string;
  isMyTurn: boolean;
  myHoleTile: string | null;
  myCastles: string[];
  selectedPiece: SelectedPiece;
  drawnTile: string | null;
  isDrawing: boolean;
  showPassButton: boolean;
  onSelectHoleTile: () => void;
  onPassTurn: () => void;
  onDrawTile: () => void;
  onSelectCastle: (castle: string) => void;
  isAnimatingScores: boolean;
  showNextRoundButton: boolean;
  onStartNextRound: () => void;
  onTileHover: (tile: string | null) => void;
  actionRefs: { [key: string]: HTMLElement | null };
  hiddenPieces: Set<string>;
}

export function PlayerActions({
  gameState,
  playerName,
  isMyTurn,
  myHoleTile,
  myCastles,
  selectedPiece,
  drawnTile,
  isDrawing,
  showPassButton,
  onSelectHoleTile,
  onPassTurn,
  onDrawTile,
  onSelectCastle,
  onTileHover,
  isAnimatingScores,
  showNextRoundButton,
  onStartNextRound,
  actionRefs,
  hiddenPieces,
}: PlayerActionsProps) {
  
  // Fix #2: use hostPlayer (set at lobby creation) instead of players[0] (shuffled turn order)
  const isHost = playerName === gameState.hostPlayer;
  const isHoleTileHidden = hiddenPieces.has('holeTile');
  const isDrawnTileHidden = hiddenPieces.has('drawnTile');
  const isActionLocked = !!drawnTile;

  const currentPlayerColorName = gameState.playerColors[gameState.currentPlayer] as PlayerColor;
  const currentPlayerHex = colorMap[currentPlayerColorName] ?? '#aab2bd';

  return (
    <div 
      className={`player-actions ${isAnimatingScores ? "disabled-board" : ""}`}
      style={{ borderColor: currentPlayerHex }}
    >
      {showNextRoundButton ? (
        <div className="action-box">
          <h3 
            className="shimmer-text" 
            data-text={`Round ${gameState.round} Over`}
            style={{ fontSize: "1.5rem", marginBottom: "10px", color: "#61dafb" }}
          >
            Round {gameState.round} Over
          </h3>
          <p>
            {isHost
              ? "Start the next round when ready."
              : `Waiting for the host, ${gameState.hostPlayer}, to begin the next round.`}
          </p>
          {isHost && (
            <button type="button" onClick={onStartNextRound} className="start-round-image-btn">
              <img src={`/images/buttons/startround${gameState.round + 1}.png`} alt={`Start Round ${gameState.round + 1}`} draggable={false} />
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="actions-row">
            <div className="action-box">
              <h3>Your Hole Tile</h3>
              <div className="hand">
                {myHoleTile && !isHoleTileHidden && getTileImagePath(myHoleTile) ? (
                  <img
                    ref={(el) => {
                      if (el) actionRefs['holeTile'] = el;
                      else delete actionRefs['holeTile'];
                    }}
                    src={getTileImagePath(myHoleTile)}
                    alt="Your hole tile"
                    className={`
                      tile-image 
                      ${selectedPiece?.type === "hole_tile" ? "selected" : ""}
                      ${isActionLocked ? "action-disabled" : ""}
                    `}
                    onClick={onSelectHoleTile}
                    onMouseEnter={() => onTileHover(myHoleTile)}
                    onMouseLeave={() => onTileHover(null)}                    
                  />
                ) : myHoleTile && isHoleTileHidden ? null : (
                  <p>Played</p>
                )}
              </div>
            </div>

            <div className="action-box">
              <h3>Turn Action</h3>
              <div className="hand">
                {drawnTile && !isDrawnTileHidden && getTileImagePath(drawnTile) && (
                  <img
                    ref={(el) => {
                      if (el) actionRefs['drawnTile'] = el;
                      else delete actionRefs['drawnTile'];
                    }}
                    src={getTileImagePath(drawnTile)}
                    alt="Drawn tile"
                    className={`tile-image selected action-required ${isDrawing ? "tile-draw" : ""}`}
                    onMouseEnter={() => onTileHover(drawnTile)}
                    onMouseLeave={() => onTileHover(null)}
                  />
                )}
              </div>

              {showPassButton ? (
                <button type="button" onClick={onPassTurn} className="pass-button">
                  Pass Turn
                </button>
              ) : !isActionLocked && (
                <button
                  type="button"
                  onClick={onDrawTile}
                  disabled={!isMyTurn || !!selectedPiece || gameState.tilesInBag === 0}
                  className="draw-tile-image-btn"
                >
                  <img src="/images/buttons/drawandplacetile.png" alt="Draw & Place Tile" draggable={false} />
                </button>
              )}
            </div>
          </div>

          <div className="action-box">
            <h3>Your Castles</h3>
            <div className="castle-inventory">
              {myCastles.length > 0 ? (
                myCastles.map((castle) => {
                  if (hiddenPieces.has(castle)) return null;
                  const imagePath = getTileImagePath(castle);
                  return imagePath ? (
                    <img
                      ref={(el) => {
                        if (el) actionRefs[castle] = el;
                        else delete actionRefs[castle];
                      }}
                      key={castle}
                      src={imagePath}
                      alt={castle}
                      className={`
                        tile-image 
                        ${selectedPiece?.type === "castle" && selectedPiece.value === castle ? "selected" : ""}
                        ${isActionLocked ? "action-disabled" : ""}
                      `}
                      onClick={() => isMyTurn && onSelectCastle(castle)}
                      onMouseEnter={() => onTileHover(castle)}
                      onMouseLeave={() => onTileHover(null)}
                    />
                  ) : null;
                })
              ) : (
                <p>No castles left!</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
