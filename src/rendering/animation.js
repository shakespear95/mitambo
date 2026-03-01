/**
 * Tween system with easing functions for piece animations.
 */

/**
 * Easing functions.
 */
export const Easing = Object.freeze({
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutBounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
});

/**
 * Animation manager - tracks and updates active animations.
 */
export function createAnimationManager() {
  const animations = [];
  let animationId = 0;

  return {
    /**
     * Add a new animation.
     * Returns a promise that resolves when the animation completes.
     */
    add({ from, to, duration, easing = Easing.easeOutQuad, onUpdate, onComplete }) {
      return new Promise(resolve => {
        const id = ++animationId;
        const startTime = performance.now();

        animations.push({
          id,
          from,
          to,
          duration,
          easing,
          startTime,
          onUpdate,
          onComplete: () => {
            if (onComplete) onComplete();
            resolve();
          },
        });
      });
    },

    /**
     * Update all active animations. Called each frame.
     * Returns true if there are active animations.
     */
    update(currentTime) {
      for (let i = animations.length - 1; i >= 0; i--) {
        const anim = animations[i];
        const elapsed = currentTime - anim.startTime;
        const rawProgress = Math.min(elapsed / anim.duration, 1);
        const progress = anim.easing(rawProgress);

        // Interpolate values
        const current = {};
        for (const key of Object.keys(anim.from)) {
          current[key] = anim.from[key] + (anim.to[key] - anim.from[key]) * progress;
        }

        if (anim.onUpdate) {
          anim.onUpdate(current, progress);
        }

        if (rawProgress >= 1) {
          animations.splice(i, 1);
          if (anim.onComplete) anim.onComplete();
        }
      }

      return animations.length > 0;
    },

    /**
     * Check if any animations are active.
     */
    isAnimating() {
      return animations.length > 0;
    },

    /**
     * Clear all animations.
     */
    clear() {
      animations.length = 0;
    },
  };
}
