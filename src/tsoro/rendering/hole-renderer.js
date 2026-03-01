/**
 * Hole rendering for Tsoro - circular depressions with carved-wood shading.
 */
import { TSORO_COLORS, HOLE_RADIUS_RATIO } from '../core/constants.js';

/**
 * Draw a single hole at a grid position.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} centerX - Pixel center X
 * @param {number} centerY - Pixel center Y
 * @param {number} radius - Hole radius in pixels
 * @param {boolean} isBank - Whether this hole is a bank
 */
export function drawHole(ctx, centerX, centerY, radius, isBank) {
  // Hole shadow (concave depression effect)
  const shadowGrad = ctx.createRadialGradient(
    centerX - radius * 0.15, centerY - radius * 0.15, radius * 0.1,
    centerX, centerY, radius
  );
  shadowGrad.addColorStop(0, TSORO_COLORS.HOLE_FILL);
  shadowGrad.addColorStop(0.7, TSORO_COLORS.HOLE_FILL);
  shadowGrad.addColorStop(1, TSORO_COLORS.HOLE_SHADOW);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // Hole border
  ctx.strokeStyle = TSORO_COLORS.HOLE_BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner shadow arc (top rim)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 2, Math.PI * 1.2, Math.PI * 1.8);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Bank highlight
  if (isBank) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = TSORO_COLORS.BANK_HIGHLIGHT;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gold glow
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = TSORO_COLORS.BANK_GLOW;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

/**
 * Draw all holes on the board.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize
 * @param {number} offsetX
 * @param {number} offsetY
 * @param {number|null} bankAIndex - Player A's bank hole index
 * @param {number|null} bankBIndex - Player B's bank hole index
 * @param {Function} holeToGrid - Conversion function
 */
export function drawAllHoles(ctx, cellSize, offsetX, offsetY, bankAIndex, bankBIndex, holeToGrid) {
  const radius = cellSize * HOLE_RADIUS_RATIO;

  // Draw all 16 holes (8 per player)
  for (let holeIdx = 0; holeIdx < 8; holeIdx++) {
    // Player A holes
    const gridA = holeToGrid('A', holeIdx);
    const cxA = offsetX + gridA.col * cellSize + cellSize / 2;
    const cyA = offsetY + gridA.row * cellSize + cellSize / 2;
    drawHole(ctx, cxA, cyA, radius, bankAIndex === holeIdx);

    // Player B holes
    const gridB = holeToGrid('B', holeIdx);
    const cxB = offsetX + gridB.col * cellSize + cellSize / 2;
    const cyB = offsetY + gridB.row * cellSize + cellSize / 2;
    drawHole(ctx, cxB, cyB, radius, bankBIndex === holeIdx);
  }
}

/**
 * Get the hole radius for a given cell size.
 */
export function getHoleRadius(cellSize) {
  return cellSize * HOLE_RADIUS_RATIO;
}
