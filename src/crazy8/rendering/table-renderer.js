/**
 * Green felt table background for Crazy 8.
 */
import { CRAZY8_COLORS } from '../core/constants.js';

/**
 * Draw the table background with a felt texture.
 */
export function drawTable(ctx, width, height) {
  // Base background
  ctx.fillStyle = '#1a0f0a';
  ctx.fillRect(0, 0, width, height);

  // Green felt oval
  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.46;
  const ry = height * 0.44;

  // Outer border
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 4, ry + 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = CRAZY8_COLORS.TABLE_BORDER;
  ctx.fill();

  // Felt surface
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = CRAZY8_COLORS.TABLE_FELT;
  ctx.fill();

  // Subtle radial gradient for depth
  const grad = ctx.createRadialGradient(cx, cy * 0.9, 0, cx, cy, Math.max(rx, ry));
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = grad;
  ctx.fill();
}
