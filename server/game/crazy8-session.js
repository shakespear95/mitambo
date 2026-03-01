/**
 * Crazy 8 online game session.
 * Server-authoritative with hidden hand management.
 */
import { GameSession } from './game-session.js';
import { createCrazy8State, updateCrazy8State, getCurrentPlayer } from '../../src/crazy8/core/state.js';
import {
  playCard, declareSuit as declareGameSuit, drawForPlayer,
  applyPickupPenalty, completeTurn, mustPickUp, getPlayerPlayableCards,
  handleCarryOnDraw as handleGameCarryOnDraw,
} from '../../src/crazy8/rules/turn-resolver.js';
import { CRAZY8_FSM, HUMAN, AI } from '../../src/crazy8/core/constants.js';
import { sanitizeStateFor } from './state-sanitizer.js';

export function createSession(room, broadcast) {
  return new Crazy8Session(room, broadcast);
}

class Crazy8Session extends GameSession {
  constructor(room, broadcast) {
    super(room, broadcast);

    // Map UIDs to player IDs used in the game engine
    // We use 'player1' and 'player2' instead of HUMAN/AI for online play
    this.player1Id = 'player1';
    this.player2Id = 'player2';

    this.playerMap = {
      [room.players[0].uid]: this.player1Id,
      [room.players[1].uid]: this.player2Id,
    };
    this.uidMap = {
      [this.player1Id]: room.players[0].uid,
      [this.player2Id]: room.players[1].uid,
    };

    // Create state with custom player IDs (not HUMAN/AI)
    this.state = this._createOnlineState();
  }

  _createOnlineState() {
    // Create a standard state but remap players
    const baseState = createCrazy8State();
    return updateCrazy8State(baseState, {
      players: [this.player1Id, this.player2Id],
      hands: {
        [this.player1Id]: baseState.hands[HUMAN],
        [this.player2Id]: baseState.hands[AI],
      },
      fsmState: CRAZY8_FSM.PLAYER_TURN,
    });
  }

  getInitialState() {
    // Should not be called directly — use getStateForPlayer
    return {};
  }

  getStateForPlayer(uid) {
    const playerId = this.playerMap[uid];
    const playerIds = [this.player1Id, this.player2Id];
    return sanitizeStateFor(this.state, playerId, playerIds);
  }

  async submitMove(uid, payload) {
    if (this.gameOver) {
      return { valid: false, reason: 'Game is over' };
    }

    const playerId = this.playerMap[uid];
    const currentPlayer = getCurrentPlayer(this.state);

    if (currentPlayer !== playerId) {
      return { valid: false, reason: 'Not your turn' };
    }

    const { cardId } = payload;

    // Play the card
    const result = playCard(this.state, cardId);
    if (!result.valid) {
      return { valid: false, reason: 'Cannot play that card' };
    }

    this.state = result.state;
    this.moveCount++;

    // Check for win
    if (this.state.fsmState === CRAZY8_FSM.GAME_OVER) {
      const winnerPlayerId = this.state.winner;
      const winnerUid = this.uidMap[winnerPlayerId];
      this._broadcastState();
      await this.endGame(winnerUid);
      return { valid: true };
    }

    // Need suit choice?
    if (result.needsSuitChoice) {
      this.state = updateCrazy8State(this.state, {
        fsmState: CRAZY8_FSM.CHOOSING_SUIT,
      });
      this._broadcastState();
      return { valid: true };
    }

    // Need carry on?
    if (result.needsCarryOn) {
      this.state = updateCrazy8State(this.state, {
        fsmState: CRAZY8_FSM.CARRY_ON,
      });
      this._broadcastState();
      return { valid: true };
    }

    // Complete the turn
    this.state = completeTurn(this.state, result.skipNext);
    this._fixFsmForOnline();
    this._broadcastState();
    return { valid: true };
  }

  declareSuit(uid, suit) {
    const playerId = this.playerMap[uid];
    if (getCurrentPlayer(this.state) !== playerId) return null;
    if (this.state.fsmState !== CRAZY8_FSM.CHOOSING_SUIT) return null;

    this.state = declareGameSuit(this.state, suit);
    this.state = completeTurn(this.state, false);
    this._fixFsmForOnline();
    this._broadcastState();
    return { valid: true };
  }

  drawCard(uid) {
    const playerId = this.playerMap[uid];
    if (getCurrentPlayer(this.state) !== playerId) return null;

    this.state = drawForPlayer(this.state);

    // If drawn card can be played, wait for player decision
    if (this.state.fsmState === CRAZY8_FSM.DRAWN_PLAY_OPTION) {
      this._broadcastState();
      return { valid: true };
    }

    // Turn complete
    this.state = completeTurn(this.state, false);
    this._fixFsmForOnline();
    this._broadcastState();
    return { valid: true };
  }

  pickupPenalty(uid) {
    const playerId = this.playerMap[uid];
    if (getCurrentPlayer(this.state) !== playerId) return null;

    if (!mustPickUp(this.state)) return null;

    this.state = applyPickupPenalty(this.state);
    this.state = completeTurn(this.state, false);
    this._fixFsmForOnline();
    this._broadcastState();
    return { valid: true };
  }

  carryOnDraw(uid) {
    const playerId = this.playerMap[uid];
    if (getCurrentPlayer(this.state) !== playerId) return null;
    if (this.state.fsmState !== CRAZY8_FSM.CARRY_ON) return null;

    this.state = handleGameCarryOnDraw(this.state);
    this.state = completeTurn(this.state, false);
    this._fixFsmForOnline();
    this._broadcastState();
    return { valid: true };
  }

  /**
   * Fix FSM state for online play.
   * The base rules use AI_THINKING for AI turns — remap to PLAYER_TURN.
   */
  _fixFsmForOnline() {
    if (this.state.fsmState === CRAZY8_FSM.AI_THINKING) {
      this.state = updateCrazy8State(this.state, {
        fsmState: CRAZY8_FSM.PLAYER_TURN,
      });
    }
  }

  _broadcastState() {
    // Send personalized state to each player
    for (const p of this.room.players) {
      if (!p) continue;
      const state = this.getStateForPlayer(p.uid);
      // Use the broadcast's sendToPlayer if available
      this.broadcast({
        type: 'state_update',
        payload: { state },
        targetUid: p.uid,
      });
    }
  }
}
