/**
 * Base game session class.
 * Common functionality for all game types: turn tracking, move counting, game over.
 */
import { recordGame } from '../db/game-repo.js';

export class GameSession {
  constructor(room, broadcast) {
    this.room = room;
    this.broadcast = broadcast;
    this.moveCount = 0;
    this.currentPlayerUid = room.players[0].uid;
    this.gameOver = false;
    this.winner = null;
  }

  /**
   * Get which player role (player1/player2) a uid corresponds to.
   */
  getPlayerRole(uid) {
    const p = this.room.players.find(p => p && p.uid === uid);
    return p ? p.role : null;
  }

  /**
   * Check if it's this player's turn.
   */
  isPlayerTurn(uid) {
    return this.currentPlayerUid === uid;
  }

  /**
   * Switch to the other player.
   */
  switchTurn() {
    const other = this.room.players.find(p => p && p.uid !== this.currentPlayerUid);
    if (other) {
      this.currentPlayerUid = other.uid;
    }
  }

  /**
   * Get the UID of a player role.
   */
  getUidForRole(role) {
    const p = this.room.players.find(p => p && p.role === role);
    return p ? p.uid : null;
  }

  /**
   * Get the opponent's UID.
   */
  getOpponentUid(uid) {
    const other = this.room.players.find(p => p && p.uid !== uid);
    return other ? other.uid : null;
  }

  getMoveCount() {
    return this.moveCount;
  }

  /**
   * End the game and record result.
   */
  async endGame(winnerId, reason = 'normal') {
    if (this.gameOver) return;
    this.gameOver = true;
    this.winner = winnerId;

    const durationS = Math.round((Date.now() - (this.room.startedAt || Date.now())) / 1000);

    let gameResult;
    try {
      gameResult = await recordGame({
        gameType: this.room.gameType,
        player1Id: this.room.players[0].uid,
        player2Id: this.room.players[1].uid,
        winnerId,
        forfeit: reason === 'forfeit',
        durationS,
        moveCount: this.moveCount,
      });
    } catch (err) {
      // DB failure — still broadcast game over with zeroed deltas
      gameResult = {
        eloDelta: {},
        newElo: {},
      };
    }

    this.broadcast({
      type: 'game_over',
      payload: {
        winnerId,
        reason,
        eloDelta: gameResult.eloDelta,
        newElo: gameResult.newElo,
      },
    });

    this.room.status = 'finished';
  }
}
