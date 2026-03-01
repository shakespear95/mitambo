/**
 * 3D-styled piece rendering with king crowns.
 */
import { BOARD_SIZE, COLORS, PLAYER_1, PIECE_RADIUS_RATIO, KING } from '../core/constants.js';

/**
 * Draw all pieces on the board.
 */
export function drawPieces(ctx, board, cellSize, offsetX, offsetY, animatingPieces = null) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece === null) continue;

      // Skip pieces that are being animated
      if (animatingPieces && animatingPieces.has(`${row},${col}`)) continue;

      const x = offsetX + col * cellSize + cellSize / 2;
      const y = offsetY + row * cellSize + cellSize / 2;
      const radius = cellSize * PIECE_RADIUS_RATIO;

      drawPiece(ctx, x, y, radius, piece);
    }
  }
}

/**
 * Draw a single piece at canvas coordinates.
 */
export function drawPiece(ctx, x, y, radius, piece) {
  const isDark = piece.player === PLAYER_1;
  const baseColor = isDark ? COLORS.PIECE_DARK : COLORS.PIECE_LIGHT;
  const edgeColor = isDark ? COLORS.PIECE_DARK_EDGE : COLORS.PIECE_LIGHT_EDGE;

  // 3D effect: bottom shadow
  ctx.beginPath();
  ctx.arc(x, y + 3, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fill();

  // Piece edge (side of disc)
  ctx.beginPath();
  ctx.arc(x, y + 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = edgeColor;
  ctx.fill();

  // Main piece body
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();

  // Inner highlight for 3D effect
  const gradient = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, radius * 0.1,
    x, y, radius
  );
  if (isDark) {
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Piece border
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // King crown
  if (piece.type === KING) {
    drawCrown(ctx, x, y, radius);
  }
}

function drawCrown(ctx, x, y, radius) {
  const crownSize = radius * 0.5;

  ctx.save();
  ctx.translate(x, y);

  // Crown body
  ctx.beginPath();
  ctx.moveTo(-crownSize, crownSize * 0.3);
  ctx.lineTo(-crownSize, -crownSize * 0.2);
  ctx.lineTo(-crownSize * 0.5, crownSize * 0.1);
  ctx.lineTo(0, -crownSize * 0.5);
  ctx.lineTo(crownSize * 0.5, crownSize * 0.1);
  ctx.lineTo(crownSize, -crownSize * 0.2);
  ctx.lineTo(crownSize, crownSize * 0.3);
  ctx.closePath();

  ctx.fillStyle = COLORS.KING_CROWN;
  ctx.fill();
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Crown jewels (small circles at tips)
  const jewels = [
    [-crownSize, -crownSize * 0.2],
    [0, -crownSize * 0.5],
    [crownSize, -crownSize * 0.2],
  ];

  for (const [jx, jy] of jewels) {
    ctx.beginPath();
    ctx.arc(jx, jy, crownSize * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#FF4444';
    ctx.fill();
  }

  ctx.restore();
}
