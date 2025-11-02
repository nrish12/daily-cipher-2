require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const MysteryGenerator = require('./utils/mysteryGenerator');
const StatsTracker = require('./utils/statsTracker');
const AchievementSystem = require('./utils/achievementSystem');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const MYSTERY_FILE = path.join(__dirname, 'data', 'daily-mystery.json');
let currentMystery = null;
let mysteryGenerator = null;
let statsTracker = null;
let achievementSystem = null;

// Initialize systems
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  mysteryGenerator = new MysteryGenerator(process.env.OPENAI_API_KEY);
  console.log('✓ OpenAI API initialized');
} else {
  console.log('⚠ OpenAI API key not found - using fallback mysteries');
}

statsTracker = new StatsTracker();
achievementSystem = new AchievementSystem();

// Initialize all systems
async function initializeSystems() {
  await statsTracker.initialize();
  await achievementSystem.initialize();
  await initializeMystery();
}

// Initialize mystery data file
async function initializeMystery() {
  try {
    const data = await fs.readFile(MYSTERY_FILE, 'utf8');
    currentMystery = JSON.parse(data);
    
    const today = new Date().toISOString().split('T')[0];
    
    if (currentMystery.date !== today) {
      console.log('Mystery outdated, generating new one...');
      await generateNewMystery();
    } else {
      console.log('✓ Current mystery loaded');
    }
  } catch (error) {
    console.log('No mystery file found, generating new one...');
    await generateNewMystery();
  }
}

// Generate and save new mystery
async function generateNewMystery() {
  try {
    console.log('🔄 Generating new mystery...');
    
    if (mysteryGenerator) {
      currentMystery = await mysteryGenerator.generateDailyMystery();
      console.log('✓ New mystery generated via OpenAI');
    } else {
      const generator = new MysteryGenerator();
      currentMystery = generator.getFallbackMystery();
      console.log('✓ New fallback mystery loaded');
    }
    
    // Debug: Check if puzzleStructure exists
    console.log('Mystery data:', {
      answer: currentMystery.answer,
      category: currentMystery.category,
      clueCount: currentMystery.clues.length,
      hasPuzzleStructure: !!currentMystery.puzzleStructure,
      puzzleStructureName: currentMystery.puzzleStructure?.name
    });
    
    await fs.writeFile(MYSTERY_FILE, JSON.stringify(currentMystery, null, 2));
    console.log(`Mystery: ${currentMystery.answer} (${currentMystery.category})`);
    console.log(`Structure: ${currentMystery.puzzleStructure?.name || 'MISSING'} - ${currentMystery.clues.length} clues`);
    
    // Reset stats for new day
    await statsTracker.resetDailyStats();
  } catch (error) {
    console.error('❌ Error generating mystery:', error);
    const generator = new MysteryGenerator();
    currentMystery = generator.getFallbackMystery();
    console.log('✓ Using fallback after error');
  }
}

// API Routes

// Get game state (without revealing answer)
// Add this to your existing server.js

// Update the /api/mystery endpoint to handle category parameter
app.get('/api/mystery', async (req, res) => {
  console.log('📡 GET /api/mystery');
  
  const requestedCategory = req.query.category; // person, place, or thing
  console.log('📋 Requested category:', requestedCategory);
  
  // If category is requested and doesn't match current mystery, generate new one
  if (requestedCategory && currentMystery && currentMystery.category !== requestedCategory) {
    console.log(`🔄 Category mismatch. Current: ${currentMystery.category}, Requested: ${requestedCategory}`);
    console.log('🎲 Generating new mystery for requested category...');
    
    try {
      if (mysteryGenerator) {
        // Try AI generation with category filter
        let attempts = 0;
        let mystery = null;
        
        while (attempts < 3 && (!mystery || mystery.category !== requestedCategory)) {
          mystery = await mysteryGenerator.generateDailyMystery();
          attempts++;
          
          if (mystery.category === requestedCategory) {
            currentMystery = mystery;
            await fs.writeFile(MYSTERY_FILE, JSON.stringify(currentMystery, null, 2));
            console.log(`✓ Generated ${requestedCategory} mystery:`, mystery.answer);
            break;
          }
        }
        
        // If AI didn't match, use fallback
        if (!mystery || mystery.category !== requestedCategory) {
          const generator = new MysteryGenerator();
          currentMystery = generator.getFallbackMysteryByCategory(requestedCategory);
          await fs.writeFile(MYSTERY_FILE, JSON.stringify(currentMystery, null, 2));
          console.log(`✓ Using fallback ${requestedCategory} mystery:`, currentMystery.answer);
        }
      } else {
        // No AI, use fallback
        const generator = new MysteryGenerator();
        currentMystery = generator.getFallbackMysteryByCategory(requestedCategory);
        await fs.writeFile(MYSTERY_FILE, JSON.stringify(currentMystery, null, 2));
        console.log(`✓ Using fallback ${requestedCategory} mystery:`, currentMystery.answer);
      }
      
      await statsTracker.resetDailyStats();
    } catch (error) {
      console.error('❌ Error generating category-specific mystery:', error);
    }
  }
  
  if (!currentMystery) {
    console.log('❌ No mystery loaded!');
    return res.status(500).json({ error: 'Mystery not initialized' });
  }

  await statsTracker.recordAttempt();

  const response = {
    id: currentMystery.id,
    category: currentMystery.category,
    difficulty: currentMystery.difficulty,
    totalClues: currentMystery.clues.length,
    puzzleStructure: currentMystery.puzzleStructure || {
      name: 'Cipher Hunt',
      clueCount: currentMystery.clues.length,
      interval: 0,
      difficulty: currentMystery.difficulty
    },
    date: currentMystery.date
  };
  
  console.log('✓ Sending mystery data:', response);
  res.json(response);
});

