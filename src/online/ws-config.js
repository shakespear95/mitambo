/**
 * WebSocket URL configuration.
 * Resolves the WebSocket server URL based on environment.
 */

/**
 * Get the WebSocket server URL.
 * Priority: manual override → production Railway URL → local dev fallback.
 * @returns {string}
 */
export function getWebSocketUrl() {
  // Allow runtime override (useful for testing)
  if (window.__MITAMBO_WS_URL) {
    return window.__MITAMBO_WS_URL;
  }

  // Production: Railway backend
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return 'wss://mitambo-ws-production.up.railway.app';
  }

  // Local development
  return 'ws://localhost:3000';
}
