/**
 * Pixel-to-board coordinate conversion and input routing.
 */

export function createInputHandler(canvas, renderer, onBoardClick) {
  function handleClick(pixelX, pixelY) {
    const boardPos = renderer.pixelToBoard(pixelX, pixelY);
    if (boardPos) {
      onBoardClick(boardPos.row, boardPos.col);
    }
  }

  return {
    handleClick,
  };
}
