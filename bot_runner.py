# bot_runner.py
"""
Glue between the HTTP/WebSocket layer (api.py) and the pure bot decision
logic in bot_ai.py.

Whenever a human's move might have handed the turn to a bot (or a bot's turn
should keep chaining into another bot's turn), the relevant endpoint fires off
`schedule_bot_turns()`. That runs in the background so the human's own request
returns immediately - bot moves are then pushed out to everyone (including the
human who just moved) as ordinary `game_update` WebSocket broadcasts, exactly
like any other player's move would be.

A short delay between bot actions keeps things feeling like an opponent is
"thinking" rather than the board instantly filling itself in.
"""
import asyncio
import logging

import state
from ws_manager import manager
from bot_ai import take_bot_turn

# Seconds to pause before each bot action, so moves read as sequential turns
# rather than a single instantaneous jump.
BOT_MOVE_DELAY_SECONDS = 1.1


def schedule_bot_turns() -> None:
    """Fire-and-forget entry point: call this after any state change that
    could leave a bot as the current player."""
    asyncio.create_task(_run_bot_turns())


async def _run_bot_turns() -> None:
    async with state.state_lock:
        if state.bot_turn_in_progress:
            return  # Another invocation is already driving the bot(s) forward.
        state.bot_turn_in_progress = True

    try:
        while True:
            await asyncio.sleep(BOT_MOVE_DELAY_SECONDS)

            async with state.state_lock:
                game = state.game_instance
                if game is None or game.is_round_over or game.is_game_over:
                    return
                if not game.player_is_bot.get(game.get_current_player(), False):
                    return

                acted = take_bot_turn(game)
                snapshot = game.to_dict() if acted else None

            if not acted or snapshot is None:
                return

            await manager.broadcast({"type": "game_update", "game_state": snapshot})
    except Exception as e:
        logging.error(f"Bot turn processing error: {e}")
    finally:
        async with state.state_lock:
            state.bot_turn_in_progress = False
