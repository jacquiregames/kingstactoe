# bot_ai.py
"""
Computer opponent logic for Kings-Tac-Toe.

The bot never gets special access to hidden information it shouldn't have -
it only ever "knows" what a human player in its seat would know: the board,
its own hand (hole tile + castles), and the *contents* of the shared tile bag
(the bag order is secret, but which tiles remain in it is not — a human could
in principle keep a tally, so it's fair game for the bot too).

Strategy, in a nutshell:
  1. For every piece the bot could legally place this turn (its hole tile,
     each castle it holds, or - if it draws - each tile it might draw), try
     every empty cell and ask GameState.score_totals_for_board(): "if the
     round ended with the board in this hypothetical state, who'd have how
     many points?" That reuses the game's real scoring rules exactly, so the
     bot automatically understands mountains blocking line-of-sight, the
     wizard's rank bonus, gold mines doubling a line, the dragon zeroing out
     plus-tiles, etc. without any of those rules being re-implemented here.
  2. Score each candidate move as (my hypothetical total) minus a weighted
     share of the best opponent's hypothetical total, so the bot both builds
     its own position and leans on whichever rival is currently ahead.
  3. Drawing a fresh tile is itself a candidate "action" whose value is the
     *expected* value over the tiles actually left in the bag (grouped by
     effect, e.g. all "+3" tiles are equivalent) rather than a guess.
  4. A small amount of randomness ("jitter") is mixed into every candidate's
     score so the bot doesn't play a rigid, perfectly repeatable line and
     feels more like a scrappy LAN-party opponent than a solver.
  5. Difficulty ("easy" / "normal" / "hard") just tunes how much the bot
     weighs blocking opponents vs. how much randomness it plays with.
"""
import random
import re
from typing import Dict, List, Optional, Tuple

from game import GameState

# How much a candidate move's score is discounted by the strongest opponent's
# resulting hypothetical score, and how much random "personality" noise gets
# mixed in, per difficulty level.
_DIFFICULTY_SETTINGS = {
    "easy":   {"opponent_weight": 0.15, "jitter": 6.0},
    "normal": {"opponent_weight": 0.45, "jitter": 3.0},
    "hard":   {"opponent_weight": 0.75, "jitter": 0.75},
}
_DEFAULT_DIFFICULTY = "normal"


def _settings_for(game: GameState, player: str) -> Dict[str, float]:
    difficulty = game.player_bot_difficulty.get(player, _DEFAULT_DIFFICULTY)
    return _DIFFICULTY_SETTINGS.get(difficulty, _DIFFICULTY_SETTINGS[_DEFAULT_DIFFICULTY])


def _empty_cells(game: GameState) -> List[Tuple[int, int]]:
    return [(r, c) for r in range(5) for c in range(6) if game.board[r][c] is None]


def _tile_class(norm_tile: str) -> str:
    """Collapses a tile down to the thing that actually matters for scoring
    (e.g. 'plus3a' and 'plus3b' behave identically), so we don't waste time
    evaluating functionally-duplicate tiles separately."""
    if 'plus' in norm_tile:
        match = re.search(r"(\d+)", norm_tile)
        return f"plus{match.group(1)}" if match else "plus"
    if 'minus' in norm_tile:
        match = re.search(r"(\d+)", norm_tile)
        return f"minus{match.group(1)}" if match else "minus"
    if 'mount' in norm_tile:
        return "mountain"
    if 'dragon' in norm_tile:
        return "dragon"
    if 'goldmine' in norm_tile:
        return "goldmine"
    if 'wizard' in norm_tile:
        return "wizard"
    return norm_tile


def _get_piece_cost(kind: str, piece_val: str = "") -> float:
    """Assign an intrinsic cost to playing finite resources to prevent burning them early."""
    if kind == "hole_tile":
        return 8.0  # Worth saving for a decent setup
    if kind == "castle":
        try:
            rank = int(piece_val.split('R')[1][0])
            # Rank 1 is free (it comes back). Rank 2-4 cost points to use.
            return {1: 0.0, 2: 4.0, 3: 8.0, 4: 15.0}.get(rank, 0.0)
        except (IndexError, ValueError):
            return 0.0
    return 0.0  # Drawing a tile costs nothing from your inventory


def _evaluate_placement(game: GameState, player: str, piece: str, row: int, col: int, opponent_weight: float) -> float:
    """Scores a single hypothetical (piece, cell) placement for `player`."""
    trial_board = [r[:] for r in game.board]
    trial_board[row][col] = piece
    round_totals = game.score_totals_for_board(trial_board)

    # Combine total accumulated scores with hypothetical round scores
    my_score = game.total_scores.get(player, 0) + round_totals.get(player, 0)
    
    opponents = [p for p in game.players if p != player]
    opponent_best = max((game.total_scores.get(p, 0) + round_totals.get(p, 0) for p in opponents), default=0)

    return my_score - (opponent_weight * opponent_best)


