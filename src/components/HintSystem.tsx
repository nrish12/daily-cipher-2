import { useState } from 'react';

interface HintSystemProps {
  currentAnswer: string;
  cluesRevealed: string[];
  allClues: string[];
  hintsAvailable: number;
  onHintUsed: () => void;
  onRevealClue: () => void;
}

export default function HintSystem({
  currentAnswer,
  cluesRevealed,
  allClues,
  hintsAvailable,
  onHintUsed,
  onRevealClue,
}: HintSystemProps) {
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [hintType, setHintType] = useState<'letter' | 'length' | 'category' | null>(null);

  const generateLetterHint = (): string => {
    const answer = currentAnswer.toLowerCase();
    const words = answer.split(' ');

    // Pick the longest word (most helpful)
    const longestWord = words.reduce((a, b) => a.length > b.length ? a : b);
    const firstLetter = longestWord[0].toUpperCase();
    const lastLetter = longestWord[longestWord.length - 1].toUpperCase();
    const maskedWord = firstLetter + '_'.repeat(longestWord.length - 2) + lastLetter;

    if (words.length === 1) {
      return `The answer starts with "${firstLetter}" and ends with "${lastLetter}" (${maskedWord})`;
    } else {
      return `One key word starts with "${firstLetter}" and ends with "${lastLetter}" (${maskedWord})`;
    }
  };

  const generateLengthHint = (): string => {
    const words = currentAnswer.split(' ');
    if (words.length === 1) {
      return `The answer is one word with ${currentAnswer.length} letters`;
    } else {
      const lengths = words.map(w => w.length).join('-');
      return `The answer has ${words.length} words with letter pattern: ${lengths}`;
    }
  };

  const generateCategoryHint = (): string => {
    const answer = currentAnswer.toLowerCase();
    const vowelCount = (answer.match(/[aeiou]/gi) || []).length;
    const consonantCount = answer.replace(/[^a-z]/gi, '').length - vowelCount;

    // Enhanced hints based on clues revealed
    const clueCount = cluesRevealed.length;

    if (clueCount <= 3) {
      // Early game - general hints
      return `The answer has ${vowelCount} vowels and ${consonantCount} consonants (total ${vowelCount + consonantCount} letters)`;
    } else if (clueCount <= 5) {
      // Mid game - more specific
      const hasThe = answer.includes('the');
      const hasOf = answer.includes('of');
      if (hasThe || hasOf) {
        return `The answer includes common words like ${hasThe ? '"the"' : ''} ${hasOf ? '"of"' : ''}`;
      }
      return `The answer has ${vowelCount} vowels and ${consonantCount} consonants`;
    } else {
      // Late game - very specific
      const firstWord = currentAnswer.split(' ')[0];
      const lastWord = currentAnswer.split(' ').pop() || '';
      return `First word has ${firstWord.length} letters, last word has ${lastWord.length} letters`;
    }
  };

  const useHint = (type: 'letter' | 'length' | 'category') => {
    if (hintsAvailable <= 0) {
      setActiveHint('No hints remaining!');
      setTimeout(() => setActiveHint(null), 2000);
      return;
    }

    let hint = '';
    switch (type) {
      case 'letter':
        hint = generateLetterHint();
        break;
      case 'length':
        hint = generateLengthHint();
        break;
      case 'category':
        hint = generateCategoryHint();
        break;
    }

    setActiveHint(hint);
    setHintType(type);
    onHintUsed();

    setTimeout(() => {
      setActiveHint(null);
      setHintType(null);
    }, 10000); // Show for 10 seconds
  };

  const revealNextClue = () => {
    if (cluesRevealed.length >= allClues.length) {
      setActiveHint('All clues already revealed!');
      setTimeout(() => setActiveHint(null), 2000);
      return;
    }

    if (hintsAvailable < 2) {
      setActiveHint('Need 2 hints to reveal a clue!');
      setTimeout(() => setActiveHint(null), 2000);
      return;
    }

    onRevealClue();
    const nextClue = allClues[cluesRevealed.length];
    setActiveHint(`🔓 New clue revealed: "${nextClue}"`);
    setTimeout(() => setActiveHint(null), 6000);
  };

  return (
    <div className="bg-slate-700 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">💡 Hint System</h3>
        <div className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg font-bold">
          {hintsAvailable} Hints Available
        </div>
      </div>

      {activeHint && (
        <div className={`mb-4 p-4 rounded-lg ${
          hintType ? 'bg-blue-900/30 text-blue-300 border-2 border-blue-500 animate-pulse' : 'bg-red-900/30 text-red-300'
        }`}>
          <div className="font-bold mb-1">
            {hintType === 'letter' && '🔤 Letter Hint'}
            {hintType === 'length' && '📏 Length Hint'}
            {hintType === 'category' && '🔍 Pattern Hint'}
            {!hintType && '⚠️ Notice'}
          </div>
          <div className="text-lg">{activeHint}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => useHint('letter')}
          disabled={hintsAvailable <= 0}
          className="p-4 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left border-2 border-transparent hover:border-blue-400"
        >
          <div className="font-bold mb-1">🔤 First & Last Letter</div>
          <div className="text-sm text-slate-300">Shows starting and ending letters</div>
          <div className="text-xs text-yellow-400 mt-1">Costs: 1 hint | Best for narrowing down</div>
        </button>

        <button
          onClick={() => useHint('length')}
          disabled={hintsAvailable <= 0}
          className="p-4 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left border-2 border-transparent hover:border-blue-400"
        >
          <div className="font-bold mb-1">📏 Word Length</div>
          <div className="text-sm text-slate-300">Shows word count and letter pattern</div>
          <div className="text-xs text-yellow-400 mt-1">Costs: 1 hint | Great early hint</div>
        </button>

        <button
          onClick={() => useHint('category')}
          disabled={hintsAvailable <= 0}
          className="p-4 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left border-2 border-transparent hover:border-blue-400"
        >
          <div className="font-bold mb-1">🔍 Letter Pattern</div>
          <div className="text-sm text-slate-300">Adaptive hint based on progress</div>
          <div className="text-xs text-yellow-400 mt-1">Costs: 1 hint | Gets better with more clues</div>
        </button>

        <button
          onClick={revealNextClue}
          disabled={hintsAvailable < 2 || cluesRevealed.length >= allClues.length}
          className="p-4 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left border-2 border-transparent hover:border-purple-400"
        >
          <div className="font-bold mb-1">🔓 Reveal Next Clue</div>
          <div className="text-sm text-slate-300">Skip ahead to clue #{cluesRevealed.length + 1}</div>
          <div className="text-xs text-yellow-400 mt-1">Costs: 2 hints | When you're stuck</div>
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-600">
        <div className="text-sm text-slate-400">
          💡 <strong>Strategy:</strong> Use length hint first, then letter hints.
          Save "Reveal Clue" for when you're completely stuck. Each wrong guess reveals a new clue automatically!
        </div>
      </div>
    </div>
  );
}
