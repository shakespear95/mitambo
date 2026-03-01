/**
 * Position and diagonal math helpers.
 */

export function isValidPosition(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function isDarkSquare(row, col) {
  return (row + col) % 2 === 1;
}

export function positionKey(row, col) {
  return `${row},${col}`;
}

export function parsePositionKey(key) {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

/**
 * Get all diagonal directions as [dRow, dCol] pairs.
 */
export function getDiagonalDirections() {
  return [
    [-1, -1], [-1, 1],
    [1, -1], [1, 1]
  ];
}

/**
 * Get forward diagonal directions for a player.
 * Player 1 (dark) moves up (negative row), Player 2 (light) moves down (positive row).
 */
export function getForwardDirections(player) {
  if (player === 1) {
    return [[-1, -1], [-1, 1]];
  }
  return [[1, -1], [1, 1]];
}

/**
 * Get backward diagonal directions for a player.
 */
export function getBackwardDirections(player) {
  if (player === 1) {
    return [[1, -1], [1, 1]];
  }
  return [[-1, -1], [-1, 1]];
}

/**
 * Manhattan distance between two positions.
 */
export function diagonalDistance(r1, c1, r2, c2) {
  return Math.abs(r1 - r2);
}
