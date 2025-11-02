// Cipher Hunt - Active Gameplay Version with Category Selection
let gameState = {
    mysteryId: null,
    totalClues: 8,
    visibleClues: 3,
    maxAttempts: 6,
    attempts: 0,
    cluesRevealed: [],
    allClues: [],
    gameActive: false,
    gameStarted: false,
    solved: false,
    score: 1000,
    startTime: null,
    currentAnswer: null,
    userId: null,
    mysteryData: null,
    guessHistory: [],
    selectedCategory: null
};

const API_BASE = '';

const elements = {
    startScreen: document.getElementById('startScreen'),
    categorySelection: document.getElementById('categorySelection'),
    categoryPerson: document.getElementById('categoryPerson'),
    categoryPlace: document.getElementById('categoryPlace'),
    categoryThing: document.getElementById('categoryThing'),
    startButton: document.getElementById('startButton'),
    gameLayout: document.getElementById('gameLayout'),
    category: document.getElementById('category'),
    difficulty: document.getElementById('difficulty'),
    score: document.getElementById('score'),
    attemptsLeft: document.getElementById('attemptsLeft'),
    cluesList: document.getElementById('cluesList'),
    guessInput: document.getElementById('guessInput'),
    guessButton: document.getElementById('guessButton'),
    revealButton: document.getElementById('revealButton'),
    feedback: document.getElementById('feedback'),
    gameArea: document.getElementById('gameArea'),
    resultArea: document.getElementById('resultArea'),
    resultTitle: document.getElementById('resultTitle'),
    finalScore: document.getElementById('finalScore'),
    answerText: document.getElementById('answerText'),
    funFactText: document.getElementById('funFactText'),
    allCluesList: document.getElementById('allCluesList'),
    shareButton: document.getElementById('shareButton'),
    nextTimer: document.getElementById('nextTimer'),
    apiStatus: document.getElementById('apiStatus'),
    puzzleType: document.getElementById('puzzleType'),
    userHints: document.getElementById('userHints'),
    userStreak: document.getElementById('userStreak'),
    cognitiveStyle: document.getElementById('cognitiveStyle'),
    feedContent: document.getElementById('feedContent'),
    hintReveal: document.getElementById('hintReveal'),
    hintCategory: document.getElementById('hintCategory'),
    hintStats: document.getElementById('hintStats'),
    newBadges: document.getElementById('newBadges'),
    badgeShowcase: document.getElementById('badgeShowcase'),
    totalSolvers: document.getElementById('totalSolvers'),
    yourRank: document.getElementById('yourRank'),
    commonPath: document.getElementById('commonPath'),
    pathComparison: document.getElementById('pathComparison'),
    viewProfile: document.getElementById('viewProfile'),
    profileModal: document.getElementById('profileModal'),
    closeProfile: document.getElementById('closeProfile'),
    styleDisplay: document.getElementById('styleDisplay'),
    profileGames: document.getElementById('profileGames'),
    profileSolves: document.getElementById('profileSolves'),
    profileStreak: document.getElementById('profileStreak'),
    profileAvgClues: document.getElementById('profileAvgClues'),
    achievementsGrid: document.getElementById('achievementsGrid'),
    attemptIndicators: document.getElementById('attemptIndicators'),
    guessHistoryList: document.getElementById('guessHistoryList'),
    devToggle: document.getElementById('devToggle'),
    devPanel: document.getElementById('devPanel'),
    resetGame: document.getElementById('resetGame'),
    newPuzzle: document.getElementById('newPuzzle'),
    revealAllClues: document.getElementById('revealAllClues'),
    addHints: document.getElementById('addHints'),
    devAnswer: document.getElementById('devAnswer'),
    devAttempts: document.getElementById('devAttempts'),
    shareGrid: document.getElementById('shareGrid')
};

function getUserId() {
    let userId = localStorage.getItem('dailyCipherUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('dailyCipherUserId', userId);
    }
    return userId;
}

