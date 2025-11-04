# AI Deployment Instructions
## Daily Cipher 2 - Performance & Learning System Implementation

**IMPORTANT:** All changes are in GitHub branch `claude/review-code-logic-011CUns5nD95JUSzvb6XYPsm`

---

## STEP 1: Apply Database Migration

**File:** `supabase/migrations/20251104000000_add_clue_insights_column.sql`

Run this SQL in Supabase:

```sql
ALTER TABLE ai_learning_insights
ADD COLUMN IF NOT EXISTS clue_insights jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ai_learning_insights.clue_insights IS
'Detailed clue effectiveness analysis including most/least effective clues, optimal reveal points, and solve distribution';
```

---

## STEP 2: Update Cache Duration

**File:** `src/utils/gameCache.ts`

**Line 6** - Change from:
```typescript
const CACHE_DURATION = 5 * 60 * 1000;
```

To:
```typescript
// Cache for 24 hours - puzzles are daily so no need to refetch
const CACHE_DURATION = 24 * 60 * 60 * 1000;
```

---

## STEP 3: Parallelize Puzzle Generation

**File:** `supabase/functions/game-api/index.ts`

**Lines 42-63** - Replace the serial for loop with parallel execution:

Find this code (around line 42):
```typescript
const categoriesToGenerate = categories || ['person', 'place', 'thing'];
const results = [];

for (const cat of categoriesToGenerate) {
  const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-mystery`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ category: cat, userId }),
  });

  if (generateResponse.ok) {
    const newMystery = await generateResponse.json();
    results.push(newMystery);
    console.log(`✅ Generated ${cat}: ${newMystery.answer}`);
  } else {
    const errorText = await generateResponse.text();
    console.error(`Failed to generate ${cat}:`, errorText);
  }
}
```

Replace with:
```typescript
const categoriesToGenerate = categories || ['person', 'place', 'thing'];

// Parallel generation for 3x faster puzzle creation!
console.log(`🚀 Generating ${categoriesToGenerate.length} puzzles in parallel...`);

