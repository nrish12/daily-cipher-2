export function sanitizeGuess(guess: string): string {
  return guess
    .trim()
    .slice(0, 100) // Max length
    .replace(/[<>]/g, '') // Remove potential XSS
    .replace(/\s+/g, ' '); // Normalize whitespace
}

export function validateGuess(guess: string): { valid: boolean; error?: string } {
  if (!guess || guess.trim().length === 0) {
    return { valid: false, error: 'Guess cannot be empty' };
  }

  if (guess.length > 100) {
    return { valid: false, error: 'Guess too long (max 100 characters)' };
  }

  if (!/^[a-zA-Z0-9\s'-]+$/.test(guess)) {
    return { valid: false, error: 'Guess contains invalid characters' };
  }

  return { valid: true };
}