gameState.userId = getUserId();

async function initGame() {
    try {
        console.log('🎮 Initializing Cipher Hunt...');
        
        const health = await fetch(`${API_BASE}/api/health`).then(r => r.json());
        elements.apiStatus.textContent = health.openaiEnabled 
            ? '🤖 AI-Generated Mysteries' 
            : '🎲 Fallback Mysteries';

        await loadUserProfile();
        startLiveFeed();
        
        console.log('✓ Game ready - waiting for category selection');
        
    } catch (error) {
        console.error('❌ Error initializing game:', error);
        showFeedback('Error loading game. Please refresh.', 'error');
    }
}

function selectCategory(category) {
    gameState.selectedCategory = category;
    
    // Update UI to show selection
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    if (category === 'person') {
        elements.categoryPerson.classList.add('selected');
    } else if (category === 'place') {
        elements.categoryPlace.classList.add('selected');
    } else if (category === 'thing') {
        elements.categoryThing.classList.add('selected');
    }
    
    elements.startButton.disabled = false;
    elements.startButton.style.opacity = '1';
    
    console.log('Selected category:', category);
}

async function loadUserProfile() {
    try {
        const profile = await fetch(`${API_BASE}/api/profile/${gameState.userId}`).then(r => r.json());
        
        elements.userHints.textContent = profile.totalHints || 0;
        elements.userStreak.textContent = profile.solveStreak || 0;
        elements.cognitiveStyle.textContent = profile.cognitiveStyle || 'New Detective';
        
        updateHintButtons(profile.totalHints || 0);
        console.log('✓ Profile loaded');
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
    }
}

function updateHintButtons(hintsAvailable) {
    elements.hintReveal.disabled = hintsAvailable < 1;
    elements.hintCategory.disabled = hintsAvailable < 2;
    elements.hintStats.disabled = hintsAvailable < 1;
}

function startLiveFeed() {
    updateLiveFeed();
    setInterval(updateLiveFeed, 5000);
}

async function updateLiveFeed() {
    try {
        const stats = await fetch(`${API_BASE}/api/stats`).then(r => r.json());
        
        let feedHTML = '';
        feedHTML += `<p class="feed-item">🔴 ${stats.activePlayers} players online now</p>`;
        
        if (stats.recentSolves && stats.recentSolves.length > 0) {
            stats.recentSolves.forEach(solve => {
                const timeAgo = getTimeAgo(solve.timestamp);
                feedHTML += `<p class="feed-item">⚡ Someone solved in ${solve.cluesUsed} clues ${timeAgo}</p>`;
            });
        }
        
        if (stats.fastestSolve) {
            const seconds = Math.floor(stats.fastestSolve.timeTaken / 1000);
            feedHTML += `<p class="feed-item">🏆 Fastest: ${seconds}s</p>`;
        }
        
        elements.feedContent.innerHTML = feedHTML;
        
    } catch (error) {
        console.error('Error updating feed:', error);
    }
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}

async function startGame() {
    if (!gameState.selectedCategory) {
        showFeedback('Please select a category first!', 'error');
        setTimeout(clearFeedback, 2000);
        return;
    }
    
    console.log('🎬 Starting Cipher Hunt with category:', gameState.selectedCategory);
    
    showFeedback('Loading mystery...', 'info');
    
    try {
        // Fetch mystery with selected category
        const mystery = await fetch(`${API_BASE}/api/mystery?category=${gameState.selectedCategory}`).then(r => r.json());
        console.log('✓ Mystery loaded:', mystery);
        
        gameState.mysteryId = mystery.id;
        gameState.totalClues = mystery.totalClues;
        gameState.mysteryData = mystery;
        
        // Load all clues
        gameState.allClues = [];
        for (let i = 0; i < mystery.totalClues; i++) {
            const clueData = await fetch(`${API_BASE}/api/clue/${i}`).then(r => r.json());
            gameState.allClues.push(clueData.clue);
        }
        
        elements.category.textContent = mystery.category.toUpperCase();
        elements.difficulty.textContent = mystery.difficulty.toUpperCase();
        elements.puzzleType.textContent = `🔍 ${mystery.category.toUpperCase()} Hunt`;
        
        elements.startScreen.classList.add('hidden');
        elements.gameLayout.classList.remove('hidden');
        
        gameState.gameStarted = true;
        gameState.gameActive = true;
        gameState.startTime = Date.now();
        
        revealInitialClues();
        
        elements.guessInput.disabled = false;
        elements.guessButton.disabled = false;
        elements.guessInput.focus();
        
        updateAttemptIndicators();
        updateScore();
        
        clearFeedback();
        
    } catch (error) {
        console.error('Error starting game:', error);
        showFeedback('Error loading mystery. Please try again.', 'error');
    }
}

