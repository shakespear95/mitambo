/**
 * Crazy 8 game bootstrap & game loop.
 * Wires up renderer, input, UI, game logic, and AI.
 */
import { HUMAN, AI, CRAZY8_FSM, AI_THINK_DELAY_MS, DEAL_STAGGER_MS,
         DEAL_COUNT } from './core/constants.js';
import { createCrazy8State, updateCrazy8State, getCurrentPlayer, getTopDiscard } from './core/state.js';
import {
  playCard, declareSuit, drawForPlayer, applyPickupPenalty,
  completeTurn, mustPickUp, getPlayerPlayableCards, handleCarryOnDraw,
} from './rules/turn-resolver.js';
import { chooseCard, chooseCarryOnCard } from './ai/ai-player.js';
import { createCrazy8Renderer } from './rendering/renderer.js';
import { setupMouseHandler } from '../input/mouse-handler.js';
import { setupTouchHandler } from '../input/touch-handler.js';
import { createSuitPicker } from './ui/suit-picker.js';
import { createCrazy8GameUI } from './ui/game-ui.js';
import { createCrazy8GameOverScreen } from './ui/game-over-screen.js';

/**
 * Boot the Crazy 8 game.
 */
export function bootCrazy8(canvas, uiContainer, eventBus, audioManager, onBack) {
  const renderer = createCrazy8Renderer(canvas);
  const suitPicker = createSuitPicker(uiContainer);
  const gameUI = createCrazy8GameUI(uiContainer);
  const gameOverScreen = createCrazy8GameOverScreen(uiContainer);

  let gameState = null;
  let animating = false;
  let destroyed = false;
  let animFrameId = null;
  let hoveredCardIndex = null;
  let skipNextAdvance = false;

  // Cached playable card IDs — invalidated on state change
  let cachedPlayableIds = null;
  let cachedPlayableState = null;

  // Input handling — zone-based hit testing, not grid-based
  const inputAdapter = { handleClick: (px, py) => handleCanvasClick(px, py) };
  const mouseHandler = setupMouseHandler(canvas, inputAdapter);
  const touchHandler = setupTouchHandler(canvas, inputAdapter);

  // Hover tracking
  function onMouseMove(event) {
    if (!gameState || destroyed || animating) return;
    const current = getCurrentPlayer(gameState);
    if (current !== HUMAN) { setHover(null); return; }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (event.clientX - rect.left) * scaleX;
    const py = (event.clientY - rect.top) * scaleY;

    const hit = renderer.hitTest(px, py, null);
    if (hit && hit.zone === 'playerHand') {
      setHover(hit.cardIndex);
    } else if (hit && hit.zone === 'drawPile') {
      canvas.style.cursor = 'pointer';
      setHover(null);
    } else {
      canvas.style.cursor = 'default';
      setHover(null);
    }
  }

  function setHover(index) {
    if (hoveredCardIndex === index) return;
    hoveredCardIndex = index;
    canvas.style.cursor = index !== null ? 'pointer' : 'default';
    render();
  }

  canvas.addEventListener('mousemove', onMouseMove);

  function handleResize() {
    renderer.resizeCanvas();
    render();
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // Start a new game
  startGame();

  // Game loop — only runs when animations are active
  function gameLoop(time) {
    if (destroyed) return;
    const hasAnim = renderer.updateAnimations(time);
    if (hasAnim) render();
    animFrameId = requestAnimationFrame(gameLoop);
  }
  animFrameId = requestAnimationFrame(gameLoop);

  // ----- Playable Cache -----

  function getPlayableIds() {
    if (cachedPlayableState === gameState && cachedPlayableIds) {
      return cachedPlayableIds;
    }
    const playable = getPlayerPlayableCards(gameState);
    cachedPlayableIds = new Set(playable.map(c => c.id));
    cachedPlayableState = gameState;
    return cachedPlayableIds;
  }

  function invalidateCache() {
    cachedPlayableIds = null;
    cachedPlayableState = null;
  }

  // ----- Game Start -----

  async function startGame() {
    gameState = createCrazy8State();
    hoveredCardIndex = null;
    skipNextAdvance = false;
    invalidateCache();

    gameUI.show();
    gameUI.update(gameState);
    render();

    // Deal animation
    await animateDeal();
    if (destroyed) return;

    gameState = updateCrazy8State(gameState, { fsmState: CRAZY8_FSM.PLAYER_TURN });
    invalidateCache();
    gameUI.update(gameState);
    render();
  }

  async function animateDeal() {
    animating = true;
    const total = DEAL_COUNT * 2; // cards dealt to both players
    for (let i = 0; i < total; i++) {
      if (destroyed) break;
      audioManager.play('cardDraw');
      await delay(DEAL_STAGGER_MS);
    }
    animating = false;
  }

  // ----- Input Handling -----

  function handleCanvasClick(px, py) {
    if (animating || destroyed || !gameState) return;

    const { fsmState } = gameState;
    const current = getCurrentPlayer(gameState);

    if (current !== HUMAN) return;

    if (fsmState === CRAZY8_FSM.PLAYER_TURN || fsmState === CRAZY8_FSM.CARD_SELECTED) {
      handlePlayerTurnClick(px, py);
    } else if (fsmState === CRAZY8_FSM.CARRY_ON) {
      handleCarryOnClick(px, py);
    } else if (fsmState === CRAZY8_FSM.DRAWN_PLAY_OPTION) {
      handleDrawnPlayClick(px, py);
    }
  }

  function handlePlayerTurnClick(px, py) {
    const hit = renderer.hitTest(px, py, null);
    if (!hit) return;

    if (hit.zone === 'playerHand') {
      const playableIds = getPlayableIds();
      const isPlayable = playableIds.has(hit.card.id);

      if (isPlayable) {
        // Single click on playable card = play it immediately
        executePlayerPlay(hit.card);
      } else {
        audioManager.play('error');
      }
      return;
    }

    if (hit.zone === 'drawPile') {
      if (gameState.pendingPickup > 0 && mustPickUp(gameState)) {
        handlePickupPenalty();
        return;
      }

      if (gameState.pendingPickup === 0) {
        handlePlayerDraw();
      }
    }
  }

  function handleCarryOnClick(px, py) {
    const hit = renderer.hitTest(px, py, null);
    if (!hit) return;

    if (hit.zone === 'playerHand') {
      const playableIds = getPlayableIds();
      if (playableIds.has(hit.card.id)) {
        executePlayerPlay(hit.card);
      }
      return;
    }

    if (hit.zone === 'drawPile') {
      animating = true;
      gameState = handleCarryOnDraw(gameState);
      gameState = updateCrazy8State(gameState, { fsmState: CRAZY8_FSM.TURN_COMPLETE });
      invalidateCache();
      animating = false;
      render();
      finishTurn();
    }
  }

  function handleDrawnPlayClick(px, py) {
    const hit = renderer.hitTest(px, py, null);

    if (hit && hit.zone === 'playerHand' && gameState.drawnCard) {
      if (hit.card.id === gameState.drawnCard.id) {
        executePlayerPlay(hit.card);
        return;
      }
    }

    // Click elsewhere = pass
    gameState = updateCrazy8State(gameState, {
      drawnCard: null,
      fsmState: CRAZY8_FSM.TURN_COMPLETE,
    });
    invalidateCache();
    render();
    finishTurn();
  }

  // ----- Player Actions -----

  async function executePlayerPlay(card) {
    animating = true;

    const result = playCard(gameState, card.id);
    if (!result.valid) {
      animating = false;
      audioManager.play('error');
      return;
    }

    // Animate card from hand to discard pile
    const cardPos = renderer.getCardPosition(card.id);
    if (cardPos) {
      audioManager.play('cardPlay');
      gameState = result.state;
      invalidateCache();
      render(); // render without the played card first
      await renderer.animateCardPlay(card, cardPos.x, cardPos.y);
      if (destroyed) return;
    } else {
      audioManager.play('cardPlay');
      gameState = result.state;
      invalidateCache();
    }

    // Check for win
    if (gameState.fsmState === CRAZY8_FSM.GAME_OVER) {
      animating = false;
      audioManager.play('gameOver');
      gameUI.update(gameState);
      render();
      await delay(400);
      if (destroyed) return;
      gameOverScreen.show(gameState.winner, startGame, onBack);
      return;
    }

    // Handle suit choice for 8
    if (result.needsSuitChoice) {
      animating = false;
      gameState = updateCrazy8State(gameState, { fsmState: CRAZY8_FSM.CHOOSING_SUIT });
      invalidateCache();
      gameUI.update(gameState);
      render();
      suitPicker.show((suit) => {
        gameState = declareSuit(gameState, suit);
        gameState = updateCrazy8State(gameState, { fsmState: CRAZY8_FSM.TURN_COMPLETE });
        invalidateCache();
        gameUI.update(gameState);
        render();
        finishTurn();
      });
      return;
    }

    // Handle carry-on for K
    if (result.needsCarryOn) {
      animating = false;
      gameState = updateCrazy8State(gameState, { fsmState: CRAZY8_FSM.CARRY_ON });
      invalidateCache();
      gameUI.update(gameState);
      render();
      return;
    }

    if (result.skipNext) {
      skipNextAdvance = true;
    }

    animating = false;
    gameUI.update(gameState);
    render();
    finishTurn();
  }

  async function handlePlayerDraw() {
    animating = true;
    audioManager.play('cardDraw');

    // Animate card from draw pile to player hand
    const layout = renderer.getLayout();
    await renderer.animateCardDraw(
      layout.playerHandCenter.x, layout.playerHandCenter.y, false, null
    );
    if (destroyed) return;

    gameState = drawForPlayer(gameState);
    invalidateCache();
    animating = false;
    gameUI.update(gameState);
    render();

    if (gameState.fsmState === CRAZY8_FSM.DRAWN_PLAY_OPTION) {
      return;
    }
    finishTurn();
  }

  async function handlePickupPenalty() {
    animating = true;
    const count = gameState.pendingPickup;

    // Animate cards being drawn
    for (let i = 0; i < Math.min(count, 5); i++) {
      audioManager.play('cardDraw');
      const layout = renderer.getLayout();
      await renderer.animateCardDraw(
        layout.playerHandCenter.x, layout.playerHandCenter.y, false, null
      );
      if (destroyed) return;
    }

    gameState = applyPickupPenalty(gameState);
    gameState = updateCrazy8State(gameState, { fsmState: CRAZY8_FSM.TURN_COMPLETE });
    invalidateCache();
    animating = false;
    gameUI.update(gameState);
    render();
    finishTurn();
  }

  // ----- Turn Management -----

  function finishTurn() {
    const skip = skipNextAdvance;
    skipNextAdvance = false;

    gameState = completeTurn(gameState, skip);
    invalidateCache();
    gameUI.update(gameState);
    render();

    const current = getCurrentPlayer(gameState);
    if (current === AI) {
      scheduleAITurn();
    }
  }

  // ----- AI Turn -----

  function scheduleAITurn() {
    if (destroyed) return;

    gameState = updateCrazy8State(gameState, { fsmState: CRAZY8_FSM.AI_THINKING });
    invalidateCache();
    gameUI.update(gameState);
    render();

    setTimeout(() => {
      if (destroyed) return;
      executeAITurn();
    }, AI_THINK_DELAY_MS + Math.random() * 200);
  }

  async function executeAITurn() {
    if (destroyed) return;
    animating = true;

    // Check if AI must pick up
    if (gameState.pendingPickup > 0 && mustPickUp(gameState)) {
      const count = gameState.pendingPickup;
      for (let i = 0; i < Math.min(count, 5); i++) {
        audioManager.play('cardDraw');
        const layout = renderer.getLayout();
        await renderer.animateCardDraw(
          layout.aiHandCenter.x, layout.aiHandCenter.y, false, null
        );
        if (destroyed) return;
      }
      gameState = applyPickupPenalty(gameState);
      gameState = updateCrazy8State(gameState, { fsmState: CRAZY8_FSM.TURN_COMPLETE });
      invalidateCache();
      animating = false;
      gameUI.update(gameState);
      render();
      finishTurn();
      return;
    }

    // Try to play a card
    const choice = chooseCard(gameState);

    if (choice) {
      const result = playCard(gameState, choice.card.id);
      if (result.valid) {
        // Animate AI card from AI hand to discard pile
        const layout = renderer.getLayout();
        gameState = result.state;
        invalidateCache();
        render();
        audioManager.play('cardPlay');
        await renderer.animateCardPlay(
          choice.card,
          layout.aiHandCenter.x - renderer.getCardDimensions().cardWidth / 2,
          layout.aiHandCenter.y - renderer.getCardDimensions().cardHeight / 2,
        );
        if (destroyed) return;

        // Check for win
        if (gameState.fsmState === CRAZY8_FSM.GAME_OVER) {
          animating = false;
          audioManager.play('gameOver');
          gameUI.update(gameState);
          render();
          await delay(400);
          if (destroyed) return;
          gameOverScreen.show(gameState.winner, startGame, onBack);
          return;
        }

        if (result.needsSuitChoice && choice.suitChoice) {
          gameState = declareSuit(gameState, choice.suitChoice);
          invalidateCache();
        }

        if (result.needsCarryOn) {
          await handleAICarryOn();
          return;
        }

        if (result.skipNext) {
          skipNextAdvance = true;
        }

        animating = false;
        gameUI.update(gameState);
        render();
        finishTurn();
        return;
      }
    }

    // No playable card — AI draws
    audioManager.play('cardDraw');
    const layout = renderer.getLayout();
    await renderer.animateCardDraw(
      layout.aiHandCenter.x, layout.aiHandCenter.y, false, null
    );
    if (destroyed) return;

    gameState = drawForPlayer(gameState);
    invalidateCache();

    // Check if drawn card can be played
    if (gameState.fsmState === CRAZY8_FSM.DRAWN_PLAY_OPTION && gameState.drawnCard) {
      const drawnResult = playCard(gameState, gameState.drawnCard.id);
      if (drawnResult.valid) {
        gameState = drawnResult.state;
        invalidateCache();
        render();
        audioManager.play('cardPlay');
        await renderer.animateCardPlay(
          gameState.drawnCard || drawnResult.state.discardPile?.[0] || {},
          layout.aiHandCenter.x - renderer.getCardDimensions().cardWidth / 2,
          layout.aiHandCenter.y - renderer.getCardDimensions().cardHeight / 2,
        );
        if (destroyed) return;

        if (gameState.fsmState === CRAZY8_FSM.GAME_OVER) {
          animating = false;
          audioManager.play('gameOver');
          gameUI.update(gameState);
          render();
          await delay(400);
          if (destroyed) return;
          gameOverScreen.show(gameState.winner, startGame, onBack);
          return;
        }

        if (drawnResult.needsSuitChoice) {
          gameState = declareSuit(gameState, chooseSuitForAI());
          invalidateCache();
        }

        if (drawnResult.needsCarryOn) {
          await handleAICarryOn();
          return;
        }

        if (drawnResult.skipNext) {
          skipNextAdvance = true;
        }
      }
    }

    gameState = updateCrazy8State(gameState, {
      drawnCard: null,
      fsmState: CRAZY8_FSM.TURN_COMPLETE,
    });
    invalidateCache();
    animating = false;
    gameUI.update(gameState);
    render();
    finishTurn();
  }

  async function handleAICarryOn() {
    const carryOnCard = chooseCarryOnCard(gameState);
    if (carryOnCard) {
      const result = playCard(gameState, carryOnCard.id);
      if (result.valid) {
        const layout = renderer.getLayout();
        gameState = result.state;
        invalidateCache();
        render();
        audioManager.play('cardPlay');
        await renderer.animateCardPlay(
          carryOnCard,
          layout.aiHandCenter.x - renderer.getCardDimensions().cardWidth / 2,
          layout.aiHandCenter.y - renderer.getCardDimensions().cardHeight / 2,
        );
        if (destroyed) return;

        if (gameState.fsmState === CRAZY8_FSM.GAME_OVER) {
          animating = false;
          audioManager.play('gameOver');
          gameUI.update(gameState);
          render();
          await delay(400);
          if (destroyed) return;
          gameOverScreen.show(gameState.winner, startGame, onBack);
          return;
        }

        if (result.needsSuitChoice) {
          gameState = declareSuit(gameState, chooseSuitForAI());
          invalidateCache();
        }

        if (result.needsCarryOn) {
          await handleAICarryOn();
          return;
        }
      }
    } else {
      gameState = handleCarryOnDraw(gameState);
      invalidateCache();
    }

    gameState = updateCrazy8State(gameState, { fsmState: CRAZY8_FSM.TURN_COMPLETE });
    invalidateCache();
    animating = false;
    gameUI.update(gameState);
    render();
    finishTurn();
  }

  function chooseSuitForAI() {
    const hand = gameState.hands[AI];
    const counts = {};
    for (const card of hand) {
      if (card.suit) counts[card.suit] = (counts[card.suit] || 0) + 1;
    }
    let best = 'hearts';
    let bestCount = -1;
    for (const [suit, count] of Object.entries(counts)) {
      if (count > bestCount) { bestCount = count; best = suit; }
    }
    return best;
  }

  // ----- Render -----

  function render() {
    if (!gameState || destroyed) return;
    const playableIds = getPlayableIds();
    renderer.render(gameState, playableIds, hoveredCardIndex);
  }

  // ----- Helpers -----

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ----- Cleanup -----

  function destroy() {
    destroyed = true;
    renderer.cancelAnimations();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    window.removeEventListener('resize', handleResize);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.style.cursor = 'pointer';
    mouseHandler.destroy();
    touchHandler.destroy();
    suitPicker.hide();
    gameUI.hide();
    gameOverScreen.hide();
  }

  return { destroy };
}
