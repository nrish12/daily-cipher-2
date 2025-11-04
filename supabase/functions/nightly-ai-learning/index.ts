import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function analyzeAndLearn(supabase: any) {
  console.log("🤖 Starting nightly AI learning analysis...");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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

  if (!analytics || analytics.length === 0) {
    console.log("No data yet to analyze");
    return {
      status: "no_data",
      message: "Not enough data to learn from yet"
    };
  }

  const avgSolveRate = analytics.reduce((sum: number, a: any) =>
    sum + parseFloat(a.solve_rate || 0), 0) / analytics.length;

  const tooHard = analytics.filter((a: any) => parseFloat(a.solve_rate) < 40);
  const tooEasy = analytics.filter((a: any) => parseFloat(a.solve_rate) > 80);

  const guessPatterns: any = {
    averageCluesBeforeSolve: 0,
    earlyGuessers: 0,
    lateGuessers: 0
  };

  if (recentGuesses && recentGuesses.length > 0) {
    const solves: any[] = [];
    let earlyGuessers = 0;
    let lateGuessers = 0;

    for (const guess of recentGuesses) {
      if (guess.is_correct) {
        solves.push(guess);
      }
      if (guess.clues_seen_count <= 3) {
        earlyGuessers++;
      }
      if (guess.clues_seen_count >= 6) {
        lateGuessers++;
      }
    }

    if (solves.length > 0) {
      const totalClues = solves.reduce((sum: number, g: any) => sum + g.clues_seen_count, 0);
      guessPatterns.averageCluesBeforeSolve = totalClues / solves.length;
    }

    guessPatterns.earlyGuessers = earlyGuessers;
    guessPatterns.lateGuessers = lateGuessers;
  }

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

  const recommendations: any[] = [];
  let difficultyAdjustment = "maintain";

  if (avgSolveRate < 40) {
    recommendations.push({
      type: "difficulty",
      severity: "high",
      message: "Mysteries are TOO HARD - only " + avgSolveRate.toFixed(1) + "% solve rate",
      action: "Make clue 4 and 5 significantly more specific and helpful"
    });
    difficultyAdjustment = "easier";
  } else if (avgSolveRate > 80) {
    recommendations.push({
      type: "difficulty",
      severity: "medium",
      message: "Mysteries are TOO EASY - " + avgSolveRate.toFixed(1) + "% solve rate",
      action: "Make early clues (1-3) more cryptic and indirect"
    });
    difficultyAdjustment = "harder";
  } else {
    recommendations.push({
      type: "difficulty",
      severity: "low",
      message: "Difficulty is PERFECT - " + avgSolveRate.toFixed(1) + "% solve rate",
      action: "Maintain current clue structure"
    });
  }

  if (guessPatterns.earlyGuessers > guessPatterns.lateGuessers * 2) {
    recommendations.push({
      type: "player_behavior",
      severity: "medium",
      message: "Players are guessing too early and impatiently",
      action: "Early clues should give less information to discourage blind guessing"
    });
  }

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

  console.log("📊 Learning Analysis Complete:", learningData);

  return learningData;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const insights = await analyzeAndLearn(supabase);

    // Store insights in database for generate-mystery to use
    if (insights.status !== "no_data") {
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
    }

    console.log("✅ Nightly learning complete. Insights stored for next puzzle generation.");

    return new Response(
      JSON.stringify({
        success: true,
        insights,
        message: "AI has learned from player data and will adjust tomorrow's puzzles"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});