// src/components/HighScore.tsx
import React, { useEffect, useState } from 'react';
import '../styles/components/highscore.css';
import { API_URL } from '../config';

interface ScoreEntry {
  score: number;
  name: string;
  players: number;
}

type ScoresData = Record<string, ScoreEntry[]>;

const embers = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left:  `${8 + (i * 8) % 84}%`,
  dur:   `${2.2 + (i * 0.37) % 2}s`,
  delay: `${(i * 0.3) % 2.5}s`,
  drift: `${-20 + (i * 7) % 40}px`,
}));

const flames = [
  { dur: '0.9s', delay: '0s' },
  { dur: '1.1s', delay: '0.2s' },
  { dur: '0.8s', delay: '0.4s' },
  { dur: '1.0s', delay: '0.1s' },
  { dur: '0.95s', delay: '0.3s' },
];

export function HighScore() {
  const [scoresData, setScoresData] = useState<ScoresData>({});
  const [currentView, setCurrentView] = useState<number>(2);
  const [hasAnyScores, setHasAnyScores] = useState<boolean>(false);

  // Fetch scores on mount
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const res = await fetch(`${API_URL}/highscores`);
        if (!res.ok) return;
        const data: ScoresData = await res.json();
        setScoresData(data);
        if (res.ok) {
          
          const hasTwo = data["2"] && data["2"].length > 0;
          const hasThree = data["3"] && data["3"].length > 0;
          const hasFour = data["4"] && data["4"].length > 0;
          
          setHasAnyScores(hasTwo || hasThree || hasFour);
        }
      } catch (err) {
        console.error('Failed to fetch high scores:', err);
      }
    };
    fetchScores();
  },[]);

  // Cycle the view every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentView((prev) => (prev === 4 ? 2 : prev + 1));
    }, 8000);
    return () => clearInterval(interval);
  },[]);

  // Don't render the box at all if there are no scores yet
  if (!hasAnyScores) {
    return null;
  }

  return (
    <div className="highscore-container">
      <div className="highscore-glow-wrap">
        {/* Added minHeight so the panel doesn't collapse if a category has no scores */}
        <div className="highscore-panel" style={{ minHeight: '260px' }}>

          {/* Ember particles */}
          <div className="embers">
            {embers.map((e) => (
              <div
                key={e.id}
                className="ember"
                style={{
                  '--left':  e.left,
                  '--dur':   e.dur,
                  '--delay': e.delay,
                  '--drift': e.drift,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* Title changes dynamically based on the current view */}
          <div className="highscore-title">Top {currentView}P</div>

          {/* Setting key={currentView} forces React to re-trigger the CSS fade-in animation */}
          <div key={currentView}>
            {scoresData[String(currentView)] && scoresData[String(currentView)].map((entry, idx) => {
              const rank = idx + 1;
              return (
                <div className="score-row" key={rank}>
                  {/* Rank badge */}
                  <div className={`rank-badge rank-${rank}`}>
                    {rank}
                  </div>

                  {/* Score + Player */}
                  <div className="score-info">
                    <div className="score-value">{entry.score.toLocaleString()}</div>
                    <div className="player-name">{entry.name}</div>
                  </div>

                  {/* Crown for #1 */}
                  {rank === 1 && <span className="crown-icon">✦</span>}
                </div>
              );
            })}
          </div>

          {/* Decorative flames */}
          <div className="flame-row">
            {flames.map((f, i) => (
              <span
                key={i}
                className="flame"
                style={{ '--fdur': f.dur, '--fdelay': f.delay } as React.CSSProperties}
              >
                🔥
              </span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
