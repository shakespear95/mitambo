/**
 * Hand rendering for Tsoro sowing animation.
 * Draws a stylized hand using canvas paths (no images needed).
 *
 * Two visual states:
 * - Open palm: fingers spread, hovering or just dropped a pebble
 * - Closed fist: fingers curled, carrying pebbles
 */

const HAND_COLOR = '#D4A574';
const HAND_OUTLINE = '#8B6914';
const HAND_SHADOW = 'rgba(0, 0, 0, 0.25)';
const BADGE_BG = '#C0392B';
const BADGE_TEXT = '#fff';

/**
 * Draw the animated hand at a given position.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Center X position
 * @param {number} y - Center Y position (hand floats above this point)
 * @param {'open'|'closed'} shape - Hand visual state
 * @param {number} pebblesInHand - Number of pebbles being carried
 * @param {number} opacity - 0 to 1
 * @param {number} cellSize - Board cell size for proportional scaling
 */
export function drawHand(ctx, x, y, shape, pebblesInHand, opacity, cellSize) {
  if (opacity <= 0) return;

  const unit = cellSize * 0.025;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Shadow
  ctx.save();
  ctx.translate(x + unit * 2, y + unit * 3);
  ctx.scale(unit, unit);
  drawHandPath(ctx, shape, HAND_SHADOW, 'rgba(0,0,0,0)');
  ctx.restore();

  // Hand
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(unit, unit);
  drawHandPath(ctx, shape, HAND_COLOR, HAND_OUTLINE);
  ctx.restore();

  // Pebble count badge
  if (pebblesInHand > 0) {
    drawBadge(ctx, x + cellSize * 0.22, y - cellSize * 0.18, pebblesInHand, cellSize);
  }

  ctx.restore();
}

function drawHandPath(ctx, shape, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (shape === 'open') {
    drawOpenHand(ctx);
  } else {
    drawClosedFist(ctx);
  }
}

/**
 * Open palm viewed from above — palm disc with 5 spread fingers.
 * Drawn in local units centred at (0, 0).
 */
function drawOpenHand(ctx) {
  // Palm
  ctx.beginPath();
  ctx.ellipse(0, 5, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Fingers — each drawn as a tapered rounded stroke
  const fingers = [
    { bx: -7, by: 1, tx: -11, ty: -9, w: 3.4 },
    { bx: -3.5, by: -1, tx: -5, ty: -14, w: 3.2 },
    { bx: 0, by: -2, tx: 0, ty: -15, w: 3.2 },
    { bx: 3.5, by: -1, tx: 5, ty: -14, w: 3.2 },
    { bx: 8, by: 3, tx: 14, ty: -2, w: 3.6 },
  ];

  for (const f of fingers) {
    // Finger shaft
    ctx.beginPath();
    ctx.moveTo(f.bx, f.by);
    ctx.lineTo(f.tx, f.ty);
    ctx.lineWidth = f.w;
    ctx.stroke();

    // Fingertip circle
    ctx.beginPath();
    ctx.arc(f.tx, f.ty, f.w * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Closed fist — compact rounded shape with knuckle bumps.
 */
function drawClosedFist(ctx) {
  // Main fist body
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Knuckle bumps across the top
  const knuckles = [-6, -2, 2, 6];
  for (const kx of knuckles) {
    ctx.beginPath();
    ctx.ellipse(kx, -4, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Thumb on the right side
  ctx.beginPath();
  ctx.ellipse(9, 0, 3, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawBadge(ctx, x, y, count, cellSize) {
  const radius = Math.max(7, cellSize * 0.09);
  const fontSize = Math.max(9, radius * 1.3);

  // Circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = BADGE_BG;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Number
  ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = BADGE_TEXT;
  ctx.fillText(count.toString(), x, y + 0.5);
}
