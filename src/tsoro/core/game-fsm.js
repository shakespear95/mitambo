/**
 * Tsoro FSM transition definitions.
 * Uses the generic FSM engine from src/core/fsm.js.
 */
import { createFSM } from '../../core/fsm.js';
import { TSORO_FSM_STATES } from './constants.js';

const S = TSORO_FSM_STATES;

export const tsoroFSM = createFSM({
  transitions: {
    [S.MENU]: {
      START_SETUP: S.SETUP_PEBBLES,
    },
    [S.SETUP_PEBBLES]: {
      PEBBLES_CHOSEN: S.SETUP_BANK_A,
    },
    [S.SETUP_BANK_A]: {
      BANK_A_CHOSEN: S.SETUP_DIRECTION_A,
    },
    [S.SETUP_DIRECTION_A]: {
      DIRECTION_A_CHOSEN: S.SETUP_BANK_B,
    },
    [S.SETUP_BANK_B]: {
      BANK_B_CHOSEN: S.SETUP_DIRECTION_B,
    },
    [S.SETUP_DIRECTION_B]: {
      DIRECTION_B_CHOSEN: S.WAITING_FOR_PICK,
    },
    [S.WAITING_FOR_PICK]: {
      HOLE_PICKED: S.SOWING,
    },
    [S.SOWING]: {
      SOW_COMPLETE_BANK: S.TURN_COMPLETE,
      SOW_COMPLETE_EMPTY: S.TURN_COMPLETE,
      SOW_COMPLETE_CHAIN: S.CHAIN_PICKUP,
    },
    [S.CHAIN_PICKUP]: {
      CHAIN_CONTINUE: S.SOWING,
    },
    [S.TURN_COMPLETE]: {
      WINNER_FOUND: S.GAME_OVER,
      NEXT_TURN: S.WAITING_FOR_PICK,
    },
    [S.GAME_OVER]: {
      PLAY_AGAIN: S.SETUP_PEBBLES,
      BACK_TO_MENU: S.MENU,
    },
  },
});
