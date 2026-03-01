/**
 * Constants for Tsoro - Pebble Sowing Game.
 */

// Players
export const PLAYER_A = 'A';
export const PLAYER_B = 'B';

// Board dimensions
export const HOLES_PER_PLAYER = 8;
export const GRID_ROWS = 4;
export const GRID_COLS = 4;

// Sowing directions
export const DIRECTION_CW = 'CW';
export const DIRECTION_CCW = 'CCW';

// Default pebble count per hole
export const DEFAULT_PEBBLES = 2;
export const PEBBLE_OPTIONS = [2, 3, 4];

// Timing
export const SOWING_ANIMATION_MS = 400;
export const CHAIN_PAUSE_MS = 600;
export const HAND_MOVE_MS = 350;
export const HAND_DIP_MS = 200;

// FSM States
export const TSORO_FSM_STATES = Object.freeze({
  MENU: 'TSORO_MENU',
  SETUP_PEBBLES: 'TSORO_SETUP_PEBBLES',
  SETUP_BANK_A: 'TSORO_SETUP_BANK_A',
  SETUP_DIRECTION_A: 'TSORO_SETUP_DIRECTION_A',
  SETUP_BANK_B: 'TSORO_SETUP_BANK_B',
  SETUP_DIRECTION_B: 'TSORO_SETUP_DIRECTION_B',
  WAITING_FOR_PICK: 'TSORO_WAITING_FOR_PICK',
  SOWING: 'TSORO_SOWING',
  CHAIN_PICKUP: 'TSORO_CHAIN_PICKUP',
  TURN_COMPLETE: 'TSORO_TURN_COMPLETE',
  GAME_OVER: 'TSORO_GAME_OVER',
});

// Colors
export const TSORO_COLORS = Object.freeze({
  BOARD_BG: '#6B4226',
  BOARD_BORDER: '#3E2314',
  BOARD_SURFACE: '#8B5E3C',
  BOARD_DIVIDER: '#3E2314',

  HOLE_FILL: '#4A2E1A',
  HOLE_BORDER: '#2C1A0E',
  HOLE_SHADOW: 'rgba(0, 0, 0, 0.4)',

  BANK_HIGHLIGHT: '#FFD700',
  BANK_GLOW: 'rgba(255, 215, 0, 0.3)',

  PEBBLE_BASE: '#7A7A7A',
  PEBBLE_LIGHT: '#A0A0A0',
  PEBBLE_DARK: '#4A4A4A',
  PEBBLE_HIGHLIGHT: '#C0C0C0',

  VALID_HOLE: 'rgba(0, 200, 80, 0.4)',
  VALID_HOLE_BORDER: 'rgba(0, 200, 80, 0.7)',
  SELECTED_HOLE: 'rgba(255, 215, 0, 0.5)',
  SELECTED_HOLE_BORDER: 'rgba(255, 215, 0, 0.8)',

  PLAYER_A: '#E8D5B7',
  PLAYER_B: '#1a1a1a',

  TEXT_PRIMARY: '#E8D5B7',
  TEXT_SECONDARY: '#BFA67A',
  TEXT_GOLD: '#FFD700',
});

// Events
export const TSORO_EVENTS = Object.freeze({
  STATE_CHANGED: 'tsoro:stateChanged',
  HOLE_SELECTED: 'tsoro:holeSelected',
  SOWING_START: 'tsoro:sowingStart',
  SOWING_STEP: 'tsoro:sowingStep',
  SOWING_END: 'tsoro:sowingEnd',
  CHAIN_START: 'tsoro:chainStart',
  TURN_CHANGED: 'tsoro:turnChanged',
  GAME_OVER: 'tsoro:gameOver',
});

// Rendering
export const TSORO_CANVAS_PADDING = 30;
export const HOLE_RADIUS_RATIO = 0.38;
