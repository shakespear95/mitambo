/**
 * Simple pub/sub event system.
 */
export function createEventBus() {
  const listeners = new Map();

  return Object.freeze({
    on(event, callback) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(callback);
      return () => listeners.get(event)?.delete(callback);
    },

    off(event, callback) {
      listeners.get(event)?.delete(callback);
    },

    emit(event, data) {
      const handlers = listeners.get(event);
      if (handlers) {
        for (const handler of handlers) {
          handler(data);
        }
      }
    },

    clear() {
      listeners.clear();
    }
  });
}
