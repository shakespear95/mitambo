/**
 * Tsoro (Pebble Sowing) online game session.
 * Server-authoritative with setup phase coordination.
 */
import { GameSession } from './game-session.js';
import { createTsoroState, updateTsoroState, switchTsoroPlayer } from '../../src/tsoro/core/state.js';
import { getValidHoles, isValidHole } from '../../src/tsoro/rules/move-validator.js';
import { executeFullTurn } from '../../src/tsoro/rules/sowing.js';
import { checkTsoroWinner } from '../../src/tsoro/rules/win-condition.js';
import { PLAYER_A, PLAYER_B, TSORO_FSM_STATES } from '../../src/tsoro/core/constants.js';

export function createSession(room, broadcast) {
  return new TsoroSession(room, broadcast);
}

class TsoroSession extends GameSession {
  constructor(room, broadcast) {
    super(room, broadcast);

    this.playerMap = {
      [room.players[0].uid]: PLAYER_A,
      [room.players[1].uid]: PLAYER_B,
    };
    this.uidMap = {
      [PLAYER_A]: room.players[0].uid,
      [PLAYER_B]: room.players[1].uid,
    };

    this.state = createTsoroState(2);
    this.setupComplete = false;
  }

  getInitialState() {
    return this._serializeState();
  }

  getStateForPlayer(uid) {
    return {
      ...this._serializeState(),
      yourPlayer: this.playerMap[uid],
    };
  }

  /**
   * Handle setup phase choices (pebble count, bank selection, direction).
   */
  handleSetupChoice(uid, payload) {
    const { choice, value } = payload;

    switch (choice) {
      case 'pebbles': {
        // Player 1 picks pebble count
        if (this.playerMap[uid] !== PLAYER_A) return null;
        this.state = createTsoroState(value);
        this.state = updateTsoroState(this.state, {
          fsmState: TSORO_FSM_STATES.SETUP_BANK_A,
        });
        break;
      }

      case 'bank': {
        const player = this.playerMap[uid];
        if (player === PLAYER_A && this.state.fsmState === TSORO_FSM_STATES.SETUP_BANK_A) {
          this.state = updateTsoroState(this.state, {
            setup: { ...this.state.setup, bankA: value },
            fsmState: TSORO_FSM_STATES.SETUP_DIRECTION_A,
          });
        } else if (player === PLAYER_B && this.state.fsmState === TSORO_FSM_STATES.SETUP_BANK_B) {
          this.state = updateTsoroState(this.state, {
            setup: { ...this.state.setup, bankB: value },
            fsmState: TSORO_FSM_STATES.SETUP_DIRECTION_B,
          });
        } else {
          return null;
        }
        break;
      }

      case 'direction': {
        const player = this.playerMap[uid];
        if (player === PLAYER_A && this.state.fsmState === TSORO_FSM_STATES.SETUP_DIRECTION_A) {
          this.state = updateTsoroState(this.state, {
            setup: { ...this.state.setup, directionA: value },
            fsmState: TSORO_FSM_STATES.SETUP_BANK_B,
          });
        } else if (player === PLAYER_B && this.state.fsmState === TSORO_FSM_STATES.SETUP_DIRECTION_B) {
          this.state = updateTsoroState(this.state, {
            setup: { ...this.state.setup, directionB: value },
            fsmState: TSORO_FSM_STATES.WAITING_FOR_PICK,
            currentPlayer: PLAYER_A,
          });

          // Compute valid holes for player A
          const validHoles = getValidHoles(
            this.state.board, PLAYER_A, this.state.setup.bankA
          );
          this.state = updateTsoroState(this.state, { validHoles });
          this.setupComplete = true;
        } else {
          return null;
        }
        break;
      }

      default:
        return null;
    }

    this.broadcast({
      type: 'state_update',
      payload: { state: this._serializeState() },
    });

    return { valid: true };
  }

  async submitMove(uid, payload) {
    if (this.gameOver) {
      return { valid: false, reason: 'Game is over' };
    }

    if (!this.setupComplete) {
      return { valid: false, reason: 'Setup not complete' };
    }

    const gamePlayer = this.playerMap[uid];
    if (this.state.currentPlayer !== gamePlayer) {
      return { valid: false, reason: 'Not your turn' };
    }

    const { holeIndex } = payload;
    const bankIndex = gamePlayer === PLAYER_A
      ? this.state.setup.bankA
      : this.state.setup.bankB;
    const direction = gamePlayer === PLAYER_A
      ? this.state.setup.directionA
      : this.state.setup.directionB;

    // Validate hole selection
    if (!isValidHole(this.state.board, gamePlayer, bankIndex, holeIndex)) {
      return { valid: false, reason: 'Invalid hole' };
    }

    // Execute the full turn
    const result = executeFullTurn(
      this.state.board, gamePlayer, holeIndex, bankIndex, direction
    );

    this.state = updateTsoroState(this.state, {
      board: result.finalBoard,
      lastSowingResult: result,
    });

    this.moveCount++;

    // Check for win
    if (checkTsoroWinner(result.finalBoard, gamePlayer, bankIndex)) {
      const winnerUid = this.uidMap[gamePlayer];
      this.broadcast({
        type: 'state_update',
        payload: {
          state: this._serializeState(),
          sowingSteps: result.allSteps,
        },
      });
      await this.endGame(winnerUid);
      return { valid: true };
    }

    // If the turn ended in the bank, player gets another turn
    if (result.finalOutcome === 'bank') {
      const validHoles = getValidHoles(this.state.board, gamePlayer, bankIndex);
      this.state = updateTsoroState(this.state, {
        validHoles,
        fsmState: TSORO_FSM_STATES.WAITING_FOR_PICK,
      });
    } else {
      // Switch turns
      this.state = switchTsoroPlayer(this.state);

      const nextPlayer = this.state.currentPlayer;
      const nextBankIndex = nextPlayer === PLAYER_A
        ? this.state.setup.bankA
        : this.state.setup.bankB;
      const validHoles = getValidHoles(this.state.board, nextPlayer, nextBankIndex);
      this.state = updateTsoroState(this.state, {
        validHoles,
        fsmState: TSORO_FSM_STATES.WAITING_FOR_PICK,
      });
    }

    this.broadcast({
      type: 'state_update',
      payload: {
        state: this._serializeState(),
        sowingSteps: result.allSteps,
      },
    });

    return { valid: true };
  }

  _serializeState() {
    return {
      board: this.state.board,
      currentPlayer: this.state.currentPlayer,
      fsmState: this.state.fsmState,
      setup: this.state.setup,
      validHoles: this.state.validHoles,
      pebblesPerHole: this.state.pebblesPerHole,
      turnCount: this.state.turnCount,
      winner: this.state.winner,
    };
  }
}