function revealInitialClues() {
    console.log('📝 Revealing initial 3 clues...');
    
    for (let i = 0; i < gameState.visibleClues; i++) {
        gameState.cluesRevealed.push(gameState.allClues[i]);
    }
    
    updateClueDisplay();
}

function revealNextClue() {
    if (gameState.cluesRevealed.length < gameState.totalClues) {
        const nextIndex = gameState.cluesRevealed.length;
        gameState.cluesRevealed.push(gameState.allClues[nextIndex]);
        console.log(`📝 Revealed clue ${nextIndex + 1}`);
        updateClueDisplay();
    }
}

function updateClueDisplay() {
    elements.cluesList.innerHTML = gameState.cluesRevealed.map((clue, index) => `
        <div class="clue-item">
            <span class="clue-number">${index + 1}</span>
            <span class="clue-text">${clue}</span>
        </div>
    `).join('');
    
    const hiddenCount = gameState.totalClues - gameState.cluesRevealed.length;
    if (hiddenCount > 0 && gameState.gameActive) {
        elements.cluesList.innerHTML += `
            <div class="hidden-clues-indicator">
                🔒 ${hiddenCount} more clue${hiddenCount !== 1 ? 's' : ''} hidden
            </div>
        `;
    }
}

function updateAttemptIndicators() {
    elements.attemptsLeft.textContent = gameState.maxAttempts - gameState.attempts;
    
    const indicators = [];
    for (let i = 0; i < gameState.maxAttempts; i++) {
        if (i < gameState.attempts) {
            if (gameState.guessHistory[i].correct) {
                indicators.push('<div class="attempt-box correct">✓</div>');
            } else {
                indicators.push('<div class="attempt-box wrong">✗</div>');
            }
        } else {
            indicators.push('<div class="attempt-box empty"></div>');
        }
    }
    
    elements.attemptIndicators.innerHTML = indicators.join('');
}

function updateScore() {
    const baseScore = 1000;
    const penalty = gameState.attempts * 167;
    gameState.score = Math.max(50, baseScore - penalty);
    elements.score.textContent = gameState.score;
}

