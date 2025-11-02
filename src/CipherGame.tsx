import { useEffect, useRef, useState } from 'react';
import './game-styles.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface GameState {
  mysteryId: string | null;
  totalClues: number;
  visibleClues: number;
  maxAttempts: number;
  attempts: number;
  cluesRevealed: string[];
  allClues: string[];
  gameActive: boolean;
  gameStarted: boolean;
  solved: boolean;
  score: number;
  startTime: number | null;
  currentAnswer: string | null;
  userId: string;
  mysteryData: any;
  guessHistory: string[];
  selectedCategory: string | null;
  hintsAvailable: number;
}

export default function CipherGame() {
  const [gameState, setGameState] = useState<GameState>({
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
    userId: getUserId(),
    mysteryData: null,
    guessHistory: [],
    selectedCategory: null,
    hintsAvailable: 3,
  });

  const [showStart, setShowStart] = useState(true);
  const [showGame, setShowGame] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [showDevTools, setShowDevTools] = useState(false);
  const [generatingPuzzles, setGeneratingPuzzles] = useState(false);
  const [readyCategories, setReadyCategories] = useState<string[]>([]);

  function getUserId() {
    let userId = localStorage.getItem('dailyCipherUserId');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem('dailyCipherUserId', userId);
    }
    return userId;
  }

  useEffect(() => {
    console.log('🎮 Cipher Hunt initialized');
    console.log('Config:', { SUPABASE_URL, hasKey: !!SUPABASE_ANON_KEY });
  }, []);

  const selectCategory = (category: string) => {
    setGameState(prev => ({ ...prev, selectedCategory: category }));
    console.log('Selected category:', category);
  };

  const startGame = async () => {
    if (!gameState.selectedCategory) {
      showFeedbackMsg('Please select a category first!', 'error');
      return;
    }

    console.log('🚀 Starting game with category:', gameState.selectedCategory);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/game-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: gameState.selectedCategory,
          userId: gameState.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const mystery = await response.json();
      console.log('✓ Mystery generated:', mystery);

      setGameState(prev => ({
        ...prev,
        mysteryId: mystery.id,
        currentAnswer: mystery.answer,
        allClues: mystery.clues,
        cluesRevealed: mystery.clues.slice(0, prev.visibleClues),
        gameActive: true,
        gameStarted: true,
        startTime: Date.now(),
        mysteryData: mystery,
      }));

      setShowStart(false);
      setShowGame(true);
      showFeedbackMsg('Mystery loaded! Start guessing!', 'success');

    } catch (error) {
      console.error('❌ Error starting game:', error);
      showFeedbackMsg('Error loading mystery. Check console.', 'error');
    }
  };

  const submitGuess = async () => {
    const guess = guessInput.trim();
    if (!guess) return;

    console.log('🎯 Submitting guess:', guess);

    // FAST CLIENT-SIDE CHECK FIRST (instant!)
    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedAnswer = gameState.currentAnswer?.toLowerCase().trim() || '';

    let isCorrect = false;
    let needsAI = true;

    // Exact match (instant)
    if (normalizedGuess === normalizedAnswer) {
      isCorrect = true;
      needsAI = false;
      console.log('✅ Fast path: Exact match!');
    }
    // Answer contains guess (e.g., "Einstein" matches "Albert Einstein")
    else if (normalizedAnswer.includes(normalizedGuess) && normalizedGuess.length > 3) {
      isCorrect = true;
      needsAI = false;
      console.log('✅ Fast path: Answer contains guess');
    }
    // Guess contains answer
    else if (normalizedGuess.includes(normalizedAnswer) && normalizedAnswer.length > 3) {
      isCorrect = true;
      needsAI = false;
      console.log('✅ Fast path: Guess contains answer');
    }

    // Only call AI for edge cases
    if (needsAI) {
      showFeedbackMsg('Checking with AI...', 'info');
    }

    try {
      // Call AI only if needed
      if (needsAI) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-guess`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            guess,
            answer: gameState.currentAnswer,
            clues: gameState.cluesRevealed,
            mysteryId: gameState.mysteryId,
            userId: gameState.userId,
            attemptNumber: gameState.attempts + 1,
            timeElapsed: gameState.startTime ? Date.now() - gameState.startTime : 0,
          }),
        });

        const result = await response.json();
        isCorrect = result.correct;
        console.log('AI Validation result:', result);
      }

      // Update game state
      setGameState(prev => ({
        ...prev,
        attempts: prev.attempts + 1,
        guessHistory: [...prev.guessHistory, guess],
        score: isCorrect ? prev.score : Math.max(0, prev.score - 100),
      }));

      if (isCorrect) {
        setGameState(prev => ({ ...prev, solved: true, gameActive: false }));
        setShowGame(false);
        setShowResult(true);
        showFeedbackMsg('🎉 Correct! You solved it!', 'success');
      } else {
        if (gameState.attempts + 1 >= gameState.maxAttempts) {
          setGameState(prev => ({ ...prev, gameActive: false }));
          setShowGame(false);
          setShowResult(true);
          showFeedbackMsg('😞 Out of attempts! Game over.', 'error');
        } else {
          const newClueIndex = gameState.cluesRevealed.length;
          if (newClueIndex < gameState.allClues.length) {
            setGameState(prev => ({
              ...prev,
              cluesRevealed: [...prev.cluesRevealed, prev.allClues[newClueIndex]],
            }));
          }
          showFeedbackMsg('❌ Wrong! New clue revealed.', 'error');
        }
      }

      setGuessInput('');
    } catch (error) {
      console.error('Error validating guess:', error);
      showFeedbackMsg('Error checking answer. Try again.', 'error');
    }
  };

  const showFeedbackMsg = (msg: string, type: string) => {
    setFeedback(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedback(''), 3000);
  };

  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      mysteryId: null,
      attempts: 0,
      cluesRevealed: [],
      allClues: [],
      gameActive: false,
      gameStarted: false,
      solved: false,
      score: 1000,
      startTime: null,
      currentAnswer: null,
      mysteryData: null,
      guessHistory: [],
      selectedCategory: null,
    }));
    setShowStart(true);
    setShowGame(false);
    setShowResult(false);
    setGuessInput('');
    setFeedback('');
  };

  const generateNewPuzzle = async () => {
    const category = gameState.selectedCategory || 'person';
    if (!confirm(`Generate a completely NEW ${category} puzzle with AI?`)) return;

    showFeedbackMsg(`Deleting old ${category} puzzle...`, 'info');

    try {
      const today = new Date().toISOString().split('T')[0];

      // Use edge function to delete and regenerate
      const response = await fetch(`${SUPABASE_URL}/functions/v1/game-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'regenerate',
          category: category,
          userId: gameState.userId,
          today: today
        }),
      });

      if (response.ok) {
        showFeedbackMsg(`New ${category} puzzle generated!`, 'success');
        setTimeout(() => {
          setGameState(prev => ({ ...prev, selectedCategory: '' }));
          window.location.reload();
        }, 1500);
      } else {
        const error = await response.text();
        console.error('Generate error:', error);
        showFeedbackMsg('Error generating puzzle', 'error');
      }
    } catch (error) {
      console.error('Error generating new puzzle:', error);
      showFeedbackMsg('Error generating puzzle', 'error');
    }
  };

  const generateAllPuzzles = async () => {
    if (!confirm('Generate ALL 3 NEW puzzles (person, place, thing)?')) return;

    setGeneratingPuzzles(true);
    showFeedbackMsg('Deleting old puzzles and generating new ones with AI...', 'info');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/game-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'regenerate-all',
          userId: gameState.userId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ All puzzles regenerated:', result);
        setReadyCategories(['person', 'place', 'thing']);
        showFeedbackMsg(`✅ All ${result.generated} puzzles generated! Select a category.`, 'success');

        // Refresh after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const error = await response.text();
        console.error('Generate error:', error);
        showFeedbackMsg('Error generating puzzles', 'error');
      }
    } catch (error) {
      console.error('Error generating puzzles:', error);
      showFeedbackMsg('Error generating puzzles', 'error');
    } finally {
      setGeneratingPuzzles(false);
    }
  };

  const revealAllClues = () => {
    setGameState(prev => ({
      ...prev,
      cluesRevealed: prev.allClues,
    }));
    showFeedbackMsg('All clues revealed!', 'success');
  };

  const addHints = () => {
    setGameState(prev => ({
      ...prev,
      hintsAvailable: prev.hintsAvailable + 5,
    }));
    showFeedbackMsg('Added 5 hints!', 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">🔍 CIPHER HUNT</h1>
          <p className="text-xl text-purple-300">Think fast. Guess smart. Beat the clock.</p>
        </header>

        {showStart && (
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Choose Your Mystery Type</h2>
            <p className="text-center mb-8 text-slate-300">
              You get <strong className="text-yellow-400">3 clues</strong> to start. Each wrong guess reveals another clue.<br />
              Solve it in <strong className="text-yellow-400">6 attempts</strong> or less!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => selectCategory('person')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  gameState.selectedCategory === 'person'
                    ? 'border-purple-500 bg-purple-500/20 scale-105'
                    : 'border-slate-600 hover:border-purple-400 hover:bg-slate-700'
                }`}
              >
                <div className="text-4xl mb-2">👤</div>
                <div className="font-bold text-lg">PERSON</div>
                <div className="text-sm text-slate-400">Famous people & figures</div>
              </button>

              <button
                onClick={() => selectCategory('place')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  gameState.selectedCategory === 'place'
                    ? 'border-purple-500 bg-purple-500/20 scale-105'
                    : 'border-slate-600 hover:border-purple-400 hover:bg-slate-700'
                }`}
              >
                <div className="text-4xl mb-2">📍</div>
                <div className="font-bold text-lg">PLACE</div>
                <div className="text-sm text-slate-400">Landmarks & locations</div>
              </button>

              <button
                onClick={() => selectCategory('thing')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  gameState.selectedCategory === 'thing'
                    ? 'border-purple-500 bg-purple-500/20 scale-105'
                    : 'border-slate-600 hover:border-purple-400 hover:bg-slate-700'
                }`}
              >
                <div className="text-4xl mb-2">💎</div>
                <div className="font-bold text-lg">THING</div>
                <div className="text-sm text-slate-400">Objects & inventions</div>
              </button>
            </div>

            <button
              onClick={startGame}
              disabled={!gameState.selectedCategory || generatingPuzzles}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-4"
            >
              {generatingPuzzles ? 'GENERATING...' : 'START HUNT'}
            </button>

            <button
              onClick={generateAllPuzzles}
              disabled={generatingPuzzles}
              className="w-full py-3 rounded-xl font-bold text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ✨ Generate All 3 Puzzles with AI
            </button>

            {generatingPuzzles && (
              <div className="mt-4 text-center text-sm text-slate-400">
                Generating with GPT-4... This may take 30-60 seconds
              </div>
            )}
          </div>
        )}

        {showGame && (
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl">
            <button
              onClick={resetGame}
              className="mb-4 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-bold transition-all"
            >
              ← Back to Categories
            </button>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-700 p-4 rounded-xl text-center">
                <div className="text-sm text-slate-400">Category</div>
                <div className="text-xl font-bold uppercase">{gameState.selectedCategory}</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl text-center">
                <div className="text-sm text-slate-400">Score</div>
                <div className="text-xl font-bold">{gameState.score}</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl text-center">
                <div className="text-sm text-slate-400">Attempts</div>
                <div className="text-xl font-bold">{gameState.maxAttempts - gameState.attempts} left</div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Clues</h3>
              <div className="space-y-3">
                {gameState.cluesRevealed.map((clue, i) => (
                  <div key={i} className="bg-slate-700 p-4 rounded-lg">
                    <span className="text-purple-400 font-bold mr-2">#{i + 1}</span>
                    {clue}
                  </div>
                ))}
              </div>
            </div>

            {gameState.guessHistory.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-3">Your Guesses</h3>
                <div className="flex flex-wrap gap-2">
                  {gameState.guessHistory.map((guess, i) => (
                    <span key={i} className="bg-red-900/30 text-red-300 px-3 py-1 rounded-full text-sm">
                      {guess}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && submitGuess()}
                placeholder="Type your answer..."
                className="flex-1 px-4 py-3 rounded-lg bg-slate-700 border-2 border-slate-600 focus:border-purple-500 outline-none"
                maxLength={50}
              />
              <button
                onClick={submitGuess}
                className="px-8 py-3 rounded-lg font-bold bg-purple-600 hover:bg-purple-500 transition-all"
              >
                SUBMIT
              </button>
            </div>

            {feedback && (
              <div className={`p-4 rounded-lg ${feedbackType === 'error' ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
                {feedback}
              </div>
            )}
          </div>
        )}

        {showResult && (
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              {gameState.solved ? '🎉 Solved!' : '😞 Game Over'}
            </h2>

            <div className="mb-6">
              <div className="text-sm text-slate-400 mb-2">Final Score</div>
              <div className="text-5xl font-black text-purple-400">{gameState.score}</div>
            </div>

            <div className="bg-slate-700 p-6 rounded-xl mb-6">
              <div className="text-sm text-slate-400 mb-2">Answer</div>
              <div className="text-3xl font-bold">{gameState.currentAnswer}</div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4">All Clues</h3>
              <div className="space-y-2">
                {gameState.allClues.map((clue, i) => (
                  <div key={i} className="bg-slate-700 p-3 rounded-lg text-left">
                    <span className="text-purple-400 font-bold mr-2">#{i + 1}</span>
                    {clue}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={resetGame}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              PLAY AGAIN
            </button>
          </div>
        )}

        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowDevTools(!showDevTools)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-mono border border-slate-500"
          >
            DEV
          </button>

          {showDevTools && (
            <div className="absolute bottom-12 right-0 bg-slate-800 border border-slate-600 rounded-lg p-4 w-80 shadow-2xl">
              <div className="text-sm font-bold mb-3 text-purple-400">DEV TOOLS</div>

              <div className="space-y-2">
                <button
                  onClick={resetGame}
                  className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-left"
                >
                  🔄 Reset Game
                </button>

                <button
                  onClick={generateNewPuzzle}
                  className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-left"
                >
                  ✨ Generate New Puzzle
                </button>

                <button
                  onClick={revealAllClues}
                  className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-left"
                  disabled={!gameState.gameStarted}
                >
                  🔓 Reveal All Clues
                </button>

                <button
                  onClick={addHints}
                  className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-left"
                >
                  💡 Add 5 Hints
                </button>

                <div className="pt-2 border-t border-slate-600 text-xs text-slate-400 font-mono">
                  <div>Answer: {gameState.currentAnswer || 'N/A'}</div>
                  <div>Attempts: {gameState.attempts}/{gameState.maxAttempts}</div>
                  <div>Hints: {gameState.hintsAvailable}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
