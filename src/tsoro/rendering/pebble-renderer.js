/**
 * Pebble rendering for Tsoro - stone-like pebbles arranged inside holes.
 */
import { TSORO_COLORS, HOLE_RADIUS_RATIO } from '../core/constants.js';
import { holeToGrid } from '../core/board.js';

/**
 * Draw pebbles inside a hole.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} centerX - Hole center X
 * @param {number} centerY - Hole center Y
 * @param {number} holeRadius - Hole radius
 * @param {number} count - Number of pebbles
 */
export function drawPebblesInHole(ctx, centerX, centerY, holeRadius, count) {
  if (count === 0) return;

  const pebbleRadius = Math.max(3, holeRadius * 0.18);
  const positions = getPebblePositions(centerX, centerY, holeRadius, count, pebbleRadius);

  for (const pos of positions) {
    drawSinglePebble(ctx, pos.x, pos.y, pebbleRadius);
  }

  // If 9+ pebbles, show count label
  if (count >= 9) {
    const fontSize = Math.max(10, holeRadius * 0.45);
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText(count.toString(), centerX + 1, centerY + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(count.toString(), centerX, centerY);
  }
}

/**
 * Draw a single stone-like pebble.
 */
function drawSinglePebble(ctx, x, y, radius) {
  // Shadow
  ctx.beginPath();
  ctx.arc(x + 1, y + 1, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fill();

  // Body with radial gradient (stone look)
  const grad = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, radius * 0.1,
    x, y, radius
  );
  grad.addColorStop(0, TSORO_COLORS.PEBBLE_HIGHLIGHT);
  grad.addColorStop(0.5, TSORO_COLORS.PEBBLE_LIGHT);
  grad.addColorStop(1, TSORO_COLORS.PEBBLE_DARK);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

/**
 * Calculate pebble positions within a hole.
 * - 1-4: individual stones with spacing
 * - 5-8: mini-grid arrangement
 * - 9+: pile with count label (show ~8 pebbles visually)
 */
function getPebblePositions(cx, cy, holeRadius, count, pebbleRadius) {
  const usableRadius = holeRadius * 0.65;
  const displayCount = Math.min(count, 8);

  if (displayCount === 1) {
    return [{ x: cx, y: cy }];
  }

  if (displayCount === 2) {
    const offset = usableRadius * 0.4;
    return [
      { x: cx - offset, y: cy },
      { x: cx + offset, y: cy },
    ];
  }

  if (displayCount === 3) {
    const offset = usableRadius * 0.4;
    return [
      { x: cx, y: cy - offset },
      { x: cx - offset, y: cy + offset * 0.5 },
      { x: cx + offset, y: cy + offset * 0.5 },
    ];
  }

  if (displayCount === 4) {
    const offset = usableRadius * 0.35;
    return [
      { x: cx - offset, y: cy - offset },
      { x: cx + offset, y: cy - offset },
      { x: cx - offset, y: cy + offset },
      { x: cx + offset, y: cy + offset },
    ];
  }

  // 5-8: Mini grid
  const positions = [];
  const cols = displayCount <= 6 ? 3 : 4;
  const rows = Math.ceil(displayCount / cols);
  const spacingX = (usableRadius * 2) / (cols + 1);
  const spacingY = (usableRadius * 2) / (rows + 1);
  const startX = cx - usableRadius;
  const startY = cy - usableRadius;

  for (let i = 0; i < displayCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({
      x: startX + spacingX * (col + 1),
      y: startY + spacingY * (row + 1),
    });
  }

  return positions;
}

/**
 * Draw all pebbles on the board.
 */
export function drawAllPebbles(ctx, board, cellSize, offsetX, offsetY) {
  const holeRadius = cellSize * HOLE_RADIUS_RATIO;

  for (const player of ['A', 'B']) {
    for (let holeIdx = 0; holeIdx < 8; holeIdx++) {
      const count = board[player][holeIdx];
      if (count === 0) continue;

      const grid = holeToGrid(player, holeIdx);
      const cx = offsetX + grid.col * cellSize + cellSize / 2;
      const cy = offsetY + grid.row * cellSize + cellSize / 2;
      drawPebblesInHole(ctx, cx, cy, holeRadius, count);
    }
  }
}
