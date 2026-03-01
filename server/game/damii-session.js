/**
 * Damii (Zimbabwean Checkers) online game session.
 * Server-authoritative: validates all moves using existing rules modules.
 */
import { GameSession } from './game-session.js';
import { createGameState, updateState, switchPlayer, recordCapture, incrementMoveCounter } from '../../src/core/state.js';
import { getLegalMoves, getAllMovesForPlayer } from '../../src/rules/move-generator.js';
import { applyMove } from '../../src/ai/apply-move.js';
import { checkWinner, checkDraw } from '../../src/rules/win-condition.js';
import { detectMissedCapture } from '../../src/hukura/hukura-detector.js';
import { getPiece, removePiece } from '../../src/core/board.js';
import { PLAYER_1, PLAYER_2, FSM_STATES } from '../../src/core/constants.js';

export function createSession(room, broadcast) {
  return new DamiiSession(room, broadcast);
}

class DamiiSession extends GameSession {
  constructor(room, broadcast) {
    super(room, broadcast);

    // Player 1 (host) is dark pieces (PLAYER_1), player 2 is light
    this.playerMap = {
      [room.players[0].uid]: PLAYER_1,
      [room.players[1].uid]: PLAYER_2,
    };
    this.uidMap = {
      [PLAYER_1]: room.players[0].uid,
      [PLAYER_2]: room.players[1].uid,
    };

    // Initialize game state
    this.state = createGameState('online');
    this.state = updateState(this.state, { fsmState: FSM_STATES.WAITING_FOR_MOVE });

    // Hukura tracking
    this.hukuraActive = false;
    this.hukuraTimer = null;
    this.lastMissedCapture = null;
  }

  getInitialState() {
    return this._serializeState();
  }

  getStateForPlayer(uid) {
    return {
      ...this._serializeState(),
      yourColor: this.playerMap[uid],
    };
  }

  async submitMove(uid, payload) {
    if (this.gameOver) {
      return { valid: false, reason: 'Game is over' };
    }

    // Check if it's a hukura call
    if (payload.action === 'hukura_call') {
      return this._handleHukuraCall(uid);
    }

    const gamePlayer = this.playerMap[uid];
    if (!gamePlayer) {
      return { valid: false, reason: 'Not a player in this game' };
    }

    // Check turn
    if (this.state.currentPlayer !== gamePlayer) {
      return { valid: false, reason: 'Not your turn' };
    }

    // Hukura window active — can't move yet
    if (this.hukuraActive) {
      return { valid: false, reason: 'Waiting for hukura window' };
    }

    const { from, to } = payload;

    // Validate the move
    const legalMoves = getLegalMoves(this.state.board, from.row, from.col);
    const matchingMove = legalMoves.find(
      m => m.to.row === to.row && m.to.col === to.col
    );

    if (!matchingMove) {
      return { valid: false, reason: 'Illegal move' };
    }

    // Detect missed capture BEFORE applying the move
    const missedCapture = detectMissedCapture(this.state.board, gamePlayer, matchingMove);

    // Apply the move
    let newBoard = applyMove(this.state.board, matchingMove);

    this.state = updateState(this.state, {
      board: newBoard,
      selectedPiece: null,
      legalMoves: [],
      lastMove: matchingMove,
    });

    if (matchingMove.isCapture) {
      const opponent = gamePlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;
      this.state = recordCapture(this.state, opponent);
    } else {
      this.state = incrementMoveCounter(this.state);
    }

    this.moveCount++;

    // Check for hukura
    if (missedCapture) {
      this.hukuraActive = true;
      this.lastMissedCapture = { player: gamePlayer, move: matchingMove };

      // Start 5s hukura window
      this.hukuraTimer = setTimeout(() => {
        this._expireHukura().catch(() => {});
      }, 5000);

      // Broadcast state with hukura info
      this.broadcast({
        type: 'state_update',
        payload: {
          state: this._serializeState(),
          move: { from, to },
          hukura: {
            active: true,
            offendingPlayer: gamePlayer,
            timeMs: 5000,
          },
        },
      });

      return { valid: true };
    }

    // Complete the turn
    return this._completeTurn(matchingMove, from, to);
  }

  async _handleHukuraCall(callingUid) {
    if (!this.hukuraActive || !this.lastMissedCapture) {
      return { valid: false, reason: 'No hukura available' };
    }

    const callingPlayer = this.playerMap[callingUid];
    const offendingPlayer = this.lastMissedCapture.player;

    // Only opponent can call hukura
    if (callingPlayer === offendingPlayer) {
      return { valid: false, reason: 'Cannot call hukura on yourself' };
    }

    // Clear hukura timer
    if (this.hukuraTimer) {
      clearTimeout(this.hukuraTimer);
      this.hukuraTimer = null;
    }

    const move = this.lastMissedCapture.move;

    // Remove the offending piece
    const piece = getPiece(this.state.board, move.to.row, move.to.col);
    if (piece && piece.player === offendingPlayer) {
      let newBoard = removePiece(this.state.board, move.to.row, move.to.col);
      this.state = updateState(this.state, { board: newBoard });
      this.state = recordCapture(this.state, offendingPlayer);
    }

    this.hukuraActive = false;
    this.lastMissedCapture = null;

    // Now complete the turn
    return this._completeTurn(move, move.from, move.to, true);
  }

  async _expireHukura() {
    this.hukuraActive = false;
    this.hukuraTimer = null;
    this.lastMissedCapture = null;

    // Complete the turn without penalty
    await this._completeTurn(this.state.lastMove, this.state.lastMove?.from, this.state.lastMove?.to);
  }

  async _completeTurn(move, from, to, hukuraCalled = false) {
    const currentPlayer = this.state.currentPlayer;
    const winner = checkWinner(this.state.board, currentPlayer);
    const drawReason = checkDraw(this.state.movesSinceCapture);

    if (winner) {
      const winnerUid = this.uidMap[winner];
      await this.endGame(winnerUid);
      return { valid: true };
    }

    if (drawReason) {
      await this.endGame(null, 'draw');
      return { valid: true };
    }

    // Switch turns
    this.state = switchPlayer(this.state);
    this.state = updateState(this.state, {
      fsmState: FSM_STATES.WAITING_FOR_MOVE,
    });

    this.broadcast({
      type: 'state_update',
      payload: {
        state: this._serializeState(),
        move: from && to ? { from, to } : null,
        hukura: hukuraCalled ? { called: true } : null,
      },
    });

    return { valid: true };
  }

  _serializeState() {
    return {
      board: this.state.board,
      currentPlayer: this.state.currentPlayer,
      lastMove: this.state.lastMove,
      movesSinceCapture: this.state.movesSinceCapture,
      capturedPieces: this.state.capturedPieces,
      totalMoves: this.state.totalMoves,
      fsmState: this.state.fsmState,
    };
  }
}
