/**
 * Tsoro board surface rendering - wooden board with carved look and divider.
 */
import { GRID_ROWS, GRID_COLS, TSORO_COLORS } from '../core/constants.js';

/**
 * Draw the Tsoro board background.
 */
export function drawTsoroBoard(ctx, cellSize, offsetX, offsetY) {
  const boardWidth = GRID_COLS * cellSize;
  const boardHeight = GRID_ROWS * cellSize;
  const borderWidth = 10;

  // Outer border / frame
  ctx.fillStyle = TSORO_COLORS.BOARD_BORDER;
  ctx.fillRect(
    offsetX - borderWidth,
    offsetY - borderWidth,
    boardWidth + borderWidth * 2,
    boardHeight + borderWidth * 2
  );

  // Board surface with wood gradient
  const surfaceGrad = ctx.createLinearGradient(
    offsetX, offsetY,
    offsetX + boardWidth, offsetY + boardHeight
  );
  surfaceGrad.addColorStop(0, TSORO_COLORS.BOARD_SURFACE);
  surfaceGrad.addColorStop(0.5, '#9B6E4C');
  surfaceGrad.addColorStop(1, TSORO_COLORS.BOARD_SURFACE);
  ctx.fillStyle = surfaceGrad;
  ctx.fillRect(offsetX, offsetY, boardWidth, boardHeight);

  // Wood grain lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 0.5;
  const grainSpacing = cellSize / 5;
  for (let y = offsetY; y < offsetY + boardHeight; y += grainSpacing) {
    ctx.beginPath();
    ctx.moveTo(offsetX, y);
    ctx.lineTo(offsetX + boardWidth, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  // Center divider line between player sides (between rows 1 and 2)
  const dividerY = offsetY + 2 * cellSize;
  ctx.strokeStyle = TSORO_COLORS.BOARD_DIVIDER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(offsetX, dividerY);
  ctx.lineTo(offsetX + boardWidth, dividerY);
  ctx.stroke();

  // Subtle divider shadow
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(offsetX, dividerY + 2);
  ctx.lineTo(offsetX + boardWidth, dividerY + 2);
  ctx.stroke();

  // Player labels
  const labelSize = Math.max(10, cellSize * 0.18);
  ctx.font = `bold ${labelSize}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Player B label (top)
  ctx.fillStyle = TSORO_COLORS.TEXT_SECONDARY;
  ctx.fillText('Player B', offsetX + boardWidth / 2, offsetY - borderWidth - labelSize);

  // Player A label (bottom)
  ctx.fillText('Player A', offsetX + boardWidth / 2, offsetY + boardHeight + borderWidth + labelSize);
}