def _best_cell_for_piece(
    game: GameState, player: str, piece: str, empty_cells: List[Tuple[int, int]], opponent_weight: float
) -> Tuple[Optional[int], Optional[int], float]:
    """Finds the single best empty cell for a specific, known piece."""
    best_value: Optional[float] = None
    best_cell: Tuple[Optional[int], Optional[int]] = (None, None)

    # Shuffle to ensure ties are broken randomly, removing geographic bias
    shuffled_cells = empty_cells[:]
    random.shuffle(shuffled_cells)

    for (r, c) in shuffled_cells:
        value = _evaluate_placement(game, player, piece, r, c, opponent_weight)
        if best_value is None or value > best_value:
            best_value = value
            best_cell = (r, c)

    return best_cell[0], best_cell[1], (best_value if best_value is not None else float("-inf"))


def _expected_draw_value(game: GameState, player: str, empty_cells: List[Tuple[int, int]], opponent_weight: float) -> float:
    """The expected value of drawing a tile, computed exactly from the actual
    remaining bag contents (grouped by scoring-equivalent class) rather than a
    blind guess - the bot doesn't know the bag's order, but the *composition*
    of a shuffled bag is fair knowledge, just like a sharp human player could
    reasonably track it."""
    bag = game.tile_bag
    if not bag:
        return float("-inf")

    class_counts: Dict[str, int] = {}
    class_representative: Dict[str, str] = {}
    for tile in bag:
        cls = _tile_class(game._norm(tile))
        class_counts[cls] = class_counts.get(cls, 0) + 1
        class_representative.setdefault(cls, tile)

    total = len(bag)
    expected = 0.0
    for cls, count in class_counts.items():
        rep_tile = class_representative[cls]
        _, _, value = _best_cell_for_piece(game, player, rep_tile, empty_cells, opponent_weight)
        expected += (count / total) * value

    return expected


def _choose_best_action(game: GameState, player: str) -> Optional[dict]:
    empty_cells = _empty_cells(game)
    if not empty_cells:
        return None

    settings = _settings_for(game, player)
    opponent_weight = settings["opponent_weight"]
    jitter = settings["jitter"]

    def with_jitter(value: float) -> float:
        return value + random.uniform(-jitter, jitter)

    candidates: List[Tuple[float, dict]] = []

    hole_tile = game.player_hole_tiles.get(player)
    if hole_tile:
        row, col, value = _best_cell_for_piece(game, player, hole_tile, empty_cells, opponent_weight)
        if row is not None:
            cost = _get_piece_cost("hole_tile")
            candidates.append((with_jitter(value - cost), {"kind": "hole_tile", "row": row, "col": col}))

    for castle in game.player_castles.get(player, []):
        row, col, value = _best_cell_for_piece(game, player, castle, empty_cells, opponent_weight)
        if row is not None:
            cost = _get_piece_cost("castle", castle)
            candidates.append((with_jitter(value - cost), {"kind": "castle", "castle": castle, "row": row, "col": col}))

    if game.tile_bag:
        draw_value = _expected_draw_value(game, player, empty_cells, opponent_weight)
        candidates.append((with_jitter(draw_value), {"kind": "draw"}))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def take_bot_turn(game: GameState) -> bool:
    """Executes exactly one bot "turn" for whoever is currently up: either a
    single placement (hole tile / castle / draw-then-place) or a pass if no
    move is available. Mutates `game` via its normal public methods, so bot
    moves go through the exact same validation, logging, turn-advancement,
    and round-end checks as a human's would.

    Returns True if the current player was a bot and something happened
    (including passing), False if there was nothing for this function to do
    (not a bot's turn, or the round/game has already ended).
    """
    if game.is_round_over or game.is_game_over:
        return False

    player = game.get_current_player()
    if not game.player_is_bot.get(player, False):
        return False

    # Edge case: a tile was drawn but not yet placed (e.g. picked back up after
    # a server restart mid-turn). Finish placing it before anything else.
    pending_tile = game.pending_draw_tile.get(player)
    if pending_tile:
        empty_cells = _empty_cells(game)
        if not empty_cells:
            return False
        opponent_weight = _settings_for(game, player)["opponent_weight"]
        row, col, _ = _best_cell_for_piece(game, player, pending_tile, empty_cells, opponent_weight)
        if row is None:
            # Safety fallback to prevent soft-locks
            game._add_log_entry(f"{player} encountered an anomaly and passes.")
            game.advance_turn()
            game._check_round_end()
            return True
        game.place_tile(player, pending_tile, row, col)
        return True

    action = _choose_best_action(game, player)
    if action is None:
        game._add_log_entry(f"{player} has no valid moves and passes.")
        game.advance_turn()
        game._check_round_end()
        return True

    kind = action["kind"]
    if kind == "hole_tile":
        game.place_hole_tile(player, action["row"], action["col"])
    elif kind == "castle":
        game.place_castle(player, action["castle"], action["row"], action["col"])
    elif kind == "draw":
        tile = game.draw_tile(player)
        empty_cells = _empty_cells(game)
        opponent_weight = _settings_for(game, player)["opponent_weight"]
        row, col, _ = _best_cell_for_piece(game, player, tile, empty_cells, opponent_weight)
        if row is None:
            # Safety fallback to prevent soft-locks 
            game._add_log_entry(f"{player} encountered an anomaly and passes.")
            game.advance_turn()
            game._check_round_end()
            return True
        game.place_tile(player, tile, row, col)

    return True
