/**
 * Hukura window state management.
 * Tracks the 5-second window where the opponent can call Hukura.
 */
import { HUKURA_WINDOW_MS, PLAYER_1, PLAYER_2 } from '../core/constants.js';

export function createHukuraManager(eventBus) {
  let active = false;
  let timerStart = null;
  let timerId = null;
  let offendingPlayer = null; // Player who missed the capture
  let missedPiecePosition = null; // Position of piece that should have captured

  function startWindow(player, piecePos) {
    active = true;
    offendingPlayer = player;
    missedPiecePosition = piecePos;
    timerStart = Date.now();

    timerId = setTimeout(() => {
      expire();
    }, HUKURA_WINDOW_MS);

    eventBus.emit('hukuraAvailable', {
      offendingPlayer,
      callingPlayer: player === PLAYER_1 ? PLAYER_2 : PLAYER_1,
      timeRemaining: HUKURA_WINDOW_MS,
    });
  }

  function callHukura() {
    if (!active) return null;

    clearTimeout(timerId);
    const result = {
      offendingPlayer,
      missedPiecePosition,
      callingPlayer: offendingPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1,
    };

    active = false;
    timerStart = null;
    offendingPlayer = null;
    missedPiecePosition = null;

    eventBus.emit('hukuraCalled', result);
    return result;
  }

  function expire() {
    if (!active) return;

    active = false;
    clearTimeout(timerId);
    timerStart = null;

    const result = { offendingPlayer };
    offendingPlayer = null;
    missedPiecePosition = null;

    eventBus.emit('hukuraExpired', result);
    return result;
  }

  function getTimeRemaining() {
    if (!active || timerStart === null) return 0;
    const elapsed = Date.now() - timerStart;
    return Math.max(0, HUKURA_WINDOW_MS - elapsed);
  }

  function reset() {
    if (timerId) clearTimeout(timerId);
    active = false;
    timerStart = null;
    timerId = null;
    offendingPlayer = null;
    missedPiecePosition = null;
  }

  return {
    startWindow,
    callHukura,
    expire,
    getTimeRemaining,
    reset,
    isActive: () => active,
    getOffendingPlayer: () => offendingPlayer,
    getMissedPiecePosition: () => missedPiecePosition,
  };
}
