// Cipher Hunt - Supabase Client (Vanilla JS)
// Production-ready database integration

const SUPABASE_URL = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

// Simple Supabase client for vanilla JS
class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.headers = {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        };
    }

    async query(table, options = {}) {
        let url = `${this.url}/rest/v1/${table}`;
        const params = new URLSearchParams();

        if (options.select) params.append('select', options.select);
        if (options.eq) {
            for (const [key, value] of Object.entries(options.eq)) {
                params.append(key, `eq.${value}`);
            }
        }
        if (options.order) params.append('order', options.order);
        if (options.limit) params.append('limit', options.limit);

        if (params.toString()) url += `?${params}`;

        const response = await fetch(url, {
            headers: this.headers
        });

        if (!response.ok) throw new Error(`Supabase query failed: ${response.statusText}`);
        return await response.json();
    }

    async insert(table, data) {
        const url = `${this.url}/rest/v1/${table}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...this.headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error(`Supabase insert failed: ${response.statusText}`);
        return await response.json();
    }

    async update(table, id, data) {
        const url = `${this.url}/rest/v1/${table}?id=eq.${id}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                ...this.headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error(`Supabase update failed: ${response.statusText}`);
        return await response.json();
    }

    async rpc(functionName, params = {}) {
        const url = `${this.url}/rest/v1/rpc/${functionName}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(params)
        });

        if (!response.ok) throw new Error(`Supabase RPC failed: ${response.statusText}`);
        return await response.json();
    }
}

// Initialize client
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database API for Cipher Hunt
const CipherDB = {
    // ========== USER MANAGEMENT ==========

    async getOrCreateUser(userId) {
        try {
            // Try to get existing user
            const users = await supabase.query('users', {
                select: '*',
                eq: { id: userId },
                limit: 1
            });

            if (users && users.length > 0) {
                return users[0];
            }

            // Create new user
            const newUser = await supabase.insert('users', {
                id: userId,
                username: `Detective${Math.floor(Math.random() * 10000)}`,
                cognitive_style: 'New Detective',
                total_games: 0,
                total_wins: 0,
                current_streak: 0,
                best_streak: 0,
                total_hints_used: 0,
                total_score: 0
            });

            return newUser[0];
        } catch (error) {
            console.error('Error getting/creating user:', error);
            return null;
        }
    },

    async updateUser(userId, data) {
        try {
            const updated = await supabase.update('users', userId, data);
            return updated[0];
        } catch (error) {
            console.error('Error updating user:', error);
            return null;
        }
    },

    async calculateCognitiveStyle(totalGames, totalWins, avgClues, bestStreak) {
        if (totalGames < 3) return 'New Detective';

        const winRate = totalWins / totalGames;

        if (winRate >= 0.9 && avgClues <= 3.5 && bestStreak >= 7) return 'Sherlock Holmes';
        if (winRate >= 0.8 && avgClues <= 4) return 'Intuitive Genius';
        if (winRate >= 0.7 && avgClues <= 4.5) return 'Quick Thinker';
        if (winRate >= 0.6 && avgClues <= 5) return 'Methodical Detective';
        if (bestStreak >= 10) return 'Persistent Solver';
        if (bestStreak >= 5) return 'Consistent Detective';
        if (winRate >= 0.5) return 'Steady Solver';

        return 'Detective in Training';
    },

    // ========== GAME SESSIONS ==========

    async createGameSession(userId, mysteryId, category, difficulty) {
        try {
            const session = await supabase.insert('game_sessions', {
                user_id: userId,
                mystery_id: mysteryId,
                category: category.toUpperCase(),
                difficulty: difficulty.toUpperCase(),
                attempts: 0,
                clues_revealed: 3,
                hints_used: 0,
                final_score: 0,
                time_taken: 0,
                is_solved: false,
                guesses: []
            });

            return session[0];
        } catch (error) {
            console.error('Error creating game session:', error);
            return null;
        }
    },

    async updateGameSession(sessionId, data) {
        try {
            const updated = await supabase.update('game_sessions', sessionId, data);
            return updated[0];
        } catch (error) {
            console.error('Error updating game session:', error);
            return null;
        }
    },

    async completeGameSession(sessionId, userId, {isSolved, finalScore, timeTaken, attempts, cluesRevealed, hintsUsed, guesses}) {
        try {
            // Update session
            const session = await supabase.update('game_sessions', sessionId, {
                is_solved: isSolved,
                final_score: finalScore,
                time_taken: timeTaken,
                attempts: attempts,
                clues_revealed: cluesRevealed,
                hints_used: hintsUsed,
                guesses: guesses,
                completed_at: new Date().toISOString()
            });

            // Update user stats
            const user = await this.getOrCreateUser(userId);
            if (!user) return session[0];

            const newTotalGames = user.total_games + 1;
            const newTotalWins = user.total_wins + (isSolved ? 1 : 0);
            const newCurrentStreak = isSolved ? user.current_streak + 1 : 0;
            const newBestStreak = Math.max(user.best_streak, newCurrentStreak);
            const newTotalScore = user.total_score + finalScore;
            const newTotalHints = user.total_hints_used + hintsUsed;

            // Calculate average clues (from all completed games)
            const allSessions = await supabase.query('game_sessions', {
                select: 'clues_revealed,is_solved',
                eq: { user_id: userId }
            });

            const solvedSessions = allSessions.filter(s => s.is_solved);
            const avgClues = solvedSessions.length > 0
                ? solvedSessions.reduce((sum, s) => sum + s.clues_revealed, 0) / solvedSessions.length
                : 5;

            const cognitiveStyle = await this.calculateCognitiveStyle(
                newTotalGames,
                newTotalWins,
                avgClues,
                newBestStreak
            );

            await this.updateUser(userId, {
                total_games: newTotalGames,
                total_wins: newTotalWins,
                current_streak: newCurrentStreak,
                best_streak: newBestStreak,
                total_score: newTotalScore,
                total_hints_used: newTotalHints,
                cognitive_style: cognitiveStyle,
                last_played_at: new Date().toISOString()
            });

            // Check achievements
            if (isSolved) {
                await this.checkAndAwardAchievements(userId, {
                    totalWins: newTotalWins,
                    currentStreak: newCurrentStreak,
                    cluesRevealed,
                    hintsUsed,
                    timeTaken
                });
            }

            return session[0];
        } catch (error) {
            console.error('Error completing game session:', error);
            return null;
        }
    },

    // ========== ACHIEVEMENTS ==========

    async checkAndAwardAchievements(userId, {totalWins, currentStreak, cluesRevealed, hintsUsed, timeTaken}) {
        try {
            const achievements = await supabase.query('achievements', { select: '*' });
            const userAchievements = await supabase.query('user_achievements', {
                select: 'achievement_id',
                eq: { user_id: userId }
            });

            const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));
            const newAchievements = [];

            for (const achievement of achievements) {
                if (earnedIds.has(achievement.id)) continue;

                let earned = false;

                switch (achievement.code) {
                    case 'first_win':
                        earned = totalWins === 1;
                        break;
                    case 'perfect_game':
                        earned = cluesRevealed === 3;
                        break;
                    case 'speed_demon':
                        earned = timeTaken <= 60;
                        break;
                    case 'no_hints':
                        earned = hintsUsed === 0;
                        break;
                    case 'streak_3':
                        earned = currentStreak >= 3;
                        break;
                    case 'streak_7':
                        earned = currentStreak >= 7;
                        break;
                    case 'streak_30':
                        earned = currentStreak >= 30;
                        break;
                    case 'century_club':
                        earned = totalWins >= 100;
                        break;
                }

                if (earned) {
                    await supabase.insert('user_achievements', {
                        user_id: userId,
                        achievement_id: achievement.id
                    });
                    newAchievements.push(achievement);
                }
            }

            return newAchievements;
        } catch (error) {
            console.error('Error checking achievements:', error);
            return [];
        }
    },

    async getUserAchievements(userId) {
        try {
            const userAchievements = await supabase.query('user_achievements', {
                select: '*',
                eq: { user_id: userId },
                order: 'earned_at.desc'
            });

            const achievementIds = userAchievements.map(ua => ua.achievement_id);
            if (achievementIds.length === 0) return [];

            // Get achievement details
            const achievements = await supabase.query('achievements', { select: '*' });
            return achievements.filter(a => achievementIds.includes(a.id));
        } catch (error) {
            console.error('Error getting user achievements:', error);
            return [];
        }
    },

    // ========== LIVE ACTIVITY ==========

    async addActivity(userId, username, activityType, category, details) {
        try {
            await supabase.insert('live_activities', {
                user_id: userId,
                username: username,
                activity_type: activityType,
                category: category,
                details: details
            });
        } catch (error) {
            console.error('Error adding activity:', error);
        }
    },

    async getRecentActivities(limit = 20) {
        try {
            const activities = await supabase.query('live_activities', {
                select: '*',
                order: 'created_at.desc',
                limit: limit
            });
            return activities;
        } catch (error) {
            console.error('Error getting activities:', error);
            return [];
        }
    },

    // ========== LEADERBOARDS ==========

    async getTopPlayers(limit = 10) {
        try {
            const users = await supabase.query('users', {
                select: '*',
                order: 'total_score.desc',
                limit: limit
            });
            return users;
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    },

    async getUserRank(userId) {
        try {
            const user = await this.getOrCreateUser(userId);
            if (!user) return null;

            const allUsers = await supabase.query('users', {
                select: 'total_score',
                order: 'total_score.desc'
            });

            const rank = allUsers.findIndex(u => u.total_score <= user.total_score) + 1;
            return {
                rank: rank,
                total: allUsers.length,
                percentile: Math.round((1 - rank / allUsers.length) * 100)
            };
        } catch (error) {
            console.error('Error getting user rank:', error);
            return null;
        }
    },

    // ========== STATISTICS ==========

    async getMysteryStats(mysteryId) {
        try {
            const sessions = await supabase.query('game_sessions', {
                select: '*',
                eq: { mystery_id: mysteryId }
            });

            const totalAttempts = sessions.length;
            const solves = sessions.filter(s => s.is_solved);
            const solveRate = totalAttempts > 0 ? Math.round((solves.length / totalAttempts) * 100) : 0;

            const clueUsage = {};
            solves.forEach(s => {
                clueUsage[s.clues_revealed] = (clueUsage[s.clues_revealed] || 0) + 1;
            });

            const mostCommon = Object.entries(clueUsage).sort((a, b) => b[1] - a[1])[0];

            return {
                totalAttempts,
                totalSolves: solves.length,
                solveRate,
                mostCommonClues: mostCommon ? parseInt(mostCommon[0]) : 5,
                avgTime: solves.length > 0
                    ? Math.round(solves.reduce((sum, s) => sum + s.time_taken, 0) / solves.length)
                    : 0
            };
        } catch (error) {
            console.error('Error getting mystery stats:', error);
            return null;
        }
    }
};

// Export for use in game.js
window.CipherDB = CipherDB;
console.log('✓ Supabase client initialized');
