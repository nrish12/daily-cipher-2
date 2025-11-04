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

  const generateLetterHint = (): string => {
    const answer = currentAnswer.toLowerCase();
    const words = answer.split(' ');
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const firstLetter = randomWord[0].toUpperCase();
    const maskedWord = firstLetter + '_'.repeat(randomWord.length - 1);

    if (words.length === 1) {
      return `Starts with "${firstLetter}" (${maskedWord})`;
    } else {
      return `One word starts with "${firstLetter}" (${maskedWord})`;
    }
  };

  const useLetterHint = () => {
    if (hintsAvailable <= 0) {
      setActiveHint('No hints remaining!');
      setTimeout(() => setActiveHint(null), 2000);
      return;
    }

    const hint = generateLetterHint();
    setActiveHint(hint);
    onHintUsed();

    setTimeout(() => setActiveHint(null), 8000);
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
    setActiveHint(`New clue revealed!`);
    setTimeout(() => setActiveHint(null), 3000);
  };

  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="text-sm text-slate-400">
        Hints: <span className="text-yellow-400 font-bold">{hintsAvailable}</span>
      </div>

      <button
        onClick={useLetterHint}
        disabled={hintsAvailable <= 0}
        className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
      >
        Letter Hint (1)
      </button>

      <button
        onClick={revealNextClue}
        disabled={hintsAvailable < 2 || cluesRevealed.length >= allClues.length}
        className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
      >
        Reveal Clue (2)
      </button>

      {activeHint && (
        <div className="flex-1 px-4 py-2 rounded-lg bg-blue-900/30 text-blue-300 border border-blue-500 text-sm">
          {activeHint}
        </div>
      )}
    </div>
  );
}