async function submitGuess() {
    const guess = elements.guessInput.value.trim();
    
    if (!guess) {
        showFeedback('Please enter a guess!', 'error');
        setTimeout(clearFeedback, 1500);
        return;
    }
    
    if (!gameState.gameActive) return;
    
    console.log(`🎯 Attempt ${gameState.attempts + 1}: "${guess}"`);
    
    gameState.attempts++;
    
    elements.guessButton.disabled = true;
    elements.guessInput.disabled = true;
    
    const timeTaken = Date.now() - gameState.startTime;
    
    try {
        const response = await fetch(`${API_BASE}/api/guess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guess: guess,
                cluesRevealed: gameState.cluesRevealed.length,
                userId: gameState.userId,
                timeTaken: timeTaken,
                clueIndices: Array.from({length: gameState.cluesRevealed.length}, (_, i) => i)
            })
        });
        
        const result = await response.json();
        
        gameState.guessHistory.push({
            guess: guess,
            correct: result.correct
        });
        
        updateAttemptIndicators();
        updateGuessHistory();
        
        if (result.correct) {
            console.log('✅ CORRECT!');
            handleCorrectGuess(result);
        } else {
            console.log(`❌ Wrong (${gameState.maxAttempts - gameState.attempts} attempts left)`);
            handleIncorrectGuess();
        }
        
    } catch (error) {
        console.error('Error submitting guess:', error);
        showFeedback('Error submitting guess. Try again.', 'error');
        gameState.attempts--;
        elements.guessButton.disabled = false;
        elements.guessInput.disabled = false;
    }
}

function updateGuessHistory() {
    const historyDiv = document.getElementById('guessHistory');
    if (gameState.guessHistory.length > 0) {
        historyDiv.style.display = 'block';
    }
    
    elements.guessHistoryList.innerHTML = gameState.guessHistory.map((entry, i) => `
        <div class="guess-entry ${entry.correct ? 'correct' : 'wrong'}">
            <span class="guess-number">#${i + 1}</span>
            <span class="guess-text">${entry.guess}</span>
            <span class="guess-result">${entry.correct ? '✓' : '✗'}</span>
        </div>
    `).join('');
}

function handleCorrectGuess(result) {
    gameState.gameActive = false;
    gameState.solved = true;
    
    updateScore();
    
    showFeedback(`🎉 CORRECT! Solved in ${gameState.attempts} attempt${gameState.attempts !== 1 ? 's' : ''}!`, 'success');
    
    setTimeout(() => {
        showResults({
            title: '🎉 Mystery Solved!',
            answer: result.answer,
            funFact: result.funFact,
            score: gameState.score,
            cluesUsed: gameState.cluesRevealed.length,
            attempts: gameState.attempts,
            allClues: result.allClues,
            hiddenClues: result.hiddenClues,
            profile: result.profile
        });
    }, 1500);
}

function handleIncorrectGuess() {
    updateScore();
    
    if (gameState.attempts >= gameState.maxAttempts) {
        gameState.gameActive = false;
        showFeedback('❌ No attempts left! Revealing answer...', 'error');
        
        setTimeout(() => {
            revealAnswer();
        }, 2000);
    } else {
        revealNextClue();
        
        showFeedback(`❌ Not quite! Revealed another clue. ${gameState.maxAttempts - gameState.attempts} attempts left.`, 'error');
        
        setTimeout(() => {
            clearFeedback();
            elements.guessButton.disabled = false;
            elements.guessInput.disabled = false;
            elements.guessInput.value = '';
            elements.guessInput.focus();
        }, 2000);
    }
}

async function useHint(hintType) {
    if (!gameState.gameActive) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/hint/use`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: gameState.userId,
                hintType: hintType
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            elements.userHints.textContent = result.remaining;
            updateHintButtons(result.remaining);
            
            if (hintType === 'reveal') {
                revealNextClue();
                showFeedback('💡 Revealed next clue!', 'success');
            } else if (hintType === 'category') {
                showFeedback(`💡 Confirmed: This is a ${result.hint.split(' ').pop()}`, 'success');
            } else if (hintType === 'percentage') {
                showFeedback(`💡 ${result.hint}`, 'success');
            }
            
            setTimeout(clearFeedback, 3000);
        } else {
            showFeedback('❌ No hints remaining!', 'error');
            setTimeout(clearFeedback, 2000);
        }
        
    } catch (error) {
        console.error('Error using hint:', error);
    }
}

async function revealAnswer() {
    gameState.gameActive = false;
    
    try {
        const response = await fetch(`${API_BASE}/api/reveal`);
        const result = await response.json();
        
        showResults({
            title: '🤔 Answer Revealed',
            answer: result.answer,
            funFact: result.funFact,
            score: 0,
            cluesUsed: gameState.cluesRevealed.length,
            attempts: gameState.attempts,
            allClues: result.allClues,
            hiddenClues: result.hiddenClues,
            profile: null
        });
        
    } catch (error) {
        console.error('Error revealing answer:', error);
    }
}

