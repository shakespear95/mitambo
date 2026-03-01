/**
 * WebSocket client wrapper with auto-reconnect.
 */
import { getAccessToken } from './session.js';
import { getWebSocketUrl } from './ws-config.js';

/**
 * Create a WebSocket client connection.
 *
 * @param {object} handlers - Message handlers keyed by type
 * @returns {{ send, close, isConnected }}
 */
export function createWSClient(handlers) {
  let ws = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_RECONNECT_DELAY = 1000;

  function connect() {
    const url = getWebSocketUrl();

    ws = new WebSocket(url);

    ws.addEventListener('open', async () => {
      reconnectAttempts = 0;

      // Authenticate with Supabase access token
      const accessToken = await getAccessToken();
      if (accessToken) {
        sendRaw({ type: 'auth', accessToken });
      }

      if (handlers.onConnect) handlers.onConnect();
    });

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      // Game handlers take priority (set by online adapters)
      if (gameHandlers[msg.type]) {
        gameHandlers[msg.type](msg.payload, msg);
        return;
      }

      const handler = handlers[msg.type];
      if (handler) {
        handler(msg.payload, msg);
      } else if (handlers.onMessage) {
        handlers.onMessage(msg);
      }
    });

    ws.addEventListener('close', () => {
      ws = null;
      if (handlers.onDisconnect) handlers.onDisconnect();
      scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      // close event will fire after this
    });
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (handlers.onReconnectFailed) handlers.onReconnectFailed();
      return;
    }

    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
    reconnectAttempts++;

    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  }

  /**
   * Send a raw message (no token attachment).
   */
  function sendRaw(msg) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  }

  /**
   * Send a message with a fresh access token attached.
   */
  async function send(msg) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;

    // Attach fresh access token to all non-auth messages (immutable)
    const outMsg = msg.type !== 'auth'
      ? { ...msg, accessToken: await getAccessToken() }
      : msg;

    ws.send(JSON.stringify(outMsg));
    return true;
  }

  function close() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent reconnect
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  // Game-level handlers that can be set/cleared by online adapters
  let gameHandlers = {};

  function setGameHandlers(h) {
    gameHandlers = h || {};
  }

  function clearGameHandlers() {
    gameHandlers = {};
  }

  // Start connection
  connect();

  return Object.freeze({ send, close, isConnected, setGameHandlers, clearGameHandlers });
}
