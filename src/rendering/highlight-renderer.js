/**
 * Selection and move highlights rendering.
 */
import { COLORS, BOARD_SIZE } from '../core/constants.js';

/**
 * Draw highlight on the selected piece's square.
 */
export function drawSelectedHighlight(ctx, row, col, cellSize, offsetX, offsetY) {
  const x = offsetX + col * cellSize;
  const y = offsetY + row * cellSize;

  ctx.fillStyle = COLORS.HIGHLIGHT_SELECTED;
  ctx.fillRect(x, y, cellSize, cellSize);

  // Selection border
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
}

/**
 * Draw highlights on legal move destinations.
 */
export function drawMoveHighlights(ctx, moves, cellSize, offsetX, offsetY) {
  for (const move of moves) {
    const x = offsetX + move.to.col * cellSize;
    const y = offsetY + move.to.row * cellSize;

    if (move.isCapture) {
      ctx.fillStyle = COLORS.HIGHLIGHT_CAPTURE;
      ctx.fillRect(x, y, cellSize, cellSize);

      // Draw X marks on captured piece positions
      for (const cap of move.captures) {
        drawCaptureMarker(ctx, cap.row, cap.col, cellSize, offsetX, offsetY);
      }
    } else {
      ctx.fillStyle = COLORS.HIGHLIGHT_MOVE;
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    // Dot in center of destination
    const centerX = x + cellSize / 2;
    const centerY = y + cellSize / 2;
    const dotRadius = cellSize * 0.12;

    ctx.beginPath();
    ctx.arc(centerX, centerY, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = move.isCapture
      ? 'rgba(255, 0, 0, 0.6)'
      : 'rgba(0, 255, 0, 0.6)';
    ctx.fill();
  }
}

/**
 * Draw capture marker on pieces that will be captured.
 */
function drawCaptureMarker(ctx, row, col, cellSize, offsetX, offsetY) {
  const x = offsetX + col * cellSize + cellSize / 2;
  const y = offsetY + row * cellSize + cellSize / 2;
  const size = cellSize * 0.15;

  ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();
}

/**
 * Highlight pieces that can move (when no piece is selected).
 */
export function drawMovablePieceHints(ctx, movablePieces, cellSize, offsetX, offsetY) {
  for (const { row, col } of movablePieces) {
    const x = offsetX + col * cellSize + cellSize / 2;
    const y = offsetY + row * cellSize + cellSize / 2;
    const radius = cellSize * 0.42;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
