/**
 * Auto-match queue per game type.
 */
import { createRoom, addPlayerToRoom, getRoomByCode, getAllRooms } from './room-manager.js';

/**
 * Find or create a match for a player.
 * Returns { matched: boolean, room }
 */
export function findMatch(uid, displayName, gameType) {
  // Look for an existing waiting room of this type
  const waiting = getAllRooms().find(
    r => r.gameType === gameType
      && r.status === 'waiting'
      && !r.roomCode  // Not a private room
      && r.players[0]
      && r.players[0].uid !== uid  // Not the same player
  );

  if (waiting) {
    const room = addPlayerToRoom(waiting.roomId, uid, displayName);
    return { matched: true, room };
  }

  // Create a new room and wait
  const room = createRoom(gameType, false);
  addPlayerToRoom(room.roomId, uid, displayName);
  return { matched: false, room };
}

/**
 * Create a private room with a join code.
 */
export function createPrivateRoom(uid, displayName, gameType) {
  const room = createRoom(gameType, true);
  addPlayerToRoom(room.roomId, uid, displayName);
  return room;
}

/**
 * Join a room by its invite code.
 */
export function joinByCode(uid, displayName, code) {
  const room = getRoomByCode(code);
  if (!room) return null;
  if (room.status !== 'waiting') return null;
  if (room.players[0] && room.players[0].uid === uid) return null;

  return addPlayerToRoom(room.roomId, uid, displayName);
}
