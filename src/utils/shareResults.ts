export interface GameResults {
  puzzleNumber: number;
  category: string;
  attempts: number;
  maxAttempts: number;
  cluesUsed: number;
  score: number;
  solved: boolean;
  hintsUsed: number;
}

export function generateShareText(results: GameResults): string {
  const date = new Date();
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

  // Generate emoji grid
  let emojiGrid = '';
  for (let i = 0; i < results.attempts; i++) {
    const cluesAttempt = Math.min(3 + i, results.cluesUsed);
    emojiGrid += '⬜'.repeat(cluesAttempt);
    if (i === results.attempts - 1 && results.solved) {
      emojiGrid += '✅\n';
    } else {
      emojiGrid += '❌\n';
    }
  }

  const categoryEmoji = {
    'person': '👤',
    'place': '🗺️',
    'thing': '💎'
  }[results.category.toLowerCase()] || '🎯';

  return `Daily Cipher Hunt #${dayOfYear} 🔍
Category: ${results.category.toUpperCase()} ${categoryEmoji}
${emojiGrid}
Score: ${results.score} | ${results.attempts}/${results.maxAttempts} attempts
${results.hintsUsed > 0 ? `💡 Used ${results.hintsUsed} hints` : '🏆 No hints!'}

Play at: daily-cipher-hunt.com`;
}

export async function shareResults(results: GameResults): Promise<boolean> {
  const shareText = generateShareText(results);

  // Use Web Share API if available (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Daily Cipher Hunt',
        text: shareText
      });
      return true;
    } catch (err) {
      // User cancelled, fall through to clipboard
    }
  }

  // Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(shareText);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}
