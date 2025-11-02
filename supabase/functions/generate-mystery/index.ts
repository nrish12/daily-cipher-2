import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function generateMysteryWithAI(category: string, learningInsights?: any) {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    throw new Error("OpenAI API key not configured");
  }

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

  const prompt = `You are an expert puzzle designer creating clever, fair mystery games.${adaptiveInstructions}

CRITICAL RULES:
1. Choose subjects that 60-70% of educated adults would know
2. Generate EXACTLY 8 clues that progressively reveal the answer
3. NEVER use the most famous/iconic fact about the subject
4. Use concrete, verifiable facts - NOT vague metaphors
5. Answer must be 1-4 words maximum

CATEGORY DEFINITIONS - ULTRA STRICT - NO EDGE CASES:

PERSON: Historical figures, celebrities, scientists, artists
  ✅ ALLOWED: Scientists, musicians, painters, actors, inventors, historical leaders, athletes
  ❌ NEVER: Groups (Beatles), fictional characters, brands named after people
  🎲 IMPORTANT: Pick someone UNIQUE and DIFFERENT each time - avoid repeating subjects

PLACE: Bodies of water, deserts, forests, plains ONLY
  ✅ ALLOWED: Rivers, oceans, seas, lakes, deserts, forests, plains, reefs, valleys
  ❌ NEVER:
    - Volcanoes → THING
    - Mountains → THING
    - Cities, countries → Too broad
    - Man-made structures → THING
  🎲 IMPORTANT: Pick a UNIQUE location each time - be creative

THING: Physical objects you can touch or see
  ✅ ALLOWED:
    - Inventions (modern/historical devices, vehicles, tools)
    - Structures (towers, bridges, buildings, monuments, landmarks)
    - Art (famous paintings, sculptures)
    - Natural formations (mountains, volcanoes, canyons, caves)
  ❌ NEVER: Concepts, emotions, events, abstract ideas
  🎲 IMPORTANT: Pick something UNIQUE each time - be creative and varied

BANNED PHRASES (never use these iconic facts):
- Van Gogh: "cut his ear", "lost an ear", "ear incident"
- Einstein: "tongue out", "stuck tongue", "E=mc²" (too early in clues)
- Mona Lisa: "no eyebrows"
- Shakespeare: "to be or not to be"
- Any instantly recognizable catchphrase

CLUE PROGRESSION (8 clues for ${category}):
Clue 1: Time period OR geographic region (indirect)
  Example: "Active during Europe's industrial transformation" NOT "lived in 1800s"

Clue 2: Professional field OR medium (cryptic)
  Example: "Worked with pigment and canvas under southern sun" NOT "was a painter"

Clue 3: Cultural impact (vague but concrete)
  Example: "Influenced a generation of artists who followed" NOT "changed art forever"

Clue 4: Associated location OR context (specific but not obvious)
  Example: "Spent significant time in Provence asylum" NOT "lived in Arles"

Clue 5: Working style OR method (concrete detail)
  Example: "Applied paint thickly, sometimes directly from tube" NOT "used impasto"

Clue 6: Related achievement (lesser-known)
  Example: "Created over 900 paintings in just 10 years" NOT "painted Starry Night"

Clue 7: Personal detail (specific but requires deduction)
  Example: "Brother Theo financially supported his career" NOT "was poor"

Clue 8: Final strong hint (very specific, almost there)
  Example: "Dutch post-impressionist who worked in France" NOT "painted sunflowers"

GOOD vs BAD EXAMPLES:
BAD: "Prismatic transformation" "lived in blue" "lost an ear"
GOOD: "Moved to southern France in 1888" "hospitalized in Saint-Rémy" "brother was art dealer"

Return ONLY valid JSON:
{
  "answer": "exact answer (1-4 words)",
  "category": "${category}",
  "difficulty": "medium",
  "clues": ["clue1", "clue2", "clue3", "clue4", "clue5", "clue6", "clue7", "clue8"],
  "funFact": "surprising lesser-known fact"
}`;

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
          content: "You are a mystery puzzle generator. Respond only with valid JSON, no markdown, no explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  return JSON.parse(jsonStr);
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

    const { category, userId } = await req.json();

    if (!category) {
      throw new Error("Category is required");
    }

    console.log(`Generating ${category} mystery for user ${userId}`);

    const { data: latestInsights } = await supabase
      .from("ai_learning_insights")
      .select("*")
      .eq("applied", false)
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestInsights) {
      console.log("📊 Using AI learning insights from:", latestInsights.analyzed_at);
    }

    const mystery = await generateMysteryWithAI(category, latestInsights);

    const bannedPhrases = [
      'cut his ear', 'lost an ear', 'ear incident',
      'stuck tongue', 'tongue out', 'tongue photo',
      'no eyebrow', 'eyebrows',
      'to be or not to be',
      'e=mc²', 'e=mc2', 'relativity equation'
    ];

    const allText = mystery.clues.join(' ').toLowerCase();
    for (const banned of bannedPhrases) {
      if (allText.includes(banned.toLowerCase())) {
        console.log('⚠️ Rejected puzzle containing banned phrase:', banned);
        throw new Error('Generated puzzle contains banned phrase');
      }
    }

    if (mystery.answer.split(' ').length > 4) {
      throw new Error('Answer too long (max 4 words)');
    }

    const { data: inserted, error: insertError } = await supabase
      .from("mysteries")
      .insert({
        category: mystery.category,
        difficulty: mystery.difficulty,
        answer: mystery.answer,
        clues: mystery.clues,
        fun_fact: mystery.funFact,
        date: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify(inserted),
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