const generatePromises = categoriesToGenerate.map(async (cat) => {
  try {
    const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-mystery`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category: cat, userId }),
    });

    if (generateResponse.ok) {
      const newMystery = await generateResponse.json();
      console.log(`✅ Generated ${cat}: ${newMystery.answer}`);
      return newMystery;
    } else {
      const errorText = await generateResponse.text();
      console.error(`Failed to generate ${cat}:`, errorText);
      return null;
    }
  } catch (error) {
    console.error(`Error generating ${cat}:`, error);
    return null;
  }
});

const results = (await Promise.all(generatePromises)).filter(r => r !== null);
```

---

## STEP 4: Enhance Clue Effectiveness Analysis

**File:** `supabase/functions/nightly-ai-learning/index.ts`

### 4a. Update data fetching (lines 16-30)

Find:
```typescript
const [guessesResult, analyticsResult] = await Promise.all([
  supabase
    .from("user_guesses")
    .select("*")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false }),
  supabase
    .from("mystery_analytics")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50)
]);

const recentGuesses = guessesResult.data;
const analytics = analyticsResult.data;
```

Replace with:
```typescript
const [guessesResult, analyticsResult, clueEffectivenessResult] = await Promise.all([
  supabase
    .from("user_guesses")
    .select("*")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false }),
  supabase
    .from("mystery_analytics")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50),
  supabase
    .from("clue_effectiveness")
    .select("*")
    .order("times_revealed", { ascending: false })
    .limit(100)
]);

const recentGuesses = guessesResult.data;
const analytics = analyticsResult.data;
const clueEffectiveness = clueEffectivenessResult.data;
```

### 4b. Add clue analysis logic (insert after line 83, after guessPatterns calculation)

Add this entire block:
```typescript
// Analyze clue effectiveness
const clueInsights: any = {
  mostEffectiveClues: [],
  leastEffectiveClues: [],
  optimalRevealPoint: 0,
  cluePatterns: {}
};

if (clueEffectiveness && clueEffectiveness.length > 0) {
  console.log("📊 Analyzing clue effectiveness data...");

  // Group clues by index (0-7)
  const cluesByIndex: any = {};
  for (let i = 0; i < 8; i++) {
    cluesByIndex[i] = clueEffectiveness.filter((c: any) => c.clue_index === i);
  }

  // Calculate effectiveness rate for each clue position
  const clueEffectivenessRates: any[] = [];
  for (let i = 0; i < 8; i++) {
    const cluesAtIndex = cluesByIndex[i];
    if (cluesAtIndex && cluesAtIndex.length > 0) {
      const totalRevealed = cluesAtIndex.reduce((sum: number, c: any) => sum + (c.times_revealed || 0), 0);
      const totalSolves = cluesAtIndex.reduce((sum: number, c: any) => sum + (c.led_to_solve || 0), 0);
      const effectivenessRate = totalRevealed > 0 ? (totalSolves / totalRevealed) * 100 : 0;

      clueEffectivenessRates.push({
        clueIndex: i,
        timesRevealed: totalRevealed,
        ledToSolve: totalSolves,
        effectivenessRate: effectivenessRate,
        position: i + 1
      });
    }
  }

  // Sort by effectiveness
  clueEffectivenessRates.sort((a, b) => b.effectivenessRate - a.effectivenessRate);

  clueInsights.mostEffectiveClues = clueEffectivenessRates.slice(0, 3);
  clueInsights.leastEffectiveClues = clueEffectivenessRates.slice(-3);

  // Find optimal reveal point (where most solves happen)
  const solvesByClueCount: any = {};
  if (recentGuesses) {
    for (const guess of recentGuesses) {
      if (guess.is_correct) {
        const clueCount = guess.clues_seen_count;
        solvesByClueCount[clueCount] = (solvesByClueCount[clueCount] || 0) + 1;
      }
    }
  }

  let maxSolves = 0;
  let optimalPoint = 4;
  for (const [count, solves] of Object.entries(solvesByClueCount)) {
    if ((solves as number) > maxSolves) {
      maxSolves = solves as number;
      optimalPoint = parseInt(count);
    }
  }
  clueInsights.optimalRevealPoint = optimalPoint;
  clueInsights.solveDistribution = solvesByClueCount;

  console.log("✅ Clue effectiveness analysis complete:", clueInsights);
}
```

### 4c. Enhance recommendations (find the existing recommendations section around line 178 and add after "earlyGuessers" check)

After the existing early guessers recommendation, add:
```typescript
// Add clue-specific recommendations
if (clueInsights.leastEffectiveClues.length > 0) {
  for (const clue of clueInsights.leastEffectiveClues) {
    if (clue.effectivenessRate < 10 && clue.timesRevealed > 10) {
      recommendations.push({
        type: "clue_quality",
        severity: "high",
        message: `Clue position ${clue.position} has low effectiveness (${clue.effectivenessRate.toFixed(1)}%)`,
        action: `Make clue ${clue.position} more helpful and specific`
      });
    }
  }
}

if (clueInsights.optimalRevealPoint) {
  if (clueInsights.optimalRevealPoint <= 3) {
    recommendations.push({
      type: "early_solves",
      severity: "medium",
      message: `Most players solve at clue ${clueInsights.optimalRevealPoint} - too easy`,
      action: "Make clues 1-3 more cryptic to increase challenge"
    });
  } else if (clueInsights.optimalRevealPoint >= 7) {
    recommendations.push({
      type: "late_solves",
      severity: "high",
      message: `Most players need ${clueInsights.optimalRevealPoint} clues - too hard`,
      action: "Make clue 5-6 more direct to help struggling players"
    });
  }
}

if (clueInsights.mostEffectiveClues.length > 0) {
  const bestClue = clueInsights.mostEffectiveClues[0];
  if (bestClue.effectivenessRate > 50) {
    recommendations.push({
      type: "clue_success",
      severity: "low",
      message: `Clue position ${bestClue.position} is highly effective (${bestClue.effectivenessRate.toFixed(1)}%)`,
      action: `Use similar style/specificity for other mid-game clues`
    });
  }
}
```

### 4d. Update learningData object (around line 232)

Find:
```typescript
const learningData = {
  analyzed_at: new Date().toISOString(),
  avg_solve_rate: avgSolveRate,
  difficulty_adjustment: difficultyAdjustment,
  too_hard_count: tooHard.length,
  too_easy_count: tooEasy.length,
  recommendations,
  guess_patterns: guessPatterns,
  total_games_analyzed: analytics.length,
  total_guesses_analyzed: recentGuesses?.length || 0
};
```

Replace with:
```typescript
const learningData = {
  analyzed_at: new Date().toISOString(),
  avg_solve_rate: avgSolveRate,
  difficulty_adjustment: difficultyAdjustment,
  too_hard_count: tooHard.length,
  too_easy_count: tooEasy.length,
  recommendations,
  guess_patterns: guessPatterns,
  clue_insights: clueInsights,
  total_games_analyzed: analytics.length,
  total_guesses_analyzed: recentGuesses?.length || 0
};
```

### 4e. Update database insert (around line 267)

Find:
```typescript
await supabase.from("ai_learning_insights").insert({
  analyzed_at: insights.analyzed_at,
  avg_solve_rate: insights.avg_solve_rate,
  difficulty_adjustment: insights.difficulty_adjustment,
  too_hard_count: insights.too_hard_count,
  too_easy_count: insights.too_easy_count,
  recommendations: insights.recommendations,
  guess_patterns: insights.guess_patterns,
  total_games_analyzed: insights.total_games_analyzed,
  total_guesses_analyzed: insights.total_guesses_analyzed,
  applied: false
});
```

Replace with:
```typescript
await supabase.from("ai_learning_insights").insert({
  analyzed_at: insights.analyzed_at,
  avg_solve_rate: insights.avg_solve_rate,
  difficulty_adjustment: insights.difficulty_adjustment,
  too_hard_count: insights.too_hard_count,
  too_easy_count: insights.too_easy_count,
  recommendations: insights.recommendations,
  guess_patterns: insights.guess_patterns,
  clue_insights: insights.clue_insights,
  total_games_analyzed: insights.total_games_analyzed,
  total_guesses_analyzed: insights.total_guesses_analyzed,
  applied: false
});
```

---

## STEP 5: Enhance Mystery Generation with Clue Insights

**File:** `supabase/functions/generate-mystery/index.ts`

### 5a. Update adaptive instructions (lines 17-39)

Find:
```typescript
let adaptiveInstructions = "";
if (learningInsights) {
  console.log("🧠 Applying AI learning insights:", learningInsights.difficulty_adjustment);

  if (learningInsights.difficulty_adjustment === "easier") {
    adaptiveInstructions = `\n\n🤖 AI LEARNING ADJUSTMENT: Players are struggling (${learningInsights.avg_solve_rate}% solve rate).
Make puzzles EASIER by:
- Clue 4: Be MORE specific and helpful
- Clue 5: Give a clear, direct hint
- Clue 6: Use well-known facts
- Overall: Reduce cryptic language`;
  } else if (learningInsights.difficulty_adjustment === "harder") {
    adaptiveInstructions = `\n\n🤖 AI LEARNING ADJUSTMENT: Players find this too easy (${learningInsights.avg_solve_rate}% solve rate).
Make puzzles HARDER by:
- Clue 1-3: Be MORE cryptic and indirect
- Clue 4: Stay vague
- Overall: Use less obvious references`;
  }

  if (learningInsights.guess_patterns?.earlyGuessers > learningInsights.guess_patterns?.lateGuessers * 2) {
    adaptiveInstructions += `\n- Players guess impatiently, so early clues should be extra cryptic`;
  }
}
```

Replace with:
```typescript
let adaptiveInstructions = "";
if (learningInsights) {
  console.log("🧠 Applying AI learning insights:", learningInsights.difficulty_adjustment);

  if (learningInsights.difficulty_adjustment === "easier") {
    adaptiveInstructions = `\n\n🤖 AI LEARNING ADJUSTMENT: Players are struggling (${learningInsights.avg_solve_rate.toFixed(1)}% solve rate).
Make puzzles EASIER by:
- Clue 4: Be MORE specific and helpful
- Clue 5: Give a clear, direct hint
- Clue 6: Use well-known facts
- Overall: Reduce cryptic language`;
  } else if (learningInsights.difficulty_adjustment === "harder") {
    adaptiveInstructions = `\n\n🤖 AI LEARNING ADJUSTMENT: Players find this too easy (${learningInsights.avg_solve_rate.toFixed(1)}% solve rate).
Make puzzles HARDER by:
- Clue 1-3: Be MORE cryptic and indirect
- Clue 4: Stay vague
- Overall: Use less obvious references`;
  }

  if (learningInsights.guess_patterns?.earlyGuessers > learningInsights.guess_patterns?.lateGuessers * 2) {
    adaptiveInstructions += `\n- Players guess impatiently, so early clues should be extra cryptic`;
  }

  // Add clue-specific insights
  if (learningInsights.clue_insights) {
    const clueInsights = learningInsights.clue_insights;

    adaptiveInstructions += `\n\n📊 CLUE EFFECTIVENESS DATA:`;

    if (clueInsights.optimalRevealPoint) {
      adaptiveInstructions += `\n- Most players solve at clue ${clueInsights.optimalRevealPoint}`;
      if (clueInsights.optimalRevealPoint <= 3) {
        adaptiveInstructions += ` (TOO EASY - make early clues less revealing)`;
      } else if (clueInsights.optimalRevealPoint >= 7) {
        adaptiveInstructions += ` (TOO HARD - make mid-game clues more helpful)`;
      } else {
        adaptiveInstructions += ` (GOOD BALANCE)`;
      }
    }

    if (clueInsights.leastEffectiveClues && clueInsights.leastEffectiveClues.length > 0) {
      adaptiveInstructions += `\n\n⚠️ IMPROVE THESE CLUE POSITIONS:`;
      for (const clue of clueInsights.leastEffectiveClues) {
        if (clue.effectivenessRate < 15 && clue.timesRevealed > 5) {
          adaptiveInstructions += `\n- Clue ${clue.position}: Only ${clue.effectivenessRate.toFixed(1)}% effectiveness - make this clue MORE useful and specific`;
        }
      }
    }

    if (clueInsights.mostEffectiveClues && clueInsights.mostEffectiveClues.length > 0) {
      const bestClue = clueInsights.mostEffectiveClues[0];
      if (bestClue.effectivenessRate > 40) {
        adaptiveInstructions += `\n\n✅ CLUE POSITION ${bestClue.position} WORKS WELL (${bestClue.effectivenessRate.toFixed(1)}% effective):`;
        adaptiveInstructions += `\n- Use similar specificity and style for other mid-game clues`;
      }
    }
  }
}
```

### 5b. Mark insights as applied (after line 238, after `const mystery = await generateMysteryWithAI(...)`)

After:
```typescript
const mystery = await generateMysteryWithAI(category, latestInsights);
```

Add:
```typescript
// Mark insights as applied after successful generation
if (latestInsights) {
  await supabase
    .from("ai_learning_insights")
    .update({ applied: true })
    .eq("analyzed_at", latestInsights.analyzed_at);
  console.log("✅ Marked insights as applied");
}
```

---

## DEPLOYMENT COMMANDS

After making all code changes:

```bash
# 1. Deploy functions
supabase functions deploy game-api
supabase functions deploy generate-mystery
supabase functions deploy nightly-ai-learning

# 2. Build frontend
npm run build

# 3. Deploy frontend (depends on your hosting)
# Example: Vercel
vercel --prod

# Or Netlify
netlify deploy --prod
```

---

## VERIFICATION

Test that parallel generation works:
```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/game-api \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "regenerate-all", "userId": "test"}'
```

Should complete in 10-20 seconds (not 30-60s).

---

## SUMMARY

✅ 5 files modified
✅ 1 database migration
✅ 3x faster puzzle generation
✅ 288x fewer API calls
✅ AI learns from clue effectiveness
✅ Closed feedback loop

---

END OF DEPLOYMENT INSTRUCTIONS