async function showResults({ title, answer, funFact, score, cluesUsed, attempts, allClues, hiddenClues, profile }) {
    console.log('📊 Showing results');
    
    elements.gameLayout.classList.add('hidden');
    elements.resultArea.classList.remove('hidden');
    
    elements.resultTitle.textContent = title;
    elements.answerText.textContent = answer;
    elements.funFactText.textContent = funFact;
    elements.finalScore.textContent = score;
    
    generateShareGrid();
    
    if (profile && profile.newBadges && profile.newBadges.length > 0) {
        elements.newBadges.style.display = 'block';
        elements.badgeShowcase.innerHTML = profile.newBadges.map(badge => `
            <div style="text-align: center;">
                <div style="font-size: 3.5em; margin-bottom: 10px;">${badge.icon}</div>
                <div style="font-weight: 800; color: var(--warning); font-size: 1.1em;">${badge.name}</div>
                <div style="font-size: 0.9em; color: var(--text-muted); margin-top: 5px;">${badge.description}</div>
            </div>
        `).join('');
    }
    
    if (profile) {
        elements.userHints.textContent = profile.hintsRemaining;
        elements.userStreak.textContent = profile.streak;
        elements.cognitiveStyle.textContent = profile.cognitiveStyle;
    }
    
    await loadSocialStats(cluesUsed);
    
    elements.allCluesList.innerHTML = allClues.map((clue, i) => `
        <li style="${i < cluesUsed ? '' : 'opacity: 0.6;'}">
            ${clue} ${i >= cluesUsed ? '🔒' : ''}
        </li>
    `).join('');
    
    updateNextMysteryTimer();
}

function generateShareGrid() {
    const grid = gameState.guessHistory.map(entry => 
        entry.correct ? '🟩' : '⬛'
    ).join('');
    
    const categoryEmoji = {
        'person': '👤',
        'place': '📍',
        'thing': '💎'
    };
    
    const shareText = `Cipher Hunt ${categoryEmoji[gameState.selectedCategory] || '🔍'}\n${grid}\n${gameState.attempts} attempt${gameState.attempts !== 1 ? 's' : ''} • ${gameState.cluesRevealed.length} clues • ${gameState.score} pts`;
    
    elements.shareGrid.textContent = shareText;
}

async function loadSocialStats(userCluesUsed) {
    try {
        const stats = await fetch(`${API_BASE}/api/stats`).then(r => r.json());
        
        elements.totalSolvers.textContent = stats.totalSolved;
        
        const solvesByClue = stats.solvesByClueCount;
        let betterThan = 0;
        let total = 0;
        Object.entries(solvesByClue).forEach(([clues, count]) => {
            total += count;
            if (parseInt(clues) > userCluesUsed) {
                betterThan += count;
            }
        });
        
        const percentile = total > 0 ? Math.floor((betterThan / total) * 100) : 0;
        elements.yourRank.textContent = `Top ${100 - percentile}%`;
        
        if (stats.popularPaths && stats.popularPaths.length > 0) {
            elements.commonPath.textContent = `${stats.popularPaths[0].clues.length} clues`;
        }
        
    } catch (error) {
        console.error('Error loading social stats:', error);
    }
}

function updateNextMysteryTimer() {
    function update() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const diff = tomorrow - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        elements.nextTimer.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    update();
    setInterval(update, 1000);
}

