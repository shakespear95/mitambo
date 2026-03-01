/**
 * In-memory room registry.
 */
import { randomUUID } from 'node:crypto';

/** @type {Map<string, Room>} roomId → Room */
const rooms = new Map();

/** @type {Map<string, string>} roomCode → roomId */
const codeIndex = new Map();

/** @type {Map<string, string>} uid → roomId */
const playerRoomIndex = new Map();

/**
 * Create a new room.
 */
export function createRoom(gameType, isPrivate = false) {
  const roomId = randomUUID();
  const roomCode = isPrivate ? generateCode() : null;

  const room = {
    roomId,
    gameType,
    players: [null, null],
    status: 'waiting',
    roomCode,
    session: null,
    startedAt: null,
    disconnectedPlayer: null,
    disconnectTimer: null,
  };

  rooms.set(roomId, room);
  if (roomCode) {
    codeIndex.set(roomCode, roomId);
  }

  return room;
}

/**
 * Add a player to a room.
 */
export function addPlayerToRoom(roomId, uid, displayName) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const slot = room.players[0] === null ? 0 : room.players[1] === null ? 1 : -1;
  if (slot === -1) return null;

  room.players[slot] = {
    uid,
    displayName,
    role: slot === 0 ? 'player1' : 'player2',
  };

  playerRoomIndex.set(uid, roomId);

  if (room.players[0] && room.players[1]) {
    room.status = 'full';
  }

  return room;
}

/**
 * Remove a player from a room.
 */
export function removePlayerFromRoom(uid) {
  const roomId = playerRoomIndex.get(uid);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  for (let i = 0; i < room.players.length; i++) {
    if (room.players[i] && room.players[i].uid === uid) {
      room.players[i] = null;
      break;
    }
  }

  playerRoomIndex.delete(uid);

  // Clean up empty rooms
  if (!room.players[0] && !room.players[1]) {
    if (room.roomCode) codeIndex.delete(room.roomCode);
    rooms.delete(roomId);
  }
}

/**
 * Get a room by ID.
 */
export function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

/**
 * Get a room by its invite code.
 */
export function getRoomByCode(code) {
  const roomId = codeIndex.get(code.toUpperCase());
  return roomId ? rooms.get(roomId) : null;
}

/**
 * Find the room a player is currently in.
 */
export function findRoomForPlayer(uid) {
  const roomId = playerRoomIndex.get(uid);
  return roomId ? rooms.get(roomId) : null;
}

/**
 * Get all rooms (for admin/debug).
 */
export function getAllRooms() {
  return Array.from(rooms.values());
}

/**
 * Remove a finished room.
 */
export function removeRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const p of room.players) {
    if (p) playerRoomIndex.delete(p.uid);
  }
  if (room.roomCode) codeIndex.delete(room.roomCode);
  if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
  rooms.delete(roomId);
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (codeIndex.has(code));
  return code;
}
