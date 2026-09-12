# state.py
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from game import GameState

# --- Global State ---
state_lock = asyncio.Lock()
lobby_players: List[Dict[str, Any]] = []
game_instance: Optional[GameState] = None
bot_turn_in_progress: bool = False

def get_game() -> GameState:
    global game_instance
    if game_instance is None:
        raise HTTPException(status_code=404, detail="No active game found")
    return game_instance