// Get a specific clue
app.get('/api/clue/:index', (req, res) => {
  const index = parseInt(req.params.index);
  
  if (!currentMystery) {
    return res.status(500).json({ error: 'Mystery not initialized' });
  }

  if (index < 0 || index >= currentMystery.clues.length) {
    return res.status(400).json({ error: 'Invalid clue index' });
  }

  res.json({
    clue: currentMystery.clues[index],
    index: index
  });
});

// Submit a guess
app.post('/api/guess', async (req, res) => {
  const { guess, cluesRevealed, userId, timeTaken, clueIndices } = req.body;

  if (!currentMystery) {
    return res.status(500).json({ error: 'Mystery not initialized' });
  }

  if (!guess || typeof guess !== 'string') {
    return res.status(400).json({ error: 'Invalid guess' });
  }

  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedAnswer = currentMystery.answer.toLowerCase().trim();

  const isCorrect = normalizedGuess === normalizedAnswer || 
                    normalizedAnswer.includes(normalizedGuess) ||
                    normalizedGuess.includes(normalizedAnswer);

  if (isCorrect) {
    const maxScore = 1000;
    const cluesPenalty = (cluesRevealed - 1) * Math.floor(1000 / currentMystery.clues.length);
    const score = Math.max(50, maxScore - cluesPenalty);

    // Record solve in stats
    await statsTracker.recordSolve({
      cluesUsed: cluesRevealed,
      timeTaken: timeTaken || 0,
      clueIndices: clueIndices || [],
      userId: userId || 'anonymous'
    });

    // Update user profile
    const profile = await achievementSystem.updateProfile(userId || 'anonymous', {
      solved: true,
      cluesUsed: cluesRevealed,
      timeTaken: timeTaken || 0,
      score: score,
      category: currentMystery.category
    });

    res.json({
      correct: true,
      answer: currentMystery.answer,
      funFact: currentMystery.funFact,
      score: score,
      cluesUsed: cluesRevealed,
      allClues: currentMystery.clues,
      hiddenClues: currentMystery.hiddenClues || [],
      profile: {
        hintsRemaining: profile.totalHints,
        newBadges: profile.badges.slice(-1), // Last earned badge
        cognitiveStyle: achievementSystem.getCognitiveStyle(profile),
        streak: profile.solveStreak
      }
    });
  } else {
    res.json({
      correct: false,
      message: 'Not quite! Try again or wait for more clues.'
    });
  }
});

// Get live stats
app.get('/api/stats', (req, res) => {
  const stats = statsTracker.getStats();
  res.json(stats);
});

// Get user profile
app.get('/api/profile/:userId', async (req, res) => {
  const profile = await achievementSystem.getProfile(req.params.userId);
  const cognitiveStyle = achievementSystem.getCognitiveStyle(profile);
  
  res.json({
    ...profile,
    cognitiveStyle,
    allAchievements: achievementSystem.getAllAchievements()
  });
});

// Use a hint
app.post('/api/hint/use', async (req, res) => {
  const { userId, hintType } = req.body;
  
  const result = await achievementSystem.useHint(userId);
  
  if (!result.success) {
    return res.json({ success: false, message: 'No hints remaining' });
  }

  let hintData = {};
  
  if (hintType === 'skip') {
    hintData = { type: 'skip', message: 'Clue skipped' };
  } else if (hintType === 'category') {
    hintData = { 
      type: 'category', 
      hint: `This is a ${currentMystery.category}`,
      message: 'Category revealed'
    };
  } else if (hintType === 'percentage') {
    const stats = statsTracker.getStats();
    hintData = {
      type: 'percentage',
      hint: `${stats.solveRate}% of players have solved today's mystery`,
      message: 'Solve rate revealed'
    };
  }

  res.json({
    success: true,
    remaining: result.remaining,
    ...hintData
  });
});

// Force generate new mystery (dev endpoint)
app.post('/api/admin/regenerate', async (req, res) => {
  await generateNewMystery();
  res.json({ success: true, mystery: currentMystery.answer });
});

// Get all clues (after solving or giving up)
app.get('/api/reveal', (req, res) => {
  if (!currentMystery) {
    return res.status(500).json({ error: 'Mystery not initialized' });
  }

  res.json({
    answer: currentMystery.answer,
    category: currentMystery.category,
    allClues: currentMystery.clues,
    funFact: currentMystery.funFact,
    hiddenClues: currentMystery.hiddenClues || []
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    openaiEnabled: !!mysteryGenerator,
    mysteryLoaded: !!currentMystery,
    statsTracking: !!statsTracker,
    achievementsEnabled: !!achievementSystem
  });
});

// Start server
async function startServer() {
  await initializeSystems();
  
  app.listen(PORT, () => {
    console.log(`\n🎮 Daily Cipher Game Server v2.0`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🤖 OpenAI: ${mysteryGenerator ? 'Enabled' : 'Disabled (using fallbacks)'}`);
    console.log(`📊 Stats Tracking: Enabled`);
    console.log(`🏆 Achievements: Enabled`);
    console.log(`\n✨ Game is ready to play!\n`);
  });

  // Check for new mystery daily
  setInterval(async () => {
    const today = new Date().toISOString().split('T')[0];
    if (currentMystery && currentMystery.date !== today) {
      console.log('\n🔄 New day detected - generating fresh mystery...');
      await generateNewMystery();
    }
  }, 60000);
}

startServer().catch(console.error);