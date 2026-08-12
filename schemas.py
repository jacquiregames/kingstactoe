# schemas.py
from typing import List, Dict, Any, Literal
from pydantic import BaseModel

class PlayerRequest(BaseModel):
    player_name: str

class PlaceTileRequest(PlayerRequest):
    tile: str
    row: int
    col: int

class PlaceCastleRequest(PlayerRequest):
    castle: str
    row: int
    col: int

class PlaceHoleTileRequest(PlayerRequest):
    row: int
    col: int

class JoinRequest(BaseModel):
    player_name: str
    color: Literal['red', 'blue', 'green', 'yellow']

class StartGameRequest(BaseModel):
    players: List[Dict[str, Any]]

class AddBotRequest(BaseModel):
    host_name: str
    difficulty: Literal['easy', 'normal', 'hard'] = 'normal'

class RemoveBotRequest(BaseModel):
    host_name: str
    bot_name: str
