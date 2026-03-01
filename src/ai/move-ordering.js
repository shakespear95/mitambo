/**
 * Move ordering for better alpha-beta pruning.
 * Orders moves to explore the most promising ones first.
 */

/**
 * Sort moves for better pruning efficiency.
 * Order: captures (by count) > promotions > center moves > others.
 */
export function orderMoves(moves) {
  return [...moves].sort((a, b) => {
    // Captures first, more captures = higher priority
    if (a.isCapture !== b.isCapture) return a.isCapture ? -1 : 1;
    if (a.isCapture && b.isCapture) {
      if (a.captures.length !== b.captures.length) {
        return b.captures.length - a.captures.length;
      }
    }

    // Promotions next
    if (a.isPromotion !== b.isPromotion) return a.isPromotion ? -1 : 1;

    // Center moves preferred
    const aCenterDist = Math.abs(a.to.col - 3.5) + Math.abs(a.to.row - 3.5);
    const bCenterDist = Math.abs(b.to.col - 3.5) + Math.abs(b.to.row - 3.5);
    return aCenterDist - bCenterDist;
  });
}
