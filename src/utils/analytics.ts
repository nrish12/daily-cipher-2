export const analytics = {
  init: () => {
    console.log('Analytics initialized (placeholder)');
  },

  gameStarted: (category: string) => {
    console.log('Event: game_started', { category });
  },

  guessSubmitted: (correct: boolean, attempt: number, cluesRevealed: number) => {
    console.log('Event: guess_submitted', { correct, attempt, cluesRevealed });
  },

  puzzleSolved: (score: number, attempts: number, timeSeconds: number, category: string) => {
    console.log('Event: puzzle_solved', { score, attempts, timeSeconds, category });
  },

  puzzleFailed: (attempts: number, cluesRevealed: number, category: string) => {
    console.log('Event: puzzle_failed', { attempts, cluesRevealed, category });
  },

  hintUsed: (hintType: string, cluesRevealed: number) => {
    console.log('Event: hint_used', { hintType, cluesRevealed });
  },

  shareClicked: () => {
    console.log('Event: share_clicked');
  },

  achievementUnlocked: (achievementId: string, rarity: string) => {
    console.log('Event: achievement_unlocked', { achievementId, rarity });
  },

  categorySelected: (category: string) => {
    console.log('Event: category_selected', { category });
  },

  streakExtended: (streakLength: number) => {
    console.log('Event: streak_extended', { streakLength });
  }
};
