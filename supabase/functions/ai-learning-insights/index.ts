import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getAIInsights(supabase: any) {
  const { data: analytics } = await supabase
    .from("mystery_analytics")
    .select("*")
    .order("solve_rate", { ascending: true })
    .limit(10);

  const { data: clueData } = await supabase
    .from("clue_effectiveness")
    .select("*")
    .order("effectiveness_score", { ascending: true })
    .limit(20);

  const { data: guesses } = await supabase
    .from("user_guesses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const insights = {
    hardestMysteries: analytics?.slice(0, 5) || [],
    easiestMysteries: analytics?.slice(-5) || [],
    ineffectiveClues: clueData?.filter((c: any) => c.effectiveness_score < 30) || [],
    recentGuessPatterns: analyzGuessPatterns(guesses || []),
    recommendations: []
  };

  if (analytics && analytics.length > 0) {
    const avgSolveRate = analytics.reduce((sum: number, a: any) => sum + parseFloat(a.solve_rate), 0) / analytics.length;

    if (avgSolveRate < 40) {
      insights.recommendations.push({
        type: "difficulty",
        message: "Mysteries are too hard - average solve rate is below 40%",
        action: "Generate easier clues or provide more hints early"
      });
    } else if (avgSolveRate > 80) {
      insights.recommendations.push({
        type: "difficulty",
        message: "Mysteries are too easy - average solve rate is above 80%",
        action: "Make clues more cryptic in early stages"
      });
    }
  }

  return insights;
}

function analyzGuessPatterns(guesses: any[]) {
  const patterns: any = {
    averageCluesBeforeGuess: 0,
    commonWrongGuesses: new Map(),
    earlyGuessBehavior: 0
  };

  if (guesses.length === 0) return patterns;

  let totalClues = 0;
  let earlyGuesses = 0;

  guesses.forEach((guess: any) => {
    totalClues += guess.clues_seen_count;

    if (guess.clues_seen_count <= 3) {
      earlyGuesses++;
    }

    if (!guess.is_correct) {
      const count = patterns.commonWrongGuesses.get(guess.guess_text) || 0;
      patterns.commonWrongGuesses.set(guess.guess_text, count + 1);
    }
  });

  patterns.averageCluesBeforeGuess = totalClues / guesses.length;
  patterns.earlyGuessBehavior = (earlyGuesses / guesses.length) * 100;

  patterns.topWrongGuesses = Array.from(patterns.commonWrongGuesses.entries())
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 10)
    .map(([guess, count]) => ({ guess, count }));

  delete patterns.commonWrongGuesses;

  return patterns;
}

async function generateAdaptiveMysteryPrompt(supabase: any) {
  const insights = await getAIInsights(supabase);

  const prompt = `Based on player data analysis:

Average Solve Rate: ${insights.hardestMysteries.length > 0 ? 'varies widely' : 'balanced'}
Player Behavior: ${insights.recentGuessPatterns.earlyGuessBehavior > 60 ? 'impatient - guess early' : 'careful - wait for clues'}
Average Clues Used: ${insights.recentGuessPatterns.averageCluesBeforeGuess}

RECOMMENDATIONS:
${insights.recommendations.map((r: any) => `- ${r.message}: ${r.action}`).join('\n')}

Adjust mystery difficulty accordingly:
- If players are too successful, make early clues more cryptic
- If players struggle, make mid-game clues more helpful
- Balance challenge with fairness based on actual player behavior`;

  return { insights, adaptivePrompt: prompt };
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

    const { action } = await req.json();

    if (action === "generate-adaptive-prompt") {
      const result = await generateAdaptiveMysteryPrompt(supabase);

      return new Response(
        JSON.stringify(result),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      const insights = await getAIInsights(supabase);

      return new Response(
        JSON.stringify(insights),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
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