function shareResults() {
    const shareText = `Cipher Hunt 🔍\n\n${elements.shareGrid.textContent}\n\nAnswer: ${elements.answerText.textContent}\n\nPlay at: ${window.location.href}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            const originalText = elements.shareButton.textContent;
            elements.shareButton.textContent = '✓ COPIED!';
            setTimeout(() => {
                elements.shareButton.textContent = originalText;
            }, 2000);
        });
    }
}

async function showProfile() {
    try {
        const profile = await fetch(`${API_BASE}/api/profile/${gameState.userId}`).then(r => r.json());
        
        elements.styleDisplay.textContent = profile.cognitiveStyle;
        elements.profileGames.textContent = profile.totalGames;
        elements.profileSolves.textContent = profile.totalSolves;
        elements.profileStreak.textContent = profile.solveStreak;
        elements.profileAvgClues.textContent = profile.averageCluesUsed;
        
        elements.achievementsGrid.innerHTML = profile.allAchievements.map(achievement => {
            const unlocked = profile.achievements.includes(achievement.id);
            return `
                <div style="background: ${unlocked ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 179, 8, 0.15))' : 'var(--bg-elevated)'}; padding: 18px; border-radius: 12px; text-align: center; border: 2px solid ${unlocked ? 'var(--warning)' : 'var(--border)'}; ${unlocked ? '' : 'opacity: 0.5; filter: grayscale(100%);'} cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2.8em; margin-bottom: 10px;">${achievement.icon}</div>
                    <div style="font-size: 0.9em; font-weight: 700; color: var(--text); margin-bottom: 5px;">${achievement.name}</div>
                    <div style="font-size: 0.8em; color: var(--text-muted);">${achievement.description}</div>
                </div>
            `;
        }).join('');
        
        elements.profileModal.style.display = 'flex';
        elements.profileModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function showFeedback(message, type) {
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback ${type}`;
}

function clearFeedback() {
    elements.feedback.textContent = '';
    elements.feedback.className = 'feedback';
}

// Dev Tools
function toggleDevPanel() {
    elements.devPanel.classList.toggle('hidden');
}

async function resetGame() {
    if (!confirm('Reset and start over?')) return;
    location.reload();
}

async function generateNewPuzzle() {
    if (!confirm('Generate NEW puzzle?')) return;
    
    try {
        await fetch(`${API_BASE}/api/admin/regenerate`, { method: 'POST' });
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        console.error('Error:', error);
    }
}

function revealAllCluesNow() {
    while (gameState.cluesRevealed.length < gameState.totalClues) {
        revealNextClue();
    }
}

async function addDevHints() {
    elements.userHints.textContent = parseInt(elements.userHints.textContent) + 5;
    showFeedback('Added 5 hints!', 'success');
    setTimeout(clearFeedback, 2000);
}

async function fetchAnswerForDev() {
    try {
        const response = await fetch(`${API_BASE}/api/reveal`);
        const result = await response.json();
        elements.devAnswer.textContent = result.answer;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Event Listeners
elements.categoryPerson.addEventListener('click', () => selectCategory('person'));
elements.categoryPlace.addEventListener('click', () => selectCategory('place'));
elements.categoryThing.addEventListener('click', () => selectCategory('thing'));

elements.startButton.addEventListener('click', startGame);
elements.guessButton.addEventListener('click', submitGuess);
elements.guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitGuess();
});
elements.revealButton.addEventListener('click', () => {
    if (confirm('Give up and reveal the answer?')) revealAnswer();
});
elements.shareButton.addEventListener('click', shareResults);
elements.viewProfile.addEventListener('click', showProfile);
elements.closeProfile.addEventListener('click', () => {
    elements.profileModal.style.display = 'none';
    elements.profileModal.classList.add('hidden');
});

elements.hintReveal.addEventListener('click', () => useHint('reveal'));
elements.hintCategory.addEventListener('click', () => useHint('category'));
elements.hintStats.addEventListener('click', () => useHint('percentage'));

elements.devToggle.addEventListener('click', toggleDevPanel);
elements.resetGame.addEventListener('click', resetGame);
elements.newPuzzle.addEventListener('click', generateNewPuzzle);
elements.revealAllClues.addEventListener('click', revealAllCluesNow);
elements.addHints.addEventListener('click', addDevHints);

window.addEventListener('click', (e) => {
    if (e.target === elements.profileModal) {
        elements.profileModal.style.display = 'none';
        elements.profileModal.classList.add('hidden');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Cipher Hunt loading...');
    initGame();
});