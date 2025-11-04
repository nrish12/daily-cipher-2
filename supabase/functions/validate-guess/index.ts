import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function validateGuessWithAI(guess: string, answer: string, clues: string[]) {
  const quickCheck = smartFallbackValidation(guess, answer);

  if (quickCheck.confidence >= 95) {
    console.log("Fast path validation:", quickCheck.reasoning);
    return quickCheck;
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    return quickCheck;
  }

  const prompt = `You are validating a player's guess in a mystery guessing game.

The correct answer is: "${answer}"
The player guessed: "${guess}"
Context clues revealed: ${clues.slice(0, 3).join(", ")}

Determine if the player's guess is correct. Be VERY GENEROUS with accepting answers. Consider:
- Exact matches (case insensitive)
- Common variations/nicknames (e.g., "Beatles" vs "The Beatles")
- Reasonable interpretations (e.g., "Einstein" for "Albert Einstein")
- Spelling errors and typos (up to 2-3 character differences, missing letters, double letters, etc.)
  Examples: "hubbel" = "hubble", "einstien" = "einstein", "van gough" = "van gogh"
- Partial matches if the core name is correct (e.g., "telescope" for "Hubble Telescope" is WRONG, but "hubble" alone is CORRECT)
- Phonetic similarities (sounds the same)

Be generous and accept the answer if it's CLEARLY what the player meant, even with spelling mistakes.

Respond with ONLY a JSON object:
{
  "correct": true or false,
  "confidence": 0-100,
  "reasoning": "Brief explanation"
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a fair and intelligent game judge. Be generous with partial matches and common variations. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error, falling back");
      return smartFallbackValidation(guess, answer);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    console.log("AI Validation:", result);
    return result;
  } catch (error) {
    console.error("AI validation failed:", error);
    return smartFallbackValidation(guess, answer);
  }
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function smartFallbackValidation(guess: string, answer: string) {
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedAnswer = answer.toLowerCase().trim();

  let correct = false;
  let reasoning = "";

  // Exact match
  if (normalizedGuess === normalizedAnswer) {
    correct = true;
    reasoning = "Exact match";
  }
  // Answer contains guess (e.g., "Curie" for "Marie Curie")
  else if (normalizedAnswer.includes(normalizedGuess) && normalizedGuess.length > 3) {
    correct = true;
    reasoning = "Answer contains guess";
  }
  // Guess contains answer (e.g., "Marie Curie was a scientist" for "Marie Curie")
  else if (normalizedGuess.includes(normalizedAnswer) && normalizedAnswer.length > 3) {
    correct = true;
    reasoning = "Guess contains answer";
  }
  // Check for spelling errors using Levenshtein distance
  else {
    const distance = levenshteinDistance(normalizedGuess, normalizedAnswer);
    const maxLength = Math.max(normalizedGuess.length, normalizedAnswer.length);
    const similarity = 1 - (distance / maxLength);

    // Accept if 80% similar (allows for 2-3 typos)
    if (similarity >= 0.80) {
      correct = true;
      reasoning = `Close spelling match (${Math.round(similarity * 100)}% similar)`;
    }
    // Check word overlap for multi-word answers
    else {
      const words1 = normalizedGuess.split(/\s+/);
      const words2 = normalizedAnswer.split(/\s+/);

      // Check if key words match (with spelling tolerance)
      const matchingWords = words1.filter(w1 =>
        words2.some(w2 => {
          if (w1 === w2) return true;
          if (w1.length > 3 && w2.length > 3) {
            const dist = levenshteinDistance(w1, w2);
            return dist <= 2; // Allow 2 character difference per word
          }
          return false;
        })
      );

      if (matchingWords.length > 0 && matchingWords.length >= Math.min(words1.length, words2.length) * 0.6) {
        correct = true;
        reasoning = "Significant word overlap with spelling tolerance";
      }
    }
  }

  return {
    correct,
    confidence: correct ? 90 : 95,
    reasoning: correct ? reasoning : "Does not match"
  };
}

async function recordGuessAnalytics(supabase: any, data: any) {
  const { mysteryId, userId, guess, isCorrect, cluesSeen, attemptNumber, timeElapsed } = data;

  try {
    const guessInsertPromise = supabase.from("user_guesses").insert({
      user_id: userId,
      mystery_id: mysteryId,
      guess_text: guess,
      is_correct: isCorrect,
      clues_seen_count: cluesSeen.length,
      clues_seen: cluesSeen,
      attempt_number: attemptNumber,
      time_elapsed_ms: timeElapsed
    });

    const analyticsPromise = supabase
      .from("mystery_analytics")
      .select("*")
      .eq("mystery_id", mysteryId)
      .maybeSingle();

    const [, analyticsResult] = await Promise.all([guessInsertPromise, analyticsPromise]);
    const analytics = analyticsResult.data;

    if (analytics) {
      const newAttempts = analytics.total_attempts + 1;
      const newSolves = analytics.total_solves + (isCorrect ? 1 : 0);
      const solveRate = (newSolves / newAttempts) * 100;

      await supabase
        .from("mystery_analytics")
        .update({
          total_attempts: newAttempts,
          total_solves: newSolves,
          solve_rate: solveRate,
          updated_at: new Date().toISOString()
        })
        .eq("mystery_id", mysteryId);
    } else {
      await supabase.from("mystery_analytics").insert({
        mystery_id: mysteryId,
        total_attempts: 1,
        total_solves: isCorrect ? 1 : 0,
        solve_rate: isCorrect ? 100 : 0
      });
    }

    const cluePromises = cluesSeen.map(async (clue: string, i: number) => {
      const { data: clueData } = await supabase
        .from("clue_effectiveness")
        .select("*")
        .eq("mystery_id", mysteryId)
        .eq("clue_index", i)
        .maybeSingle();

      if (clueData) {
        return supabase
          .from("clue_effectiveness")
          .update({
            times_revealed: clueData.times_revealed + 1,
            led_to_solve: clueData.led_to_solve + (isCorrect && i === cluesSeen.length - 1 ? 1 : 0)
          })
          .eq("id", clueData.id);
      } else {
        return supabase.from("clue_effectiveness").insert({
          mystery_id: mysteryId,
          clue_index: i,
          clue_text: clue,
          times_revealed: 1,
          led_to_solve: isCorrect && i === cluesSeen.length - 1 ? 1 : 0
        });
      }
    });

    await Promise.all(cluePromises);

    console.log("✅ Analytics recorded successfully");
  } catch (error) {
    console.error("❌ Error recording analytics:", error);
  }
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

    const { guess, answer, clues, mysteryId, userId, attemptNumber, timeElapsed } = await req.json();

    if (!guess || !answer) {
      throw new Error("Guess and answer are required");
    }

    const validation = await validateGuessWithAI(guess, answer, clues || []);

    if (mysteryId && userId) {
      await recordGuessAnalytics(supabase, {
        mysteryId,
        userId,
        guess,
        isCorrect: validation.correct,
        cluesSeen: clues || [],
        attemptNumber: attemptNumber || 1,
        timeElapsed: timeElapsed || 0
      });
    }

    return new Response(
      JSON.stringify({
        correct: validation.correct,
        confidence: validation.confidence,
        reasoning: validation.reasoning,
        guess,
        answer
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