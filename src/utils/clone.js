/**
 * Deep clone helper using structuredClone with fallback.
 */
export function clone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return structuredClone(obj);
}
