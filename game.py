# game.py
import json
import random
import string
import os
import logging
import re
from typing import List, Dict, Optional, Any
from fastapi import HTTPException

class GameState:
    def __init__(self, players_data: List[Dict[str, str]], host_name: str = ""):
        self.host = host_name
        self.board = [[None for _ in range(6)] for _ in range(5)]
        self.round = 1
        self.players: List[str] = [p['name'] for p in players_data]
        self.num_players = len(self.players)
        self.current_turn_index = 0
        self.tile_bag = []
        self.player_castles: Dict[str, List[str]] = {p['name']: [] for p in players_data}
        self.total_scores: Dict[str, int] = {p['name']: 50 for p in players_data}
        self.is_round_over = False
        self.last_round_scores: Dict[str, int] = {}
        self.all_round_scores: Dict[str, List[int]] = {p['name']: [] for p in players_data}
        self.is_game_over = False
        self.player_colors: Dict[str, str] = {p['name']: p['color'] for p in players_data}
        self.player_is_bot: Dict[str, bool] = {p['name']: bool(p.get('isBot', False)) for p in players_data}
        self.player_bot_difficulty: Dict[str, str] = {
            p['name']: p.get('difficulty', 'normal') for p in players_data if p.get('isBot')
        }
        self.has_started = True
        self.player_hole_tiles: Dict[str, Optional[str]] = {p['name']: None for p in players_data}
        self.scoring_sequence: List[Dict] = []
        self.game_log: List[str] = ["Game Started."]
        self.log_max_length = 50
        self.pending_draw_tile: Dict[str, Optional[str]] = {p['name']: None for p in players_data}
        self._scores_calculated = False
        self._setup_castles()
        
        self._add_log_entry(f"--- Round 1 Starting ---")
        self._add_log_entry(f"{self.players[0]} goes first!")
        
        self._setup_new_round()

    def _castle_rank(self, castle_tile: str) -> int:
        try:
            return int(castle_tile.split('R')[1][0])
        except (IndexError, ValueError):
            logging.warning(f"Could not parse rank from castle tile: {castle_tile!r}")
            return 1

    def _add_log_entry(self, message: str):
        self.game_log.append(message)
        if len(self.game_log) > self.log_max_length:
            self.game_log.pop(0)
        logging.info(f"[Game Log] {message}")

    def advance_turn(self):
        if self.is_round_over or self.is_game_over:
            return
        for _ in range(len(self.players)):
            self.current_turn_index = (self.current_turn_index + 1) % len(self.players)
            next_player = self.get_current_player()
            if not self.pending_draw_tile.get(next_player) and self._can_player_move(next_player):
                logging.debug(f"Turn advanced to {next_player}")
                return    

    def _compute_castle_final_scores(self, board: List[List[Optional[str]]]) -> Dict[tuple, Dict[str, Any]]:
        """Pure(-ish) scoring core: given any board layout, returns per-castle
        scoring detail (owner, effective rank, row/col contributions, final score).

        This is used both by the real end-of-round scoring pass below and by the
        bot AI (see bot_ai.py), which needs to answer "what would the score be if
        the board looked like this?" for many hypothetical boards without ever
        touching the real game state. To reuse the existing line-of-sight/tile-value
        helpers (which read from self.board), we temporarily swap self.board to the
        supplied board and always restore it afterwards, even if scoring raises.
        """
        original_board = self.board
        self.board = board
        try:
            wizard_pos = self._find_wizard_pos()
            castle_final_scores: Dict[tuple, Dict[str, Any]] = {}

            for r in range(5):
                for c in range(6):
                    tile = board[r][c]
                    if not tile or 'castle' not in self._norm(tile):
                        continue

                    owner = next((p_name for p_name, p_color in self.player_colors.items() if p_color == self.get_castle_color(tile)), None)
                    if not owner: continue

                    row_tiles = self._get_line_of_sight(r, c, 'left') + self._get_line_of_sight(r, c, 'right')
                    col_tiles = self._get_line_of_sight(r, c, 'up') + self._get_line_of_sight(r, c, 'down')

                    row_score = self._get_tile_values_from_line(row_tiles)
                    col_score = self._get_tile_values_from_line(col_tiles)

                    effective_rank = self._castle_rank(tile)
                    if wizard_pos and ((r == wizard_pos[0] and abs(c - wizard_pos[1]) == 1) or (c == wizard_pos[1] and abs(r - wizard_pos[0]) == 1)):
                        effective_rank += 1

                    final_score = (row_score + col_score) * effective_rank
                    castle_final_scores[(r, c)] = {
                        "owner": owner,
                        "pos": (r, c),
                        "rank": effective_rank,
                        "row_score": row_score,
                        "col_score": col_score,
                        "final_score": final_score
                    }
            return castle_final_scores
        finally:
            self.board = original_board

    def score_totals_for_board(self, board: List[List[Optional[str]]]) -> Dict[str, int]:
        """Convenience wrapper around _compute_castle_final_scores: just the
        per-player point totals a board would produce if the round ended right
        now. Used by the bot AI to compare candidate moves; safe to call at any
        time since it never mutates real game state."""
        totals = {p: 0 for p in self.players}
        for castle in self._compute_castle_final_scores(board).values():
            totals[castle["owner"]] += castle["final_score"]
        return totals

    def calculate_scores_and_sequence(self) -> Dict[str, int]:
        round_scores = {p: 0 for p in self.players}
        scoring_sequence = []
        castle_final_scores = self._compute_castle_final_scores(self.board)

        for r_idx in range(5):
            castles_in_row = [
                {"owner": v["owner"], "score": v["row_score"] * v["rank"], "pos": v["pos"]}
                for (r, c), v in castle_final_scores.items() if r == r_idx and v["row_score"] != 0
            ]
            if castles_in_row:
                scoring_sequence.append({"type": "row", "index": r_idx, "castles": sorted(castles_in_row, key=lambda x: x['pos'][1])})

        for c_idx in range(6):
            castles_in_col = [
                {"owner": v["owner"], "score": v["col_score"] * v["rank"], "pos": v["pos"]}
                for (r, c), v in castle_final_scores.items() if c == c_idx and v["col_score"] != 0
            ]
            if castles_in_col:
                scoring_sequence.append({"type": "col", "index": c_idx, "castles": sorted(castles_in_col, key=lambda x: x['pos'][0])})

        for castle in castle_final_scores.values():
            round_scores[castle["owner"]] += castle["final_score"]
        
        self.scoring_sequence = scoring_sequence
        for player, score in round_scores.items():
            self.total_scores[player] += score
            self.all_round_scores[player].append(score)

        self.last_round_scores = round_scores
        logging.info(f"Round scores calculated: {round_scores}")
        return round_scores
        
    def _can_player_move(self, player_name: str) -> bool:
        has_castles   = len(self.player_castles.get(player_name, [])) > 0
        has_hole_tile = self.player_hole_tiles.get(player_name) is not None
        has_drawn_tile = self.pending_draw_tile.get(player_name) is not None
        board_has_empty = any(cell is None for row in self.board for cell in row)
        can_draw = len(self.tile_bag) > 0 and board_has_empty
        return has_castles or has_hole_tile or has_drawn_tile or can_draw

    def _check_round_end(self):
        if self.is_round_over or self._scores_calculated:
            return
        board_full = all(cell is not None for row in self.board for cell in row)
        no_moves   = not any(self._can_player_move(p) for p in self.players)
        if board_full:
            logging.info("Round ended: Board is full.")
        elif no_moves:
            logging.info("Round ended: No players have valid moves.")
        else:
            return
        self._scores_calculated = True
        self.is_round_over = True
        self.last_round_scores = self.calculate_scores_and_sequence()
        self._log_round_summary()
        
    def _deal_hole_tiles(self):
        start_index = self.current_turn_index
        for i in range(len(self.players)):
            player_index = (start_index + i) % len(self.players)
            player_name = self.players[player_index]
            if not self.tile_bag: break
            self.player_hole_tiles[player_name] = self.tile_bag.pop()
            logging.debug(f"Dealt hole tile to {player_name}")

    def draw_tile(self, player_name: str):
        if not self.tile_bag: raise HTTPException(400, "Tile bag is empty.")
        if self.pending_draw_tile.get(player_name): raise HTTPException(400, "You already have a drawn tile.")
        tile = self.tile_bag.pop()
        self.pending_draw_tile[player_name] = tile
        logging.info(f"{player_name} drew tile: {tile}. {len(self.tile_bag)} tiles left.")
        return tile

    def _find_wizard_pos(self) -> Optional[tuple[int, int]]:
        for r in range(5):
            for c in range(6):
                if self._norm(self.board[r][c]) == "wizard":
                    return (r, c)
        return None

    def get_current_player(self):
        return self.players[self.current_turn_index]

    def _get_grid_notation(self, row: int, col: int) -> str:
        row_map = "ABCDE"
        return f"{row_map[row]}{col + 1}"

    def get_castle_color(self, castle_tile: str) -> Optional[str]:
        for color in ['red', 'blue', 'green', 'yellow']:
            if color in castle_tile:
                return color
        return None

    def _get_line_of_sight(self, row: int, col: int, direction: str) -> List[str]:
        line: List[str] = []
        r, c = row, col
        dr, dc = {'up': (-1, 0), 'down': (1, 0), 'left': (0, -1), 'right': (0, 1)}[direction]
        
        nr, nc = r + dr, c + dc
        while 0 <= nr < 5 and 0 <= nc < 6:
            tile = self.board[nr][nc]
            if tile and 'mount' in self._norm(tile): break
            if tile: line.append(tile)
            nr, nc = nr + dr, nc + dc
        return line
            
    def _get_tile_values_from_line(self, line_tiles: List[Optional[str]]) -> int:
        tiles_only = [t for t in line_tiles if t and 'castle' not in self._norm(t)]
        normalized = [self._norm(t) for t in tiles_only]

        has_dragon = 'dragon' in normalized
        base = sum(self._get_tile_value(t, has_dragon) for t in normalized)
        if any('goldmine' in t for t in normalized):
            base *= 2
        return base

    def _get_tile_value(self, tile_norm: str, has_dragon: bool) -> int:
        if 'plus' in tile_norm:
            match = re.search(r"(\d+)", tile_norm)
            if match:
                value = int(match.group(1))
                return 0 if has_dragon else value
        elif 'minus' in tile_norm:
            match = re.search(r"(\d+)", tile_norm)
            if match:
                return -int(match.group(1))
        return 0
            
    def _get_pretty_tile_name(self, tile: str) -> str:
        t = self._norm(tile)
        if "plus" in t:
            val = re.search(r"(\d+)", t)
            return f"+{val.group(1)} tile" if val else "+ tile"
        if "minus" in t:
            val = re.search(r"(\d+)", t)
            return f"-{val.group(1)} tile" if val else "- tile"
        if "mount" in t: return "a Mountain"
        if "dragon" in t: return "the Dragon"
        if "goldmine" in t: return "a Gold Mine"
        if "wizard" in t: return "the Wizard"
        return "an unknown tile"

    def _log_round_summary(self):
        scores = self.last_round_scores
        if not scores:
            return

        self._add_log_entry(f"--- End of Round {self.round} Summary ---")

        max_score = max(scores.values())
        winners = [p for p, s in scores.items() if s == max_score]

        if len(winners) == 1:
            winner_name = winners[0]
            winner_color = self.player_colors[winner_name]
            self._add_log_entry(f"__WINNER__{winner_name}|{winner_color}")
        else:
            self._add_log_entry(f"Round tied between: {', '.join(winners)}")

        sorted_scores = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        for name, score in sorted_scores:
            self._add_log_entry(f"  • {name}: {score} points")
        self._add_log_entry("--------------------")

    def _norm(self, tile: Optional[str]) -> str:
        return tile.lower() if isinstance(tile, str) else ""

    def place_castle(self, player_name: str, castle: str, row: int, col: int):
        if self.pending_draw_tile.get(player_name): raise HTTPException(400, "Must place drawn tile first.")
        if not (0 <= row < 5 and 0 <= col < 6): raise HTTPException(400, "Invalid board position.")
        if self.board[row][col] is not None: raise HTTPException(400, "Cell is not empty.")
        if castle not in self.player_castles.get(player_name, []): raise HTTPException(400, "You do not have that castle.")
        
        self.board[row][col] = castle
        self.player_castles[player_name].remove(castle)
        rank = self._castle_rank(castle)
        location = self._get_grid_notation(row, col)
        self._add_log_entry(f"{player_name} placed a Rank {rank} Castle on {location}.")
        self.advance_turn()
        self._check_round_end()

    def place_hole_tile(self, player_name: str, row: int, col: int):
        if self.pending_draw_tile.get(player_name): raise HTTPException(400, "Must place drawn tile first.")
        if not (0 <= row < 5 and 0 <= col < 6): raise HTTPException(400, "Invalid board position.")
        tile = self.player_hole_tiles.get(player_name)
        if not tile: raise HTTPException(400, "You have no hole tile.")
        if self.board[row][col] is not None: raise HTTPException(400, "Cell is not empty.")

        self.board[row][col] = tile
        self.player_hole_tiles[player_name] = None
        tile_name = self._get_pretty_tile_name(tile)
        location = self._get_grid_notation(row, col)
        self._add_log_entry(f"{player_name} played their hole tile, {tile_name} on {location}.")
        self.advance_turn()
        self._check_round_end()

    def place_tile(self, player_name: str, tile: str, row: int, col: int):
        if self.pending_draw_tile.get(player_name) != tile: raise HTTPException(400, "Invalid tile.")
        if not (0 <= row < 5 and 0 <= col < 6): raise HTTPException(400, "Invalid board position.")
        if self.board[row][col] is not None: raise HTTPException(400, "Cell is not empty.")
        
        self.board[row][col] = tile
        self.pending_draw_tile[player_name] = None 
        tile_name = self._get_pretty_tile_name(tile)
        location = self._get_grid_notation(row, col)
        self._add_log_entry(f"{player_name} drew and placed {tile_name} on {location}.")
        self.advance_turn()
        self._check_round_end()
        
    def _setup_castles(self):
        rank_counts = {2: {1: 4, 2: 3, 3: 2, 4: 1}, 3: {1: 3, 2: 3, 3: 2, 4: 1}, 4: {1: 2, 2: 3, 3: 2, 4: 1}}
        castle_counts = rank_counts.get(self.num_players, {})
        for player_name in self.players:
            color = self.player_colors[player_name]
            for rank, count in castle_counts.items():
                suffixes = string.ascii_lowercase[:count]
                for suffix in suffixes:
                    self.player_castles[player_name].append(f"{color}CastleR{rank}{suffix}")
        logging.debug(f"Player castles setup: {self.player_castles}")

    def _setup_new_round(self):
        unplayed_hole_tiles = [tile for tile in self.player_hole_tiles.values() if tile]
        self.player_hole_tiles = {p: None for p in self.players}

        all_resource_tiles = [f"plus{i}{j}" for i in range(1, 7) for j in ["a", "b"]]
        all_hazard_tiles = [f"minus{i}" for i in range(1, 7)]
        all_special_tiles = ["mounta", "mountb", "dragon", "goldmine", "wizard"]
        complete_tile_set = all_resource_tiles + all_hazard_tiles + all_special_tiles

        tiles_for_fresh_bag = [tile for tile in complete_tile_set if tile not in unplayed_hole_tiles]
        self.tile_bag = tiles_for_fresh_bag + unplayed_hole_tiles
        random.shuffle(self.tile_bag)
        logging.info(f"New round setup. Total: {len(self.tile_bag)}.")
        self._deal_hole_tiles()

    def _save_highscores(self):
        try:
            with open("highscore.txt", "a") as f:
                for player_name, score in self.total_scores.items():
                    if self.player_is_bot.get(player_name):
                        continue  # Bots don't compete for the LAN party leaderboard
                    record = {
                        "name": player_name,
                        "score": score,
                        "players": self.num_players
                    }
                    f.write(json.dumps(record) + "\n")
        except Exception as e:
            logging.error(f"Failed to save high scores: {e}")
        
    def start_next_round(self):
        if not self.is_round_over:
            logging.warning("Attempted to start next round before the current one was over.")
            return
        for player in self.players:
            if player not in self.last_round_scores:
                self.last_round_scores[player] = 0
                self.all_round_scores[player].append(0)
        if self.round >= 3:
            self.is_game_over = True
            logging.info("Game over. Maximum rounds reached.")
            self._save_highscores()
            return

        self.current_turn_index = self.round % self.num_players
        next_player = self.players[self.current_turn_index]
        logging.info(f"{next_player} will start Round {self.round + 1}.")
        self._add_log_entry(f"{next_player} starts this round.")

        for r in range(5):
            for c in range(6):
                tile = self.board[r][c]
                if not tile: continue
                tn = self._norm(tile)
                if 'castler1' in tn:
                    castle_color = self.get_castle_color(tile)
                    owner = next((p_name for p_name, p_color in self.player_colors.items() if p_color == castle_color), None)
                    if owner:
                        self.player_castles[owner].append(tile)
                        logging.debug(f"Returned Rank 1 castle {tile} to {owner}.")

        self.round += 1
        self.board = [[None for _ in range(6)] for _ in range(5)]
        self.is_round_over = False
        self.last_round_scores = {}
        self._scores_calculated = False
        self._add_log_entry(f"--- Round {self.round} Starting ---")
        self._setup_new_round()

    def to_dict(self):
        return {
            "board":           self.board,
            "currentPlayer":   self.get_current_player(),
            "round":           self.round,
            "tilesInBag":      len(self.tile_bag),
            "players":         self.players,
            "hostPlayer":      self.host,
            "playerCastles":   self.player_castles,
            "totalScores":     self.total_scores,
            "isRoundOver":     self.is_round_over,
            "lastRoundScores": self.last_round_scores,
            "allRoundScores":  self.all_round_scores,
            "isGameOver":      self.is_game_over,
            "playerColors":    self.player_colors,
            "playerIsBot":     self.player_is_bot,
            "has_started":     self.has_started,
            "playerHoleTiles": self.player_hole_tiles,
            "scoringSequence": self.scoring_sequence,
            "gameLog":         self.game_log,
            "pendingDrawTile": self.pending_draw_tile,
        }
