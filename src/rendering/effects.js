/**
 * Visual effects for captures, promotions, etc.
 */

export function createEffectsManager() {
  const particles = [];

  return {
    /**
     * Spawn capture explosion particles at board position.
     */
    spawnCaptureEffect(x, y, color) {
      const count = 12;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 1 + Math.random() * 2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.02,
          size: 2 + Math.random() * 3,
          color,
        });
      }
    },

    /**
     * Spawn promotion glow particles.
     */
    spawnPromotionEffect(x, y) {
      const count = 20;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 0.5 + Math.random() * 1.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 1.0,
          decay: 0.015 + Math.random() * 0.01,
          size: 2 + Math.random() * 4,
          color: '#FFD700',
        });
      }
    },

    /**
     * Update and draw all particles.
     */
    update(ctx) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.vy += 0.05; // gravity

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      return particles.length > 0;
    },

    hasActiveEffects() {
      return particles.length > 0;
    },

    clear() {
      particles.length = 0;
    },
  };
}
