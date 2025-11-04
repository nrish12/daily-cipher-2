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
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const firstLetter = randomWord[0].toUpperCase();
    const maskedWord = firstLetter + '_'.repeat(randomWord.length - 1);

    if (words.length === 1) {
      return `The answer starts with "${firstLetter}" (${maskedWord})`;
    } else {
      return `One word starts with "${firstLetter}" (${maskedWord})`;
    }
  };

  const generateLengthHint = (): string => {
    const words = currentAnswer.split(' ');
    if (words.length === 1) {
      return `The answer is ${currentAnswer.length} letters long`;
    } else {
      const lengths = words.map(w => w.length).join(', ');
      return `The answer has ${words.length} words with lengths: ${lengths}`;
    }
  };

  const generateCategoryHint = (): string => {
    const answer = currentAnswer.toLowerCase();

    if (answer.includes('the') || answer.includes('of')) {
      return 'The answer includes common words like "the" or "of"';
    }

    const vowelCount = (answer.match(/[aeiou]/gi) || []).length;
    const consonantCount = answer.length - vowelCount;

    return `The answer has ${vowelCount} vowels and ${consonantCount} consonants`;
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
    }, 8000);
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
    setActiveHint(`New clue revealed: "${allClues[cluesRevealed.length]}"`);
    setTimeout(() => setActiveHint(null), 5000);
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
          hintType ? 'bg-blue-900/30 text-blue-300 border-2 border-blue-500' : 'bg-red-900/30 text-red-300'
        }`}>
          <div className="font-bold mb-1">
            {hintType === 'letter' && '🔤 Letter Hint'}
            {hintType === 'length' && '📏 Length Hint'}
            {hintType === 'category' && '🔍 Pattern Hint'}
            {!hintType && '⚠️ Notice'}
          </div>
          {activeHint}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => useHint('letter')}
          disabled={hintsAvailable <= 0}
          className="p-4 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
        >
          <div className="font-bold mb-1">🔤 Letter Hint</div>
          <div className="text-sm text-slate-300">Reveals first letter of a word</div>
          <div className="text-xs text-yellow-400 mt-1">Costs: 1 hint</div>
        </button>

        <button
          onClick={() => useHint('length')}
          disabled={hintsAvailable <= 0}
          className="p-4 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
        >
          <div className="font-bold mb-1">📏 Length Hint</div>
          <div className="text-sm text-slate-300">Shows word count and lengths</div>
          <div className="text-xs text-yellow-400 mt-1">Costs: 1 hint</div>
        </button>

        <button
          onClick={() => useHint('category')}
          disabled={hintsAvailable <= 0}
          className="p-4 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
        >
          <div className="font-bold mb-1">🔍 Pattern Hint</div>
          <div className="text-sm text-slate-300">Gives vowel/consonant info</div>
          <div className="text-xs text-yellow-400 mt-1">Costs: 1 hint</div>
        </button>

        <button
          onClick={revealNextClue}
          disabled={hintsAvailable < 2 || cluesRevealed.length >= allClues.length}
          className="p-4 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
        >
          <div className="font-bold mb-1">🔓 Reveal Next Clue</div>
          <div className="text-sm text-slate-300">Unlock an extra clue early</div>
          <div className="text-xs text-yellow-400 mt-1">Costs: 2 hints</div>
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-600">
        <div className="text-sm text-slate-400">
          💡 <strong>Tip:</strong> Use hints wisely! Each wrong guess automatically reveals a clue,
          but hints give you extra information without losing attempts.
        </div>
      </div>
    </div>
  );
}
