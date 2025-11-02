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

  const { data: recentGuesses } = await supabase
    .from("user_guesses")
    .select("*")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  const { data: analytics } = await supabase
    .from("mystery_analytics")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);

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
    const solves = recentGuesses.filter((g: any) => g.is_correct);
    if (solves.length > 0) {
      guessPatterns.averageCluesBeforeSolve =
        solves.reduce((sum: number, g: any) => sum + g.clues_seen_count, 0) / solves.length;
    }

    guessPatterns.earlyGuessers = recentGuesses.filter((g: any) =>
      g.clues_seen_count <= 3).length;
    guessPatterns.lateGuessers = recentGuesses.filter((g: any) =>
      g.clues_seen_count >= 6).length;
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