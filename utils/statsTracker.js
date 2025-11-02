const fs = require('fs').promises;
const path = require('path');

class StatsTracker {
  constructor() {
    this.statsFile = path.join(__dirname, '..', 'data', 'daily-stats.json');
    this.stats = null;
  }

  async initialize() {
    try {
      const data = await fs.readFile(this.statsFile, 'utf8');
      this.stats = JSON.parse(data);
      
      const today = new Date().toISOString().split('T')[0];
      if (this.stats.date !== today) {
        await this.resetDailyStats();
      }
    } catch (error) {
      await this.resetDailyStats();
    }
  }

  async resetDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    this.stats = {
      date: today,
      totalAttempts: 0,
      totalSolved: 0,
      activePlayers: 0,
      solvesByClueCount: {},
      cluePaths: {},
      recentSolves: [],
      averageSolveTime: 0,
      fastestSolve: null
    };
    await this.saveStats();
  }

  async recordAttempt() {
    this.stats.totalAttempts++;
    this.stats.activePlayers++;
    await this.saveStats();
  }

  async recordSolve(data) {
    const { cluesUsed, timeTaken, clueIndices, userId } = data;
    
    this.stats.totalSolved++;
    
    if (!this.stats.solvesByClueCount[cluesUsed]) {
      this.stats.solvesByClueCount[cluesUsed] = 0;
    }
    this.stats.solvesByClueCount[cluesUsed]++;
    
    const clueKey = clueIndices.join(',');
    if (!this.stats.cluePaths[clueKey]) {
      this.stats.cluePaths[clueKey] = 0;
    }
    this.stats.cluePaths[clueKey]++;
    
    this.stats.recentSolves.unshift({
      cluesUsed,
      timeTaken,
      timestamp: Date.now(),
      userId: userId.substring(0, 8)
    });
    
    if (this.stats.recentSolves.length > 20) {
      this.stats.recentSolves = this.stats.recentSolves.slice(0, 20);
    }
    
    const totalTime = this.stats.recentSolves.reduce((sum, s) => sum + s.timeTaken, 0);
    this.stats.averageSolveTime = Math.floor(totalTime / this.stats.recentSolves.length);
    
    if (!this.stats.fastestSolve || timeTaken < this.stats.fastestSolve.timeTaken) {
      this.stats.fastestSolve = {
        cluesUsed,
        timeTaken,
        timestamp: Date.now()
      };
    }
    
    await this.saveStats();
  }

  getStats() {
    return {
      totalAttempts: this.stats.totalAttempts,
      totalSolved: this.stats.totalSolved,
      activePlayers: this.stats.activePlayers,
      solveRate: this.stats.totalAttempts > 0 
        ? Math.floor((this.stats.totalSolved / this.stats.totalAttempts) * 100)
        : 0,
      solvesByClueCount: this.stats.solvesByClueCount,
      recentSolves: this.stats.recentSolves.slice(0, 5),
      averageSolveTime: this.stats.averageSolveTime,
      fastestSolve: this.stats.fastestSolve,
      popularPaths: this.getPopularPaths()
    };
  }

  getPopularPaths() {
    const paths = Object.entries(this.stats.cluePaths)
      .map(([path, count]) => ({
        clues: path.split(',').map(Number),
        count,
        percentage: this.stats.totalSolved > 0 
          ? Math.floor((count / this.stats.totalSolved) * 100)
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    return paths;
  }

  async saveStats() {
    await fs.writeFile(this.statsFile, JSON.stringify(this.stats, null, 2));
  }

  decrementActivePlayers() {
    if (this.stats.activePlayers > 0) {
      this.stats.activePlayers--;
    }
  }
}

module.exports = StatsTracker;