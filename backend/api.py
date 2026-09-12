# api.py
import json
import os
import random
import logging
import re
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from schemas import (
    JoinRequest, StartGameRequest, PlayerRequest,
    PlaceTileRequest, PlaceCastleRequest, PlaceHoleTileRequest,
    AddBotRequest, RemoveBotRequest, RespondUndoRequest
)
from game import GameState
import state
from ws_manager import manager
from bot_runner import schedule_bot_turns

router = APIRouter()

@router.get("/game_state")
async def get_game_state_endpoint():
    async with state.state_lock:
        if state.game_instance is None:
            return {"has_started": False, "lobby_players": state.lobby_players}
        return state.game_instance.to_dict()

@router.get("/highscores")
async def get_highscores_endpoint():
    scores_by_players = {2: [], 3:[], 4:[]}
    if os.path.exists("highscore.txt"):
        with open("highscore.txt", "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        data = json.loads(line)
                        pc = data.get("players", 2)
                        if pc in scores_by_players:
                            scores_by_players[pc].append(data)
                    except json.JSONDecodeError:
                        pass
    
    result = {}
    for pc in [2, 3, 4]:
        scores_by_players[pc].sort(key=lambda x: x.get("score", 0), reverse=True)
        result[str(pc)] = scores_by_players[pc][:3]
        
    return result

@router.post("/join")
async def join_lobby(request: JoinRequest):
    async with state.state_lock:
        player_name = request.player_name.strip()
        if not player_name or len(player_name) > 20 or not re.match(r'^[a-zA-Z0-9\s]+$', player_name):
            raise HTTPException(400, "Invalid player name (1-20 chars, alphanumeric/spaces only).")
        if any(p['name'] == player_name for p in state.lobby_players):
            raise HTTPException(400, "Player name already taken.")
        if any(p['color'] == request.color for p in state.lobby_players):
            raise HTTPException(400, "Color already taken.")
        if len(state.lobby_players) >= 4:
            raise HTTPException(400, "Lobby is full.")
        
        state.lobby_players.append({
            "name": player_name, 
            "color": request.color
        })
        logging.info(f"Player '{player_name}' joined the lobby.")
    
    await manager.broadcast({"type": "lobby_update", "players": state.lobby_players})
    return {"message": "Joined lobby"}

@router.post("/add_bot")
async def add_bot_endpoint(request: AddBotRequest):
    async with state.state_lock:
        if state.game_instance is not None:
            raise HTTPException(400, "Game already in progress.")
        if not state.lobby_players or state.lobby_players[0]['name'] != request.host_name:
            raise HTTPException(403, "Only the host can add a bot.")
        if len(state.lobby_players) >= 4:
            raise HTTPException(400, "Lobby is full.")

        taken_colors = {p['color'] for p in state.lobby_players}
        available_color = next((c for c in ['red', 'blue', 'green', 'yellow'] if c not in taken_colors), None)
        if not available_color:
            raise HTTPException(400, "No colors available.")

        existing_bot_numbers = []
        for p in state.lobby_players:
            if p.get('isBot'):
                match = re.match(r'^Bot (\d+)$', p['name'])
                if match:
                    existing_bot_numbers.append(int(match.group(1)))
        bot_name = f"Bot {max(existing_bot_numbers, default=0) + 1}"

        state.lobby_players.append({
            "name": bot_name,
            "color": available_color,
            "isBot": True,
            "difficulty": request.difficulty,
        })
        logging.info(f"Bot '{bot_name}' ({request.difficulty}) added to the lobby by {request.host_name}.")

    await manager.broadcast({"type": "lobby_update", "players": state.lobby_players})
    return {"message": "Bot added"}

@router.post("/remove_bot")
async def remove_bot_endpoint(request: RemoveBotRequest):
    async with state.state_lock:
        if state.game_instance is not None:
            raise HTTPException(400, "Game already in progress.")
        if not state.lobby_players or state.lobby_players[0]['name'] != request.host_name:
            raise HTTPException(403, "Only the host can remove a bot.")

        before_count = len(state.lobby_players)
        state.lobby_players = [
            p for p in state.lobby_players
            if not (p['name'] == request.bot_name and p.get('isBot'))
        ]
        if len(state.lobby_players) == before_count:
            raise HTTPException(404, "Bot not found.")
        logging.info(f"Bot '{request.bot_name}' removed from the lobby by {request.host_name}.")

    await manager.broadcast({"type": "lobby_update", "players": state.lobby_players})
    return {"message": "Bot removed"}

@router.post("/start_game")
async def start_game_endpoint(request: StartGameRequest):
    async with state.state_lock:
        if state.game_instance is not None:
            raise HTTPException(400, "Game already in progress.")
        if len(request.players) < 2:
            raise HTTPException(400, "Need at least 2 players to start.")
        
        players_to_start = request.players.copy()
        random.shuffle(players_to_start)

        state.game_instance = GameState(players_to_start, host_name=request.players[0]['name'])
        state.lobby_players = []
        logging.info(f"Game started. Turn order: {[p['name'] for p in players_to_start]}")
        
    await manager.broadcast({"type": "game_started", "game_state": state.game_instance.to_dict()})
    schedule_bot_turns()
    return state.game_instance.to_dict()

@router.post("/draw_tile")
async def draw_tile_endpoint(request: PlayerRequest):
    async with state.state_lock:
        game = state.get_game()
        if game.pending_undo is not None: raise HTTPException(400, "An undo request is pending.")
        if request.player_name != game.get_current_player(): raise HTTPException(400, "Not your turn.")
        tile = game.draw_tile(request.player_name)
    
    await manager.broadcast({
        "type": "game_update_special",
        "action": "tile_drawn",
        "player": request.player_name,
        "tile": tile,
        "tilesInBag": len(game.tile_bag)
    })
    return {"message": "Tile drawn"}

@router.post("/place_tile")
async def place_tile_endpoint(request: PlaceTileRequest):
    async with state.state_lock:
        game = state.get_game()
        if game.pending_undo is not None: raise HTTPException(400, "An undo request is pending.")
        if request.player_name != game.get_current_player(): raise HTTPException(400, "Not your turn.")
        game.place_tile(request.player_name, request.tile, request.row, request.col)
    await manager.broadcast({"type": "game_update", "game_state": game.to_dict()})
    schedule_bot_turns()
    return game.to_dict()

@router.post("/place_castle")
async def place_castle_endpoint(request: PlaceCastleRequest):
    async with state.state_lock:
        game = state.get_game()
        if game.pending_undo is not None: raise HTTPException(400, "An undo request is pending.")
        if request.player_name != game.get_current_player(): raise HTTPException(400, "Not your turn.")
        game.place_castle(request.player_name, request.castle, request.row, request.col)
    await manager.broadcast({"type": "game_update", "game_state": game.to_dict()})
    schedule_bot_turns()
    return game.to_dict()

@router.post("/place_hole_tile")
async def place_hole_tile_endpoint(request: PlaceHoleTileRequest):
    async with state.state_lock:
        game = state.get_game()
        if game.pending_undo is not None: raise HTTPException(400, "An undo request is pending.")
        if request.player_name != game.get_current_player(): raise HTTPException(400, "Not your turn.")
        game.place_hole_tile(request.player_name, request.row, request.col)
    await manager.broadcast({"type": "game_update", "game_state": game.to_dict()})
    schedule_bot_turns()
    return game.to_dict()

@router.post("/pass_turn")
async def pass_turn_endpoint(request: PlayerRequest):
    async with state.state_lock:
        game = state.get_game()
        if game.pending_undo is not None: raise HTTPException(400, "An undo request is pending.")
        if request.player_name != game.get_current_player(): raise HTTPException(400, "Not your turn.")
        game.pass_turn(request.player_name)
    await manager.broadcast({"type": "game_update", "game_state": game.to_dict()})
    schedule_bot_turns()
    return game.to_dict()

@router.post("/start_next_round")
async def start_next_round_endpoint(request: PlayerRequest):
    async with state.state_lock:
        game = state.get_game()
        if game.pending_undo is not None: raise HTTPException(400, "An undo request is pending.")
        if request.player_name != game.host:
            raise HTTPException(403, "Only the host can start the next round.")
        game.start_next_round()
    await manager.broadcast({"type": "game_update", "game_state": game.to_dict()})
    schedule_bot_turns()
    return game.to_dict()

@router.post("/request_undo")
async def request_undo_endpoint(request: PlayerRequest):
    async with state.state_lock:
        game = state.get_game()
        game.request_undo(request.player_name)
        snapshot = game.to_dict()
    await manager.broadcast({"type": "game_update", "game_state": snapshot})
    return snapshot

@router.post("/respond_undo")
async def respond_undo_endpoint(request: RespondUndoRequest):
    async with state.state_lock:
        game = state.get_game()
        resolved = game.respond_undo(request.player_name, request.approve)
        snapshot = game.to_dict()
    await manager.broadcast({"type": "game_update", "game_state": snapshot})
    if resolved:
        # Whether the request was approved (board rolled back) or denied,
        # the table is unblocked again - let any bot whose turn it now is
        # keep playing.
        schedule_bot_turns()
    return snapshot

@router.post("/reset_game")
async def reset_game():
    async with state.state_lock:
        state.game_instance = None
        state.lobby_players = []
        logging.info("Game has been reset.")
    await manager.broadcast({"type": "game_reset"})
    return {"message": "Game reset"}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logging.info("Client disconnected via WebSocketDisconnect.")
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)

