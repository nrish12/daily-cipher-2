export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: (stats: GameStats) => boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  perfectGames: number; // No hints, first try
  totalScore: number;
  currentStreak: number;
  longestStreak: number;
  hintsUsed: number;
  cluesRevealed: number;
  fastestWin: number; // milliseconds
  categories: {
    person: number;
    place: number;
    thing: number;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // Beginner
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Solve your first mystery',
    icon: '🎯',
    requirement: (stats) => stats.gamesWon >= 1,
    rarity: 'common',
    points: 50
  },
  {
    id: 'hat_trick',
    name: 'Hat Trick',
    description: 'Maintain a 3-day streak',
    icon: '🎩',
    requirement: (stats) => stats.currentStreak >= 3,
    rarity: 'common',
    points: 100
  },

  // Intermediate
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚔️',
    requirement: (stats) => stats.currentStreak >= 7,
    rarity: 'rare',
    points: 250
  },
  {
    id: 'perfect_game',
    name: 'Flawless',
    description: 'Win on first attempt with no hints',
    icon: '💎',
    requirement: (stats) => stats.perfectGames >= 1,
    rarity: 'rare',
    points: 300
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Solve in under 60 seconds',
    icon: '⚡',
    requirement: (stats) => stats.fastestWin > 0 && stats.fastestWin < 60000,
    rarity: 'rare',
    points: 200
  },
  {
    id: 'category_master_person',
    name: 'People Person',
    description: 'Solve 10 person mysteries',
    icon: '👤',
    requirement: (stats) => stats.categories.person >= 10,
    rarity: 'rare',
    points: 150
  },

  // Advanced
  {
    id: 'month_master',
    name: 'Monthly Maestro',
    description: 'Maintain a 30-day streak',
    icon: '👑',
    requirement: (stats) => stats.currentStreak >= 30,
    rarity: 'epic',
    points: 1000
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Reach 10,000 total score',
    icon: '💰',
    requirement: (stats) => stats.totalScore >= 10000,
    rarity: 'epic',
    points: 500
  },
  {
    id: 'no_hints_needed',
    name: 'Mind Reader',
    description: 'Win 5 games without using any hints',
    icon: '🧠',
    requirement: (stats) => stats.perfectGames >= 5,
    rarity: 'epic',
    points: 750
  },

  // Legendary
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Play 100 games',
    icon: '💯',
    requirement: (stats) => stats.gamesPlayed >= 100,
    rarity: 'legendary',
    points: 2000
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Maintain a 100-day streak',
    icon: '🔥',
    requirement: (stats) => stats.longestStreak >= 100,
    rarity: 'legendary',
    points: 5000
  }
];

export class AchievementManager {
  private static STORAGE_KEY = 'dailyCipherAchievements';
  private static STATS_KEY = 'dailyCipherStats';

  static getUnlockedAchievements(): string[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static getStats(): GameStats {
    const stored = localStorage.getItem(this.STATS_KEY);
    if (!stored) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        perfectGames: 0,
        totalScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        hintsUsed: 0,
        cluesRevealed: 0,
        fastestWin: 0,
        categories: { person: 0, place: 0, thing: 0 }
      };
    }
    return JSON.parse(stored);
  }

  static updateStats(update: Partial<GameStats>): GameStats {
    const current = this.getStats();
    const updated = { ...current, ...update };
    localStorage.setItem(this.STATS_KEY, JSON.stringify(updated));
    return updated;
  }

  static checkNewAchievements(): Achievement[] {
    const stats = this.getStats();
    const unlocked = this.getUnlockedAchievements();
    const newUnlocks: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (!unlocked.includes(achievement.id) && achievement.requirement(stats)) {
        unlocked.push(achievement.id);
        newUnlocks.push(achievement);
      }
    }

    if (newUnlocks.length > 0) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(unlocked));
    }

    return newUnlocks;
  }

  static getProgress(): { completed: number; total: number; percentage: number } {
    const unlocked = this.getUnlockedAchievements();
    const total = ACHIEVEMENTS.length;
    const completed = unlocked.length;
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  }
}
