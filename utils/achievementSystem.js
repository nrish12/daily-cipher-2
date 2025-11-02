const fs = require('fs').promises;
const path = require('path');

class AchievementSystem {
  constructor() {
    this.profilesFile = path.join(__dirname, '..', 'data', 'user-profiles.json');
    this.profiles = {};
  }

  async initialize() {
    try {
      const data = await fs.readFile(this.profilesFile, 'utf8');
      this.profiles = JSON.parse(data);
    } catch (error) {
      this.profiles = {};
    }
  }

  async getProfile(userId) {
    if (!this.profiles[userId]) {
      this.profiles[userId] = {
        id: userId,
        totalGames: 0,
        totalSolves: 0,
        totalHints: 3,
        solveStreak: 0,
        longestStreak: 0,
        lastPlayed: null,
        badges: [],
        cognitiveProfile: {
          historicalClues: 0,
          culturalClues: 0,
          geographicalClues: 0,
          technicalClues: 0,
          abstractClues: 0
        },
        solveHistory: [],
        averageCluesUsed: 0,
        fastestSolve: null,
        achievements: []
      };
    }
    return this.profiles[userId];
  }

  async updateProfile(userId, solveData) {
    const profile = await this.getProfile(userId);
    
    profile.totalGames++;
    profile.lastPlayed = new Date().toISOString();
    
    if (solveData.solved) {
      profile.totalSolves++;
      
      const today = new Date().toISOString().split('T')[0];
      const lastPlayed = profile.lastPlayed ? new Date(profile.lastPlayed).toISOString().split('T')[0] : null;
      
      if (lastPlayed) {
        const daysDiff = Math.floor((new Date(today) - new Date(lastPlayed)) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          profile.solveStreak++;
        } else if (daysDiff > 1) {
          profile.solveStreak = 1;
        }
      } else {
        profile.solveStreak = 1;
      }
      
      if (profile.solveStreak > profile.longestStreak) {
        profile.longestStreak = profile.solveStreak;
      }
      
      profile.solveHistory.unshift({
        date: today,
        cluesUsed: solveData.cluesUsed,
        timeTaken: solveData.timeTaken,
        score: solveData.score
      });
      
      if (profile.solveHistory.length > 30) {
        profile.solveHistory = profile.solveHistory.slice(0, 30);
      }
      
      const totalClues = profile.solveHistory.reduce((sum, h) => sum + h.cluesUsed, 0);
      profile.averageCluesUsed = profile.solveHistory.length > 0 
        ? (totalClues / profile.solveHistory.length).toFixed(1)
        : 0;
      
      if (!profile.fastestSolve || solveData.timeTaken < profile.fastestSolve.timeTaken) {
        profile.fastestSolve = {
          timeTaken: solveData.timeTaken,
          cluesUsed: solveData.cluesUsed,
          date: today
        };
      }
      
      profile.totalHints++;
    }
    
    if (solveData.category) {
      const categoryMap = {
        person: 'historicalClues',
        place: 'geographicalClues',
        thing: 'technicalClues',
        event: 'culturalClues'
      };
      
      const profileKey = categoryMap[solveData.category] || 'abstractClues';
      profile.cognitiveProfile[profileKey]++;
    }
    
    await this.checkAchievements(userId, profile);
    await this.saveProfiles();
    return profile;
  }

