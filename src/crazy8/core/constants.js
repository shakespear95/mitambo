/**
 * Constants for Crazy 8 card game.
 */

// Players
export const HUMAN = 'human';
export const AI = 'ai';

// Suits
export const SUITS = Object.freeze(['hearts', 'diamonds', 'clubs', 'spades']);

// Ranks (ordered by display)
export const RANKS = Object.freeze([
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
]);

// Cards per hand at deal
export const DEAL_COUNT = 4;

// Direction
export const DIR_FORWARD = 1;
export const DIR_REVERSE = -1;

// Suit colors
export const SUIT_COLORS = Object.freeze({
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
});

// Suit symbols (unicode)
export const SUIT_SYMBOLS = Object.freeze({
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
});

// Special card ranks
export const SPECIAL_RANKS = Object.freeze({
  PICKUP_2: '2',
  SKIP: '7',
  WILD: '8',
  JACK_REVERSE: 'J',
  CARRY_ON: 'K',
  ACE_BLOCK: 'A',
});

// Pickup amounts
export const PICKUP_TWO_AMOUNT = 2;
export const PICKUP_JOKER_AMOUNT = 5;

// Cards you CAN close (win) with
export const CLOSING_RANKS = Object.freeze(['3', '4', '5', '6', '9', '10', 'Q']);

// Cards you CANNOT close with
export const NON_CLOSING_RANKS = Object.freeze(['A', '2', '7', '8', 'J', 'K']);

// Call thresholds
export const CALL_HALF_CARD = 'halfCard';   // 2 cards left
export const CALL_CARD = 'card';             // 1 card left
export const CALL_IN_AIR = 'inAir';          // 0 cards (win)

// FSM States
export const CRAZY8_FSM = Object.freeze({
  MENU: 'CRAZY8_MENU',
  DEALING: 'CRAZY8_DEALING',
  PLAYER_TURN: 'CRAZY8_PLAYER_TURN',
  CARD_SELECTED: 'CRAZY8_CARD_SELECTED',
  CHOOSING_SUIT: 'CRAZY8_CHOOSING_SUIT',
  CARRY_ON: 'CRAZY8_CARRY_ON',
  DRAWING: 'CRAZY8_DRAWING',
  DRAWN_PLAY_OPTION: 'CRAZY8_DRAWN_PLAY_OPTION',
  TURN_COMPLETE: 'CRAZY8_TURN_COMPLETE',
  AI_THINKING: 'CRAZY8_AI_THINKING',
  GAME_OVER: 'CRAZY8_GAME_OVER',
});

// Timing (ms)
export const DEAL_ANIMATION_MS = 120;
export const CARD_PLAY_ANIMATION_MS = 200;
export const AI_THINK_DELAY_MS = 400;
export const DRAW_ANIMATION_MS = 180;
export const DEAL_STAGGER_MS = 80;

// Rendering colors
export const CRAZY8_COLORS = Object.freeze({
  TABLE_BG: '#1B5E20',
  TABLE_FELT: '#2E7D32',
  TABLE_BORDER: '#1B3A1D',

  CARD_FACE: '#FFFFFF',
  CARD_BACK: '#1565C0',
  CARD_BACK_PATTERN: '#0D47A1',
  CARD_BORDER: '#CCCCCC',
  CARD_SHADOW: 'rgba(0, 0, 0, 0.3)',

  CARD_RED: '#D32F2F',
  CARD_BLACK: '#212121',

  JOKER_PURPLE: '#7B1FA2',
  JOKER_GREEN: '#388E3C',

  HIGHLIGHT: 'rgba(255, 215, 0, 0.4)',
  HIGHLIGHT_BORDER: 'rgba(255, 215, 0, 0.8)',
  PLAYABLE: 'rgba(76, 175, 80, 0.15)',
  PLAYABLE_BORDER: 'rgba(76, 175, 80, 0.8)',
  HOVER: 'rgba(255, 255, 255, 0.12)',

  TEXT_PRIMARY: '#E8D5B7',
  TEXT_SECONDARY: '#BFA67A',
  TEXT_GOLD: '#FFD700',

  DRAW_PILE_LABEL: '#BBDEFB',
});

// Canvas layout ratios
export const LAYOUT = Object.freeze({
  AI_HAND_Y: 0.10,        // center of AI hand row
  TABLE_CENTER_Y: 0.40,   // center of piles
  PLAYER_HAND_Y: 0.78,    // center of player hand row
  PILE_SPACING: 0.24,      // horizontal gap between draw/discard piles
  CARD_WIDTH_RATIO: 0.12,  // card width as fraction of canvas width
  CARD_ASPECT: 1.4,        // height / width
  HAND_OVERLAP: 0.45,      // how much cards overlap in hand (fraction of card width)
  MAX_CARD_WIDTH: 90,
});
