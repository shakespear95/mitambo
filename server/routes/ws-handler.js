/**
 * WebSocket message dispatch and connection management.
 */
import { WebSocketServer } from 'ws';
import { verifyAccessToken } from '../config/supabase.js';
import { getPlayer, touchPlayer } from '../db/player-repo.js';
import { recordGame } from '../db/game-repo.js';
import { findMatch, createPrivateRoom, joinByCode } from '../lobby/matchmaker.js';
import { getRoom, removePlayerFromRoom, removeRoom, findRoomForPlayer as findRoomForPlayerFn } from '../lobby/room-manager.js';
import { logger } from '../utils/logger.js';

/** Map<uid, { ws }> */
const playerConnections = new Map();

export function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    let authed = false;
    let uid = null;

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid JSON' } }));
        return;
      }

      if (msg.type === 'auth') {
        const user = await verifyAccessToken(msg.accessToken);
        if (user && await handleAuth(ws, user)) {
          authed = true;
          uid = user.id;
        } else {
          ws.send(JSON.stringify({ type: 'error', payload: { message: 'Authentication failed' } }));
        }
        return;
      }

      if (!authed) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Not authenticated' } }));
        return;
      }

      // Verify token on each message
      const user = await verifyAccessToken(msg.accessToken);
      if (!user) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Session expired' } }));
        return;
      }

      await dispatch(ws, user.id, msg);
    });

    ws.on('close', () => {
      if (uid) {
        handleDisconnect(uid);
      }
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error:', err.message);
    });
  });

  logger.info('WebSocket server ready');
}

async function handleAuth(ws, user) {
  const uid = user.id;
  const player = await getPlayer(uid);
  if (!player) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Player not found' } }));
    return false;
  }

  await touchPlayer(uid);

  // Clean up old connection if reconnecting
  playerConnections.set(uid, { ws });

  ws.send(JSON.stringify({
    type: 'auth_ok',
    payload: {
      uid: player.id,
      displayName: player.display_name,
      avatarUrl: player.avatar_url,
      elo: player.elo,
    },
  }));

  logger.info(`WS auth: ${player.display_name}`);

  // Check if player was in an active room (reconnect)
  checkReconnect(uid, ws);

  return true;
}

