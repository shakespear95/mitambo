/**
 * Procedural sound definitions using Web Audio API.
 */

export const SoundDefs = Object.freeze({
  move: {
    type: 'noise',
    frequency: 400,
    duration: 0.08,
    volume: 0.15,
    decay: 0.06,
  },
  capture: {
    type: 'impact',
    frequency: 200,
    duration: 0.15,
    volume: 0.3,
    decay: 0.12,
  },
  select: {
    type: 'click',
    frequency: 800,
    duration: 0.04,
    volume: 0.1,
    decay: 0.03,
  },
  promote: {
    type: 'fanfare',
    frequency: 523,
    duration: 0.4,
    volume: 0.2,
    decay: 0.35,
  },
  hukura: {
    type: 'alert',
    frequency: 300,
    duration: 0.3,
    volume: 0.25,
    decay: 0.2,
  },
  gameOver: {
    type: 'fanfare',
    frequency: 440,
    duration: 0.8,
    volume: 0.25,
    decay: 0.7,
  },
  error: {
    type: 'buzz',
    frequency: 150,
    duration: 0.15,
    volume: 0.1,
    decay: 0.1,
  },
  cardPlay: {
    type: 'click',
    frequency: 600,
    duration: 0.06,
    volume: 0.15,
    decay: 0.04,
  },
  cardDraw: {
    type: 'noise',
    frequency: 500,
    duration: 0.06,
    volume: 0.1,
    decay: 0.04,
  },
});
