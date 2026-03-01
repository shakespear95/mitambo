/**
 * Game constants for Zimbabwean Checkers (Damii).
 */

export const BOARD_SIZE = 8;
export const PIECES_PER_PLAYER = 12;

// Players
export const PLAYER_1 = 1; // Dark pieces, moves up (starts at bottom)
export const PLAYER_2 = 2; // Light pieces, moves down (starts at top)

// Piece types
export const REGULAR = 'regular';
export const KING = 'king';

// Cell states
export const EMPTY = null;

// Colors
export const COLORS = Object.freeze({
  BOARD_LIGHT: '#DEB887',      // Burlywood
  BOARD_DARK: '#8B4513',       // Saddle brown
  BOARD_BORDER: '#5C3317',     // Dark wood
  PIECE_DARK: '#1a1a1a',       // Near black
  PIECE_DARK_EDGE: '#333333',
  PIECE_LIGHT: '#E8D5B7',      // Cream
  PIECE_LIGHT_EDGE: '#C4A882',
  KING_CROWN: '#FFD700',       // Gold
  HIGHLIGHT_SELECTED: 'rgba(255, 255, 0, 0.4)',
  HIGHLIGHT_MOVE: 'rgba(0, 255, 0, 0.3)',
  HIGHLIGHT_CAPTURE: 'rgba(255, 0, 0, 0.3)',
  TURN_PLAYER_1: '#1a1a1a',
  TURN_PLAYER_2: '#E8D5B7',
});

// Timing
export const HUKURA_WINDOW_MS = 5000;
export const ANIMATION_DURATION_MS = 300;
export const AI_THINK_DELAY_MS = 500;

// AI Difficulty
export const AI_DEPTH = Object.freeze({
  EASY: 2,
  MEDIUM: 4,
  HARD: 6,
});

// AI Hukura call probability
export const AI_HUKURA_CHANCE = Object.freeze({
  EASY: 0.3,
  MEDIUM: 0.7,
  HARD: 1.0,
});

// Draw condition
export const DRAW_MOVE_LIMIT = 40;

// Rendering
export const CANVAS_PADDING = 20;
export const PIECE_RADIUS_RATIO = 0.38; // Relative to cell size

// Game modes
export const MODE_LOCAL = 'local';
export const MODE_AI = 'ai';

// FSM States
export const FSM_STATES = Object.freeze({
  MENU: 'MENU',
  GAME_SETUP: 'GAME_SETUP',
  WAITING_FOR_MOVE: 'WAITING_FOR_MOVE',
  PIECE_SELECTED: 'PIECE_SELECTED',
  EXECUTING_MOVE: 'EXECUTING_MOVE',
  CAPTURE_SEQUENCE: 'CAPTURE_SEQUENCE',
  HUKURA_WINDOW: 'HUKURA_WINDOW',
  HUKURA_RESOLVE: 'HUKURA_RESOLVE',
  TURN_COMPLETE: 'TURN_COMPLETE',
  CHECK_WIN: 'CHECK_WIN',
  GAME_OVER: 'GAME_OVER',
});

// Events
export const EVENTS = Object.freeze({
  STATE_CHANGED: 'stateChanged',
  PIECE_SELECTED: 'pieceSelected',
  PIECE_DESELECTED: 'pieceDeselected',
  MOVE_MADE: 'moveMade',
  CAPTURE_MADE: 'captureMade',
  PIECE_PROMOTED: 'piecePromoted',
  TURN_CHANGED: 'turnChanged',
  HUKURA_AVAILABLE: 'hukuraAvailable',
  HUKURA_CALLED: 'hukuraCalled',
  HUKURA_EXPIRED: 'hukuraExpired',
  GAME_OVER: 'gameOver',
  GAME_DRAW: 'gameDraw',
  AI_THINKING: 'aiThinking',
  AI_DONE: 'aiDone',
  ANIMATION_START: 'animationStart',
  ANIMATION_END: 'animationEnd',
});
