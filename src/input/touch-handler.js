/**
 * Mobile touch events.
 */

export function setupTouchHandler(canvas, inputHandler) {
  function onTouchEnd(event) {
    event.preventDefault();
    const touch = event.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const pixelX = (touch.clientX - rect.left) * scaleX;
    const pixelY = (touch.clientY - rect.top) * scaleY;

    inputHandler.handleClick(pixelX, pixelY);
  }

  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  return {
    destroy() {
      canvas.removeEventListener('touchend', onTouchEnd);
    },
  };
}
