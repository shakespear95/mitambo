/**
 * Highlight rendering for Tsoro - valid holes, selected hole, bank pulse.
 */
import { TSORO_COLORS, HOLE_RADIUS_RATIO } from '../core/constants.js';
import { holeToGrid } from '../core/board.js';

/**
 * Draw highlights for valid (pickable) holes.
 */
export function drawValidHoleHighlights(ctx, validHoles, player, cellSize, offsetX, offsetY) {
  const radius = cellSize * HOLE_RADIUS_RATIO;

  for (const holeIdx of validHoles) {
    const grid = holeToGrid(player, holeIdx);
    const cx = offsetX + grid.col * cellSize + cellSize / 2;
    const cy = offsetY + grid.row * cellSize + cellSize / 2;

    // Green glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = TSORO_COLORS.VALID_HOLE_BORDER;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Green fill overlay
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = TSORO_COLORS.VALID_HOLE;
    ctx.fill();
  }
}

/**
 * Draw highlight for the selected hole.
 */
export function drawSelectedHoleHighlight(ctx, player, holeIndex, cellSize, offsetX, offsetY) {
  if (holeIndex === null || holeIndex === undefined) return;

  const radius = cellSize * HOLE_RADIUS_RATIO;
  const grid = holeToGrid(player, holeIndex);
  const cx = offsetX + grid.col * cellSize + cellSize / 2;
  const cy = offsetY + grid.row * cellSize + cellSize / 2;

  // Gold glow ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
  ctx.strokeStyle = TSORO_COLORS.SELECTED_HOLE_BORDER;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Gold fill overlay
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = TSORO_COLORS.SELECTED_HOLE;
  ctx.fill();
}

/**
 * Draw a pulsing highlight on the bank hole during setup.
 */
export function drawBankSetupHighlight(ctx, player, holeIndices, cellSize, offsetX, offsetY, time) {
  const radius = cellSize * HOLE_RADIUS_RATIO;
  const pulseAlpha = 0.3 + 0.2 * Math.sin(time * 0.004);

  for (const holeIdx of holeIndices) {
    const grid = holeToGrid(player, holeIdx);
    const cx = offsetX + grid.col * cellSize + cellSize / 2;
    const cy = offsetY + grid.row * cellSize + cellSize / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulseAlpha + 0.3})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
    ctx.fill();
  }
}
