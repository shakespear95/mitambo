/**
 * Desktop mouse click events.
 */

export function setupMouseHandler(canvas, inputHandler) {
  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;

    inputHandler.handleClick(pixelX, pixelY);
  }

  canvas.addEventListener('click', onClick);

  return {
    destroy() {
      canvas.removeEventListener('click', onClick);
    },
  };
}
