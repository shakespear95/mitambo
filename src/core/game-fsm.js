/**
 * Game-specific FSM states & transitions for Zimbabwean Checkers.
 */
import { FSM_STATES } from './constants.js';
import { createFSM } from './fsm.js';

const S = FSM_STATES;

export function createGameFSM() {
  return createFSM({
    transitions: {
      [S.MENU]: {
        startGame: S.GAME_SETUP,
      },
      [S.GAME_SETUP]: {
        setupComplete: S.WAITING_FOR_MOVE,
      },
      [S.WAITING_FOR_MOVE]: {
        selectPiece: S.PIECE_SELECTED,
      },
      [S.PIECE_SELECTED]: {
        deselectPiece: S.WAITING_FOR_MOVE,
        selectPiece: S.PIECE_SELECTED, // Select a different piece
        executeMove: S.EXECUTING_MOVE,
      },
      [S.EXECUTING_MOVE]: {
        captureMove: S.CAPTURE_SEQUENCE,
        normalMove: (ctx) => {
          // After normal move, open hukura window if opponent had captures
          if (ctx && ctx.missedCaptures && ctx.missedCaptures.length > 0) {
            return S.HUKURA_WINDOW;
          }
          return S.TURN_COMPLETE;
        },
        animating: S.EXECUTING_MOVE, // Stay while animating
      },
      [S.CAPTURE_SEQUENCE]: {
        continueCapture: S.CAPTURE_SEQUENCE, // More jumps to make
        captureComplete: (ctx) => {
          if (ctx && ctx.missedCaptures && ctx.missedCaptures.length > 0) {
            return S.HUKURA_WINDOW;
          }
          return S.TURN_COMPLETE;
        },
      },
      [S.HUKURA_WINDOW]: {
        hukuraCalled: S.HUKURA_RESOLVE,
        hukuraExpired: S.TURN_COMPLETE,
      },
      [S.HUKURA_RESOLVE]: {
        hukuraResolved: S.TURN_COMPLETE,
      },
      [S.TURN_COMPLETE]: {
        checkWin: S.CHECK_WIN,
      },
      [S.CHECK_WIN]: {
        continueGame: S.WAITING_FOR_MOVE,
        gameOver: S.GAME_OVER,
      },
      [S.GAME_OVER]: {
        restart: S.MENU,
      },
    },
  });
}
