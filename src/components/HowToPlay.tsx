// src/components/HowToPlay.tsx
import { useEffect } from "react";

export function HowToPlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="howtoplay-overlay" onClick={onClose}>
      <div
        className="howtoplay-popup"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="howtoplay-close" onClick={onClose}>✕</button>

        <h1 className="howtoplay-title">How to Play</h1>

        <div className="howtoplay-columns">
          {/* Column 1 */}
          <div className="howtoplay-column">
            <section>
              <h2 style={{ textAlign: "center" }}>Turn Options</h2>
              <ol>
                <li>Place a castle on the board.</li>
                <li>Draw a tile and place it on the board.</li>
                <li>Place your hole tile on the board.</li>
                <li>No moves possible → Pass.</li>
              </ol>
            </section>

            <section className="scoring-section">
              <h2 style={{ textAlign: "center" }}>Scoring</h2>
              <p>Round ends when the board is full.</p>
              <p>At round end, rows and columns are scored.</p>
              <p><strong>(Row/Col Value) × Castle Rank</strong>.</p>
              <p>Special Tile effects apply.</p>
              <p>Who starts rotates each round (round-robin).</p>
              <p>After <strong>3 rounds</strong>, highest score wins.</p>
            </section>
          </div>

          {/* Column 2 */}
          <div className="howtoplay-column2">
            <section>
              <h2 style={{ textAlign: "center" }}>Number Tiles</h2>
              <div className="tile-grid">
                <TileCard
                  img="/images/tiles/plus3a.webp"
                  title="+ Tiles"
                  desc="Add 1-6 to row/column."
                />
                <TileCard
                  img="/images/tiles/minus2.webp"
                  title="– Tiles"
                  desc="Subtract 1-6 from row/column."
                />
              </div>
            </section>

            <section className="scoring-section">
              <h2 style={{ textAlign: "center" }}>Castles</h2>
              <p>Each player has Rank 1–4 castles in their color. Higher ranks multiply scores.</p>
              <div className="castle-row">
                <img src="/images/castles/blue1.png" alt="Castle Rank 1" />
                <img src="/images/castles/blue2.png" alt="Castle Rank 2" />
                <img src="/images/castles/blue3.png" alt="Castle Rank 3" />
                <img src="/images/castles/blue4.png" alt="Castle Rank 4" />
              </div>
              <p>Rank 2–4 castles can only be used once.</p>
              <p>Rank 1 castles are returned at round end.</p>
            </section>
          </div>

          {/* Column 3 */}
          <div className="howtoplay-column">
            <section>
              <h2 style={{ textAlign: "center" }}>✨ Special Tiles ✨</h2>
              <div className="tile-grid">
                <TileCard
                  img="/images/tiles/mounta.webp"
                  title="Mountain"
                  desc="Blocks line of sight. Scoring stops here."
                />
                <TileCard
                  img="/images/tiles/dragon.webp"
                  title="Dragon"
                  desc="Cancels all positive tiles in that row/col."
                />
                <TileCard
                  img="/images/tiles/goldmine.webp"
                  title="Goldmine"
                  desc="Doubles the total of the row/col."
                />
                <TileCard
                  img="/images/tiles/wizard.webp"
                  title="Wizard"
                  desc="Boosts adjacent castles' rank by +1."
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function TileCard({ img, title, desc }: { img: string; title: string; desc: string }) {
  return (
    <div className="tile-card">
      <img src={img} alt={title} />
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}
