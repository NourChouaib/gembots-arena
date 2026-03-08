/**
 * Betting Integration stub
 * TODO: integrate with BSC betting contract
 */

module.exports = {
  isBettingEnabled() { return false; },
  getStatus() { return { enabled: false, initialized: false }; },
  async initializeBetting() { return true; },
  async createBettingPool(matchId, bot1Name, bot2Name) { return { success: false, reason: 'stub' }; },
  async lockBettingPool(matchId) { return { success: false }; },
  async resolveBettingPool(matchId, winningSide) { return { success: false }; },
  async collectPoolFees(matchId) { return { success: false }; },
  async openBetting(matchId, bot1Id, bot2Id, durationSec) { return null; },
  async closeBetting(matchId) { return null; },
  async resolveBetting(matchId, winnerId) { return null; },
  getBettingStatus(matchId) { return { enabled: false, bets: [] }; },
};
