// src/App.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketWithReconnect } from './hooks/useWebSocketWithReconnect';
import { useGameTransition } from './hooks/useGameTransition';
import { PRELOAD_IMAGES, PRELOAD_VIDEOS } from './constants/preloadAssets';
import type { GameState, LobbyPlayer, TravelerConfig, BotDifficulty } from './types';
import { Lobby } from './components/Lobby';
import { GameComponent } from './components/GameComponent';
import { HowToPlay } from "./components/HowToPlay"; 
import Travelers from './components/Travelers';
import MediaPreloader from './components/MediaPreloader';
import LoadingScreen from './components/LoadingScreen';
import { travelerConfigs } from './traveler-config'; 
import { API_URL, WS_URL } from './config';

type WsMsg =
  | { type: 'lobby_update'; players: LobbyPlayer[] }
  | { type: 'game_started'; game_state: GameState }
  | { type: 'game_update'; game_state: GameState }
  | { type: 'game_update_special'; action: 'tile_drawn'; player: string; tile: string; tilesInBag: number }
  | { type: 'game_reset' }
  | { type: 'ping' }
  | { type: string; [key: string]: any };

export default function App() {
  const [playerName, setPlayerName] = useState<string>(() => sessionStorage.getItem("playerName") || "");
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fetchCooldown = useRef<number | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false); 
  const [currentTravelers, setCurrentTravelers] = useState<TravelerConfig[]>(travelerConfigs.lobby);
  const [showEndImage, setShowEndImage] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [lobbyVideoError, setLobbyVideoError] = useState(false);
  
  const latestRoundRef = useRef<number>(1);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);

  const {
    videoTransition,
    transitionVideoSrc,
    transitionVideoRef,
    isTransitioningRef,
    startVideoTransition,
    handleTransitionEnd,
    cancelTransition,
  } = useGameTransition({ setGameState, setGameStarted, gameStarted });

  // Safely play/pause the Lobby video
  useEffect(() => {
    if (!gameStarted && !videoTransition && !lobbyVideoError && lobbyVideoRef.current) {
      const playPromise = lobbyVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {}); // Catch silent DOM exceptions on auto-play policies
      }
    } else if (lobbyVideoRef.current) {
      lobbyVideoRef.current.pause();
    }
  }, [gameStarted, videoTransition, lobbyVideoError]);

  const fetchAndSetGameState = useCallback(async () => {
    if (fetchCooldown.current) return;
    fetchCooldown.current = window.setTimeout(() => {
      fetchCooldown.current = null;
    }, 800);

    try {
      const res = await fetch(`${API_URL}/game_state`);
      if (!res.ok) throw new Error("Failed to fetch state from server.");
      const state: GameState & { lobby_players?: LobbyPlayer[] } = await res.json();

      if (state.has_started) {
        latestRoundRef.current = state.round;
        const storedPlayerName = sessionStorage.getItem("playerName");
        const playerInGame = state.players?.some((p: string) => p === storedPlayerName);

        if (storedPlayerName && playerInGame) {
          setPlayerName(storedPlayerName);
          setGameState(state);
          
          if (!isTransitioningRef.current) {
            cancelTransition();
            setGameStarted(true);
          }
        } else {
          sessionStorage.removeItem("playerName");
          setPlayerName("");
          if (!isTransitioningRef.current) setGameStarted(false);
          setGameState(null);
        }
      } else {
        if (!isTransitioningRef.current) setGameStarted(false);
        setGameState(null);
        setLobbyPlayers(state.lobby_players || []);
      }
    } catch (error) {
      console.error("Could not fetch game state:", error);
      setErrorMessage("Failed to connect to the game server.");
    }
  }, [cancelTransition, isTransitioningRef]);

  const handleWebSocketMessage = useCallback((raw: unknown) => {
    const msg = raw as WsMsg;
    if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

    switch (msg.type) {
      case 'lobby_update':
        setLobbyPlayers(msg.players);
        break;
      case 'game_started':
        latestRoundRef.current = msg.game_state.round;
        startVideoTransition(msg.game_state, true);
        break;
      case 'game_update':
        if (msg.game_state.round > latestRoundRef.current && !msg.game_state.isGameOver) {
          latestRoundRef.current = msg.game_state.round;
          startVideoTransition(msg.game_state, false);
        } else {
          latestRoundRef.current = msg.game_state.round;
          if (!isTransitioningRef.current) {
            setGameStarted(true);
          }
          setGameState(msg.game_state);
        }
        break;
      case 'game_update_special': {
        if (msg.action === 'tile_drawn') {
          setGameState(prevState => {
            if (!prevState) return null;
            return {
              ...prevState,
              tilesInBag: msg.tilesInBag,
              pendingDrawTile: {
                ...prevState.pendingDrawTile,
                [msg.player]: msg.tile,
              },
              action: 'tile_drawn',
              player: msg.player,
              tile: msg.tile,
            };
          });
        }
        break;
      }
      case 'game_reset':
        sessionStorage.removeItem("playerName");
        setPlayerName("");
        setLobbyPlayers([]);
        setGameStarted(false);
        setGameState(null);
        latestRoundRef.current = 1;
        cancelTransition();
        break;
    }
    // isTransitioningRef is a ref (stable identity, read at call time — doesn't need to
    // be listed). setLobbyPlayers/setGameStarted/setGameState/setPlayerName are useState
    // setters, guaranteed stable by React. latestRoundRef is a ref. That leaves only
    // startVideoTransition and cancelTransition as real dependencies, and both are already
    // memoized with useCallback inside useGameTransition, so this handler's identity now
    // stays stable across renders.
  }, [startVideoTransition, cancelTransition]);

  useWebSocketWithReconnect({
    url: WS_URL,
    onOpen: fetchAndSetGameState,
    onMessage: handleWebSocketMessage,
  });

  useEffect(() => {
    if (!gameStarted) {
      setCurrentTravelers(travelerConfigs.lobby);
      return;
    }
    if (gameState) {
      if (gameState.isGameOver) {
        setCurrentTravelers(travelerConfigs.summary);
      } else {
        switch (gameState.round) {
          case 1: setCurrentTravelers(travelerConfigs.round1); break;
          case 2: setCurrentTravelers(travelerConfigs.round2); break;
          case 3: setCurrentTravelers(travelerConfigs.round3); break;
          default: setCurrentTravelers([]);
        }
      }
    }
  }, [gameStarted, gameState?.round, gameState?.isGameOver]);

  useEffect(() => {
    if (gameState?.isGameOver) {
      const run2Config = travelerConfigs.summary.find(t => t.src === '/images/fly/run_2.gif');
      if (run2Config && run2Config.duration) {
        const appearTime = run2Config.duration * 0.8; 
        const timer = setTimeout(() => setShowEndImage(true), appearTime);
        return () => clearTimeout(timer);
      } else {
        setShowEndImage(true);
      }
    } else {
      setShowEndImage(false);
    }
  }, [gameState?.isGameOver]);

  useEffect(() => {
    fetchAndSetGameState();
  }, [fetchAndSetGameState]);

  const handleApiCall = useCallback(async (endpoint: string, body: object, errorMessagePrefix: string) => {
    setErrorMessage('');
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });      
      if (!res.ok) {
        let errorMessage = 'Request failed';
        try {
          const data = await res.json();
          errorMessage = data.detail || errorMessage;
        } catch {
          errorMessage = `${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }      
      return await res.json();
    } catch (e: any) {
      setErrorMessage(`${errorMessagePrefix}: ${e.message}`);
      return null;
    }
  }, []);
  
  const handleJoin = async (name: string, color: string) => {
    const result = await handleApiCall('/join', { player_name: name, color }, 'Join Failed');
    if (result) {
      sessionStorage.setItem("playerName", name);
      setPlayerName(name);
      setLobbyPlayers(prev => prev.some(p => p.name === name) ? prev : [...prev, { name, color: color as "red" | "blue" | "green" | "yellow" }]);
      setTimeout(fetchAndSetGameState, 300);
    }
  };
  
  const handleAddBot = async (difficulty: BotDifficulty) => {
    await handleApiCall('/add_bot', { host_name: playerName, difficulty }, 'Add Bot Failed');
  };

  const handleRemoveBot = async (botName: string) => {
    await handleApiCall('/remove_bot', { host_name: playerName, bot_name: botName }, 'Remove Bot Failed');
  };

  const handleActualStartGame = async (currentPlayers: LobbyPlayer[]) => { 
    const result = await handleApiCall('/start_game', { players: currentPlayers }, 'Start Failed');
    if (result) {
      startVideoTransition(result as GameState, true);
    }
  };
  
  const handleReset = async () => {
    await handleApiCall('/reset_game', {}, 'Reset Failed');
  };

  return (
    <>
      <MediaPreloader 
        imageUrls={PRELOAD_IMAGES} 
        videoUrls={PRELOAD_VIDEOS}
        onComplete={() => setTimeout(() => setAssetsLoaded(true), 500)} 
      />      
      {!assetsLoaded && <LoadingScreen />}

      <video
        ref={lobbyVideoRef}
        src="/images/background/background.mp4"
        autoPlay
        loop
        muted
        playsInline
        poster="/images/background/background.png"
        onError={() => setLobbyVideoError(true)}
        style={{
          display: (!gameStarted && !videoTransition && !lobbyVideoError) ? 'block' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -1,
          backgroundColor: 'transparent'
        }}
      />

      <video
        ref={transitionVideoRef}
        src={transitionVideoSrc}
        muted
        playsInline
        onEnded={() => {
          if (transitionVideoSrc !== '/images/background/start.mp4') {
            handleTransitionEnd();
          }
        }}
        style={{
          display: videoTransition ? 'block' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: 9999,
          backgroundColor: 'black'
        }}
      />

      {!videoTransition && <Travelers travelers={currentTravelers} />}
      {!videoTransition && showEndImage && (
        <img src="/images/end.png" alt="End" className="end-image" />
      )}      

      {!videoTransition && showHowToPlay && (
        <HowToPlay onClose={() => setShowHowToPlay(false)} />
      )}

      {!gameStarted && !videoTransition ? (
        <Lobby
          playerName={playerName}
          setPlayerName={setPlayerName}
          lobbyPlayers={lobbyPlayers}
          isHost={lobbyPlayers.length > 0 && lobbyPlayers[0]?.name === playerName}
          errorMessage={errorMessage}
          onJoin={handleJoin}
          onStartGame={handleActualStartGame}
          onShowHowToPlay={() => setShowHowToPlay(true)}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
        />
      ) : gameStarted && !videoTransition && gameState ? (
        <GameComponent
          gameState={gameState}
          playerName={playerName}
          onApiCall={handleApiCall}
          onReset={handleReset}
          onGameStateUpdate={setGameState} 
          onShowHowToPlay={() => setShowHowToPlay(true)}
        />
      ) : !videoTransition ? (
        <div className="waiting-room"></div>
      ) : null}
    </>
  );
}
