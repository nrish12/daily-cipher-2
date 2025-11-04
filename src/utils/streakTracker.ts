interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string;
  totalDaysPlayed: number;
  playHistory: string[]; // Array of dates in ISO format
}

export class StreakTracker {
  private static STORAGE_KEY = 'dailyCipherStreak';

  static getStreak(): StreakData {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedDate: '',
        totalDaysPlayed: 0,
        playHistory: []
      };
    }
    return JSON.parse(stored);
  }

  static recordPlay(date: Date = new Date()): StreakData {
    const today = date.toISOString().split('T')[0];
    const streak = this.getStreak();

    // Already played today
    if (streak.lastPlayedDate === today) {
      return streak;
    }

    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if continuing streak
    if (streak.lastPlayedDate === yesterdayStr) {
      streak.currentStreak++;
    } else if (streak.lastPlayedDate === '') {
      // First time playing
      streak.currentStreak = 1;
    } else {
      // Streak broken
      streak.currentStreak = 1;
    }

    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    streak.lastPlayedDate = today;
    streak.totalDaysPlayed++;
    streak.playHistory.push(today);

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(streak));
    return streak;
  }

  static getStreakBonus(streak: number): number {
    if (streak >= 30) return 500;
    if (streak >= 14) return 300;
    if (streak >= 7) return 150;
    if (streak >= 3) return 50;
    return 0;
  }

  static getStreakStatus(): { isActive: boolean; daysUntilLoss: number } {
    const streak = this.getStreak();
    if (!streak.lastPlayedDate) {
      return { isActive: false, daysUntilLoss: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const lastPlayed = new Date(streak.lastPlayedDate);
    const daysSince = Math.floor((Date.now() - lastPlayed.getTime()) / 86400000);

    return {
      isActive: daysSince <= 1,
      daysUntilLoss: daysSince > 1 ? 0 : 1 - daysSince
    };
  }
}
