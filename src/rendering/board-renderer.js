/**
 * Wooden board drawing with dark/light squares.
 */
import { BOARD_SIZE, COLORS } from '../core/constants.js';

/**
 * Draw the board background with wood-grain aesthetic.
 */
export function drawBoard(ctx, cellSize, offsetX, offsetY) {
  // Board border / frame
  const borderWidth = 8;
  ctx.fillStyle = COLORS.BOARD_BORDER;
  ctx.fillRect(
    offsetX - borderWidth,
    offsetY - borderWidth,
    BOARD_SIZE * cellSize + borderWidth * 2,
    BOARD_SIZE * cellSize + borderWidth * 2
  );

  // Draw squares
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isDark = (row + col) % 2 === 1;
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;

      if (isDark) {
        drawDarkSquare(ctx, x, y, cellSize);
      } else {
        drawLightSquare(ctx, x, y, cellSize);
      }
    }
  }

  // Row/col labels
  ctx.fillStyle = '#DEB887';
  ctx.font = `${Math.max(10, cellSize * 0.16)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < BOARD_SIZE; i++) {
    // Row numbers (8 to 1, top to bottom)
    const rowLabel = (BOARD_SIZE - i).toString();
    ctx.fillText(rowLabel, offsetX - borderWidth - 8, offsetY + i * cellSize + cellSize / 2);

    // Column letters (a to h)
    const colLabel = String.fromCharCode(97 + i);
    ctx.fillText(colLabel, offsetX + i * cellSize + cellSize / 2, offsetY + BOARD_SIZE * cellSize + borderWidth + 10);
  }
}

function drawDarkSquare(ctx, x, y, size) {
  // Base dark wood color
  ctx.fillStyle = COLORS.BOARD_DARK;
  ctx.fillRect(x, y, size, size);

  // Subtle wood grain lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 0.5;
  const grainCount = 3;
  for (let i = 0; i < grainCount; i++) {
    const offset = (size / (grainCount + 1)) * (i + 1);
    ctx.beginPath();
    ctx.moveTo(x, y + offset);
    ctx.lineTo(x + size, y + offset + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }
}

function drawLightSquare(ctx, x, y, size) {
  // Base light wood color
  ctx.fillStyle = COLORS.BOARD_LIGHT;
  ctx.fillRect(x, y, size, size);

  // Subtle grain
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 0.5;
  const grainCount = 2;
  for (let i = 0; i < grainCount; i++) {
    const offset = (size / (grainCount + 1)) * (i + 1);
    ctx.beginPath();
    ctx.moveTo(x, y + offset);
    ctx.lineTo(x + size, y + offset + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }
}
