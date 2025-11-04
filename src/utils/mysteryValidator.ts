/**
 * Validates mystery quality on the client side
 * Helps catch poor quality mysteries before they frustrate players
 */

export interface MysteryQualityReport {
  isGoodQuality: boolean;
  issues: string[];
  score: number; // 0-100
}

export function validateMysteryQuality(mystery: any): MysteryQualityReport {
  const issues: string[] = [];
  let score = 100;

  // Check 1: Clues should have concrete facts
  const vagueWords = ['could be', 'might be', 'likened to', 'testament', 'journey', 'dance', 'born from'];
  let vagueClueCount = 0;

  mystery.clues.forEach((clue: string, index: number) => {
    const lowerClue = clue.toLowerCase();

    // Check for vague poetry
    for (const vague of vagueWords) {
      if (lowerClue.includes(vague)) {
        issues.push(`Clue ${index + 1} is too vague: "${clue}"`);
        vagueClueCount++;
        score -= 10;
        break;
      }
    }

    // Check for concrete facts (numbers, dates, names)
    const hasConcreteFacts = /\d+/.test(clue) || // has numbers
                            /\b(19|20)\d{2}\b/.test(clue) || // has year
                            /\b(feet|miles|meters|established|founded|built|created)\b/i.test(clue); // has measurements or dates

    if (!hasConcreteFacts && index > 2) { // Clues 4+ should have facts
      issues.push(`Clue ${index + 1} lacks specific facts: "${clue}"`);
      score -= 5;
    }
  });

  if (vagueClueCount > 2) {
    issues.push(`Too many vague/poetic clues (${vagueClueCount}/8)`);
    score -= 20;
  }

  // Check 2: Progressive difficulty
  const earlyClues = mystery.clues.slice(0, 3).join(' ');
  const lateClues = mystery.clues.slice(5, 8).join(' ');

  // Late clues should be more specific (have more proper nouns, numbers)
  const earlySpecificity = (earlyClues.match(/\b[A-Z][a-z]+\b/g) || []).length;
  const lateSpecificity = (lateClues.match(/\b[A-Z][a-z]+\b/g) || []).length;

  if (earlySpecificity > lateSpecificity) {
    issues.push('Early clues are more specific than late clues - should be reversed');
    score -= 15;
  }

  // Check 3: Answer length
  if (mystery.answer.split(' ').length > 4) {
    issues.push('Answer is too long (max 4 words)');
    score -= 10;
  }

  // Final assessment
  const isGoodQuality = score >= 70 && vagueClueCount <= 2;

  return {
    isGoodQuality,
    issues,
    score
  };
}

export function logMysteryQuality(mystery: any): void {
  const report = validateMysteryQuality(mystery);

  console.group('🎯 Mystery Quality Report');
  console.log('Answer:', mystery.answer);
  console.log('Score:', report.score + '/100');
  console.log('Quality:', report.isGoodQuality ? '✅ GOOD' : '❌ NEEDS IMPROVEMENT');

  if (report.issues.length > 0) {
    console.log('\n⚠️ Issues Found:');
    report.issues.forEach(issue => console.log('  -', issue));
  }

  console.log('\n📝 Clues:');
  mystery.clues.forEach((clue: string, i: number) => {
    const hasFactMatch = /\d+|19\d{2}|20\d{2}|feet|miles|meters|established|founded/.test(clue);
    console.log(`  ${i + 1}. ${hasFactMatch ? '✓' : '⚠️'} ${clue}`);
  });

  console.groupEnd();
}
