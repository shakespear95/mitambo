/**
 * Timestamped logging utility.
 */

function timestamp() {
  return new Date().toISOString();
}

export function info(msg, ...args) {
  console.log(`[${timestamp()}] INFO  ${msg}`, ...args);
}

export function warn(msg, ...args) {
  console.warn(`[${timestamp()}] WARN  ${msg}`, ...args);
}

export function error(msg, ...args) {
  console.error(`[${timestamp()}] ERROR ${msg}`, ...args);
}

export const logger = Object.freeze({ info, warn, error });