  async checkAchievements(userId, profile) {
    const achievements = [
      {
        id: 'first_solve',
        name: 'First Blood',
        description: 'Solved your first mystery',
        icon: '🎯',
        condition: () => profile.totalSolves >= 1
      },
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Solved in under 30 seconds',
        icon: '⚡',
        condition: () => profile.fastestSolve && profile.fastestSolve.timeTaken < 30000
      },
      {
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Solved with only 1 clue',
        icon: '🎲',
        condition: () => profile.solveHistory.some(h => h.cluesUsed === 1)
      },
      {
        id: 'streak_3',
        name: 'Hot Streak',
        description: 'Solved 3 days in a row',
        icon: '🔥',
        condition: () => profile.solveStreak >= 3
      },
      {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Solved 7 days in a row',
        icon: '👑',
        condition: () => profile.solveStreak >= 7
      },
      {
        id: 'historian',
        name: 'Historian',
        description: 'Excel at historical mysteries',
        icon: '📚',
        condition: () => profile.cognitiveProfile.historicalClues >= 10
      },
      {
        id: 'explorer',
        name: 'Explorer',
        description: 'Master of geographical puzzles',
        icon: '🗺️',
        condition: () => profile.cognitiveProfile.geographicalClues >= 10
      },
      {
        id: 'culture_vulture',
        name: 'Culture Vulture',
        description: 'Cultural reference expert',
        icon: '🎭',
        condition: () => profile.cognitiveProfile.culturalClues >= 10
      },
      {
        id: 'veteran',
        name: 'Veteran Detective',
        description: 'Played 30 games',
        icon: '🕵️',
        condition: () => profile.totalGames >= 30
      },
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Average under 3 clues per solve',
        icon: '💎',
        condition: () => parseFloat(profile.averageCluesUsed) < 3
      }
    ];

    for (const achievement of achievements) {
      if (achievement.condition() && !profile.achievements.includes(achievement.id)) {
        profile.achievements.push(achievement.id);
        profile.badges.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          earnedAt: new Date().toISOString()
        });
      }
    }
  }

  async useHint(userId) {
    const profile = await this.getProfile(userId);
    if (profile.totalHints > 0) {
      profile.totalHints--;
      await this.saveProfiles();
      return { success: true, remaining: profile.totalHints };
    }
    return { success: false, remaining: 0 };
  }

  getCognitiveStyle(profile) {
    const cognitive = profile.cognitiveProfile;
    const total = Object.values(cognitive).reduce((sum, val) => sum + val, 0);
    
    if (total === 0) return 'New Detective';
    
    const percentages = Object.entries(cognitive).map(([key, value]) => ({
      type: key.replace('Clues', ''),
      percentage: Math.floor((value / total) * 100),
      value
    })).sort((a, b) => b.value - a.value);
    
    const dominant = percentages[0];
    
    const styles = {
      historical: 'Time Traveler',
      cultural: 'Pop Culture Expert',
      geographical: 'World Explorer',
      technical: 'Tech Wizard',
      abstract: 'Abstract Thinker'
    };
    
    return styles[dominant.type] || 'Mystery Solver';
  }

  async saveProfiles() {
    await fs.writeFile(this.profilesFile, JSON.stringify(this.profiles, null, 2));
  }

  getAllAchievements() {
    return [
      { id: 'first_solve', name: 'First Blood', icon: '🎯', description: 'Solved your first mystery' },
      { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', description: 'Solved in under 30 seconds' },
      { id: 'minimalist', name: 'Minimalist', icon: '🎲', description: 'Solved with only 1 clue' },
      { id: 'streak_3', name: 'Hot Streak', icon: '🔥', description: 'Solved 3 days in a row' },
      { id: 'streak_7', name: 'Week Warrior', icon: '👑', description: 'Solved 7 days in a row' },
      { id: 'historian', name: 'Historian', icon: '📚', description: 'Excel at historical mysteries' },
      { id: 'explorer', name: 'Explorer', icon: '🗺️', description: 'Master of geographical puzzles' },
      { id: 'culture_vulture', name: 'Culture Vulture', icon: '🎭', description: 'Cultural reference expert' },
      { id: 'veteran', name: 'Veteran Detective', icon: '🕵️', description: 'Played 30 games' },
      { id: 'perfectionist', name: 'Perfectionist', icon: '💎', description: 'Average under 3 clues per solve' }
    ];
  }
}

module.exports = AchievementSystem;