async function dispatch(ws, uid, msg) {
  switch (msg.type) {
    case 'find_match':
      await handleFindMatch(ws, uid, msg.payload);
      break;
    case 'create_room':
      await handleCreateRoom(ws, uid, msg.payload);
      break;
    case 'join_room':
      await handleJoinRoom(ws, uid, msg.payload);
      break;
    case 'submit_move':
      await handleSubmitMove(ws, uid, msg);
      break;
    case 'suit_declaration':
      await handleSuitDeclaration(ws, uid, msg);
      break;
    case 'setup_choice':
      handleSetupChoice(ws, uid, msg);
      break;
    case 'draw_card':
      handleDrawCard(ws, uid, msg);
      break;
    case 'pickup_penalty':
      handlePickupPenalty(ws, uid, msg);
      break;
    case 'carry_on_draw':
      handleCarryOnDraw(ws, uid, msg);
      break;
    case 'cancel_match':
      handleCancelMatch(ws, uid, msg.payload);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown type: ${msg.type}` } }));
  }
}

async function handleFindMatch(ws, uid, payload) {
  const { gameType } = payload;
  if (!['damii', 'tsoro', 'crazy8'].includes(gameType)) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid game type' } }));
    return;
  }

  const player = await getPlayer(uid);
  const result = findMatch(uid, player.display_name, gameType);

  if (result.matched) {
    const room = result.room;
    notifyRoomJoined(room);
  } else {
    ws.send(JSON.stringify({
      type: 'waiting',
      payload: { roomId: result.room.roomId, gameType },
    }));
  }
}

async function handleCreateRoom(ws, uid, payload) {
  const { gameType } = payload;
  const player = await getPlayer(uid);
  const room = createPrivateRoom(uid, player.display_name, gameType);

  ws.send(JSON.stringify({
    type: 'room_created',
    payload: { roomId: room.roomId, roomCode: room.roomCode, gameType },
  }));
}

async function handleJoinRoom(ws, uid, payload) {
  const { roomCode } = payload;
  const player = await getPlayer(uid);
  const room = joinByCode(uid, player.display_name, roomCode);

  if (!room) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Room not found or full' } }));
    return;
  }

  notifyRoomJoined(room);
}

/**
 * Verify a player belongs to a room. Returns the room or null.
 */
function verifyRoomMembership(ws, uid, roomId) {
  const room = getRoom(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Room not found' } }));
    return null;
  }
  if (!room.players.some(p => p && p.uid === uid)) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Not in this room' } }));
    return null;
  }
  return room;
}

async function handleSubmitMove(ws, uid, msg) {
  const room = verifyRoomMembership(ws, uid, msg.roomId);
  if (!room) return;

  if (!room.session) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Game not started yet' } }));
    return;
  }

  const result = await room.session.submitMove(uid, msg.payload);

  if (!result.valid) {
    ws.send(JSON.stringify({ type: 'move_rejected', payload: { reason: result.reason } }));
    return;
  }

  // Broadcast state update to both players
  broadcastToRoom(room, result);
}

async function handleSuitDeclaration(ws, uid, msg) {
  const room = verifyRoomMembership(ws, uid, msg.roomId);
  if (!room || !room.session) return;

  const result = room.session.declareSuit(uid, msg.payload.suit);
  if (result) {
    broadcastToRoom(room, result);
  }
}

function handleSetupChoice(ws, uid, msg) {
  const room = verifyRoomMembership(ws, uid, msg.roomId);
  if (!room || !room.session) return;

  const result = room.session.handleSetupChoice(uid, msg.payload);
  if (result) {
    broadcastToRoom(room, result);
  }
}

function handleDrawCard(ws, uid, msg) {
  const room = verifyRoomMembership(ws, uid, msg.roomId);
  if (!room || !room.session) return;

  const result = room.session.drawCard(uid);
  if (result) {
    broadcastToRoom(room, result);
  }
}

function handlePickupPenalty(ws, uid, msg) {
  const room = verifyRoomMembership(ws, uid, msg.roomId);
  if (!room || !room.session) return;

  const result = room.session.pickupPenalty(uid);
  if (result) {
    broadcastToRoom(room, result);
  }
}

function handleCarryOnDraw(ws, uid, msg) {
  const room = verifyRoomMembership(ws, uid, msg.roomId);
  if (!room || !room.session) return;

  const result = room.session.carryOnDraw(uid);
  if (result) {
    broadcastToRoom(room, result);
  }
}

function handleCancelMatch(ws, uid, payload) {
  const { roomId } = payload;
  if (!roomId) return;

  const room = getRoom(roomId);
  if (!room) return;

  if (room.status !== 'waiting') return;
  if (!room.players.some(p => p && p.uid === uid)) return;

  removePlayerFromRoom(uid);
  logger.info(`Match cancelled by ${uid} in room ${roomId}`);
}

function notifyRoomJoined(room) {
  for (const p of room.players) {
    if (!p) continue;
    const conn = playerConnections.get(p.uid);
    if (!conn) continue;

    const opponent = room.players.find(op => op && op.uid !== p.uid);

    conn.ws.send(JSON.stringify({
      type: 'room_joined',
      payload: {
        roomId: room.roomId,
        gameType: room.gameType,
        playerRole: p.role,
        opponent: opponent ? {
          displayName: opponent.displayName,
          uid: opponent.uid,
        } : null,
      },
    }));
  }

  // If room is full, start the game
  if (room.players[0] && room.players[1] && !room.session) {
    startGame(room);
  }
}

function startGame(room) {
  import(`../game/${room.gameType}-session.js`).then(({ createSession }) => {
    const session = createSession(room, (event) => {
      broadcastToRoom(room, event);
    });
    room.session = session;
    room.status = 'active';
    room.startedAt = Date.now();

    const startState = session.getInitialState();

    for (const p of room.players) {
      if (!p) continue;
      const conn = playerConnections.get(p.uid);
      if (!conn) continue;

      const stateForPlayer = session.getStateForPlayer
        ? session.getStateForPlayer(p.uid)
        : startState;

      conn.ws.send(JSON.stringify({
        type: 'game_start',
        payload: {
          roomId: room.roomId,
          gameType: room.gameType,
          role: p.role,
          state: stateForPlayer,
        },
      }));
    }
  }).catch(err => {
    logger.error(`Failed to start ${room.gameType} session:`, err.message);
    for (const p of room.players) {
      if (!p) continue;
      const conn = playerConnections.get(p.uid);
      if (conn && conn.ws.readyState === 1) {
        conn.ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Failed to start game session' },
        }));
      }
    }
  });
}

function broadcastToRoom(room, event) {
  // If event targets a specific player
  if (event.targetUid) {
    const conn = playerConnections.get(event.targetUid);
    if (conn && conn.ws.readyState === 1) {
      const { targetUid, ...cleanEvent } = event;
      conn.ws.send(JSON.stringify(cleanEvent));
    }
    return;
  }

  for (const p of room.players) {
    if (!p) continue;
    const conn = playerConnections.get(p.uid);
    if (!conn || conn.ws.readyState !== 1) continue;

    if (room.session && room.session.getStateForPlayer && event.type === 'state_update') {
      const personalState = room.session.getStateForPlayer(p.uid);
      conn.ws.send(JSON.stringify({
        ...event,
        payload: { ...event.payload, state: personalState },
      }));
    } else {
      conn.ws.send(JSON.stringify(event));
    }
  }
}

function handleDisconnect(uid) {
  playerConnections.delete(uid);

  const room = findRoomForPlayer(uid);
  if (room && room.status === 'active') {
    room.disconnectedPlayer = uid;
    room.disconnectTimer = setTimeout(() => {
      handleForfeit(room, uid);
    }, 90_000);

    const opponent = room.players.find(p => p && p.uid !== uid);
    if (opponent) {
      const oppConn = playerConnections.get(opponent.uid);
      if (oppConn) {
        oppConn.ws.send(JSON.stringify({
          type: 'opponent_disconnected',
          payload: { gracePeriodMs: 90_000 },
        }));
      }
    }
  }

  logger.info(`WS disconnect: ${uid}`);
}

function checkReconnect(uid, ws) {
  const room = findRoomForPlayer(uid);
  if (!room) return;

  if (room.disconnectedPlayer === uid && room.disconnectTimer) {
    clearTimeout(room.disconnectTimer);
    room.disconnectedPlayer = null;
    room.disconnectTimer = null;

    if (room.session) {
      const state = room.session.getStateForPlayer
        ? room.session.getStateForPlayer(uid)
        : room.session.getInitialState();

      ws.send(JSON.stringify({
        type: 'game_start',
        payload: {
          roomId: room.roomId,
          gameType: room.gameType,
          role: room.players.find(p => p && p.uid === uid)?.role,
          state,
          reconnected: true,
        },
      }));

      const opponent = room.players.find(p => p && p.uid !== uid);
      if (opponent) {
        const oppConn = playerConnections.get(opponent.uid);
        if (oppConn) {
          oppConn.ws.send(JSON.stringify({
            type: 'opponent_reconnected',
          }));
        }
      }
    }

    logger.info(`Player reconnected: ${uid}`);
  }
}

async function handleForfeit(room, disconnectedUid) {
  if (!room.session) return;

  const winner = room.players.find(p => p && p.uid !== disconnectedUid);
  if (!winner) return;

  room.status = 'finished';
  const durationS = Math.round((Date.now() - (room.startedAt || Date.now())) / 1000);

  let gameResult;
  try {
    gameResult = await recordGame({
      gameType: room.gameType,
      player1Id: room.players[0].uid,
      player2Id: room.players[1].uid,
      winnerId: winner.uid,
      forfeit: true,
      durationS,
      moveCount: room.session.getMoveCount ? room.session.getMoveCount() : 0,
    });
  } catch (err) {
    logger.error('Failed to record forfeit game:', err.message);
    gameResult = { eloDelta: {}, newElo: {} };
  }

  const winnerConn = playerConnections.get(winner.uid);
  if (winnerConn && winnerConn.ws.readyState === 1) {
    winnerConn.ws.send(JSON.stringify({
      type: 'game_over',
      payload: {
        winnerId: winner.uid,
        reason: 'forfeit',
        eloDelta: gameResult.eloDelta,
        newElo: gameResult.newElo,
      },
    }));
  }

  setTimeout(() => removeRoom(room.roomId), 5000);

  logger.info(`Forfeit: ${disconnectedUid} disconnected, ${winner.uid} wins`);
}

function findRoomForPlayer(uid) {
  return findRoomForPlayerFn(uid);
}

// Export for room-manager to use
export function getPlayerWs(uid) {
  const conn = playerConnections.get(uid);
  return conn ? conn.ws : null;
}

export function sendToPlayer(uid, message) {
  const conn = playerConnections.get(uid);
  if (conn && conn.ws.readyState === 1) {
    conn.ws.send(JSON.stringify(message));
  }
}
