/**
 * State sanitizer for Crazy 8.
 * Strips private information (opponent's hand) before sending to each player.
 */

/**
 * Create a sanitized state view for a specific player.
 * The player sees their own hand but only the count of the opponent's hand.
 */
export function sanitizeStateFor(state, playerId, playerIds) {
  const opponentId = playerIds.find(id => id !== playerId);

  return {
    currentPlayerIndex: state.currentPlayerIndex,
    players: state.players,
    direction: state.direction,
    myHand: state.hands[playerId] || [],
    opponentCardCount: state.hands[opponentId]?.length || 0,
    drawPileCount: state.drawPile.length,
    discardPile: state.discardPile.slice(0, 3), // Only top 3 cards visible
    topDiscard: state.discardPile[0] || null,
    pendingPickup: state.pendingPickup,
    mustCarryOn: state.mustCarryOn,
    carryOnSuit: state.carryOnSuit,
    declaredSuit: state.declaredSuit,
    lastCall: state.lastCall,
    fsmState: state.fsmState,
    winner: state.winner,
    turnCount: state.turnCount,
  };
}
