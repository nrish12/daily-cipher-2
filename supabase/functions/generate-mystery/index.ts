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

  const prompt = `You are an expert puzzle designer creating CHALLENGING mystery games for experienced players.${adaptiveInstructions}

CRITICAL RULES:
1. Choose subjects that only 30-40% of educated adults would know (DIFFICULT level)
2. Generate EXACTLY 8 clues that progressively reveal the answer
3. NEVER use the most famous/iconic fact about the subject
4. Clues 1-6 should be EXTREMELY CRYPTIC and require deep thinking/research
5. Only clues 7-8 can be more direct hints
6. Answer must be 1-4 words maximum
7. Avoid the most obvious/famous subjects - be creative and unique
8. BANNED: Einstein, Freud, Eiffel Tower, Great Barrier Reef, Mona Lisa, Beatles, Shakespeare

CATEGORY DEFINITIONS - ULTRA STRICT - NO EDGE CASES:

PERSON: Historical figures, celebrities, scientists, artists (MUST BE CHALLENGING)
  ✅ ALLOWED: Lesser-known scientists, obscure historical figures, underrated artists, niche inventors
  ❌ NEVER:
    - Groups (Beatles), fictional characters, brands named after people
    - Obvious choices: Einstein, Freud, Tesla, Edison, Da Vinci, Picasso, Mozart
    - Anyone in top 50 most famous people lists
  🎲 IMPORTANT: Pick OBSCURE but still verifiable historical figures

PLACE: Bodies of water, deserts, forests, plains ONLY (MUST BE CHALLENGING)
  ✅ ALLOWED: Lesser-known rivers, obscure seas, remote deserts, specific forest regions, unique valleys
  ❌ NEVER:
    - Volcanoes → THING
    - Mountains → THING
    - Cities, countries → Too broad
    - Man-made structures → THING
    - Obvious places: Great Barrier Reef, Amazon Rainforest, Sahara, Pacific Ocean, Grand Canyon
  🎲 IMPORTANT: Pick OBSCURE natural locations that require real geography knowledge

THING: Physical objects you can touch or see (MUST BE CHALLENGING)
  ✅ ALLOWED:
    - Lesser-known inventions, obscure historical devices, niche tools
    - Specific artworks beyond the famous ones
    - Specific natural formations (not the most famous ones)
    - Historical artifacts, unique structures
  ❌ NEVER:
    - Concepts, emotions, events, abstract ideas
    - Obvious choices: Eiffel Tower, Statue of Liberty, Great Wall, Taj Mahal, Mona Lisa
    - The first/most famous invention of anything
  🎲 IMPORTANT: Pick OBSCURE but verifiable physical objects

BANNED PHRASES (never use these iconic facts):
- Van Gogh: "cut his ear", "lost an ear", "ear incident"
- Einstein: "tongue out", "stuck tongue", "E=mc²" (too early in clues)
- Mona Lisa: "no eyebrows"
- Shakespeare: "to be or not to be"
- Any instantly recognizable catchphrase

DIFFICULTY LEVEL: VERY HARD - FOR EXPERIENCED PLAYERS
Make players REALLY THINK and RESEARCH. Early clues should be nearly impossible without deep knowledge.
The answer should NOT be guessable until clue 6 or 7 at minimum.

CLUE PROGRESSION (8 clues for ${category}):
Clue 1: EXTREMELY vague era/context (almost impossible)
  Example: "Born in an age when empires crumbled and new orders rose" NOT "lived in the 1800s"
  Make it SO cryptic that it could apply to many subjects

Clue 2: Indirect field reference (metaphorical)
  Example: "Manipulated perception through visual composition" NOT "was a painter"
  Use metaphors, avoid direct job titles

Clue 3: Abstract legacy (philosophical)
  Example: "Left behind work that challenged conventional boundaries" NOT "influenced artists"
  Keep it broad and conceptual

Clue 4: Obscure association (requires knowledge)
  Example: "Connected to a southern French institution for the troubled" NOT "was in an asylum"
  Use indirect references

Clue 5: Technical detail (for knowledgeable players)
  Example: "Employed techniques involving thick application and bold color choices" NOT "used thick paint"
  Describe without naming the technique

Clue 6: Lesser-known fact (surprising detail)
  Example: "Produced an extraordinary volume of work in under a decade" NOT "created 900 paintings"
  Share unusual facts that aren't the famous ones

Clue 7: Relationship clue (inferential)
  Example: "Relied on family support from a sibling in the art trade" NOT "brother Theo supported him"
  Make connections subtle

Clue 8: Strong hint (nationality + field + era)
  Example: "Northern European creative who worked extensively in southern France" NOT "Dutch post-impressionist"
  Give solid direction but still require thinking

CRITICAL: Make clues 1-5 HARD. Only clues 6-8 should be more direct.

GOOD vs BAD EXAMPLES:
BAD (too easy): "lost an ear" "painted in France" "was a Dutch painter"
GOOD (right level): "experienced personal tragedy affecting their physical form" "relocated to Mediterranean climate" "originated from Low Countries"

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
          content: "You are a mystery puzzle generator creating CHALLENGING but FAIR puzzles. Make early clues cryptic. Respond only with valid JSON, no markdown, no explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 1.0,
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

    let mystery;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Generation attempt ${attempts}/${maxAttempts}`);

      mystery = await generateMysteryWithAI(category, latestInsights);

      const bannedPhrases = [
        'cut his ear', 'lost an ear', 'ear incident',
        'stuck tongue', 'tongue out', 'tongue photo',
        'no eyebrow', 'eyebrows',
        'to be or not to be',
        'e=mc²', 'e=mc2', 'relativity equation'
      ];

      const bannedSubjects = [
        'einstein', 'albert einstein', 'freud', 'sigmund freud',
        'tesla', 'nikola tesla', 'edison', 'thomas edison',
        'da vinci', 'leonardo da vinci', 'picasso', 'pablo picasso',
        'mozart', 'beethoven', 'shakespeare', 'william shakespeare',
        'eiffel tower', 'statue of liberty', 'great wall', 'taj mahal',
        'great barrier reef', 'amazon rainforest', 'amazon', 'sahara', 'sahara desert',
        'mona lisa', 'starry night', 'the scream', 'last supper',
        'beatles', 'the beatles', 'sphinx', 'sphinx of giza'
      ];

      const answerLower = mystery.answer.toLowerCase();
      let isBanned = false;

      for (const banned of bannedSubjects) {
        if (answerLower.includes(banned) || banned.includes(answerLower)) {
          console.log(`⚠️ Attempt ${attempts}: Rejected banned subject "${mystery.answer}"`);
          isBanned = true;
          break;
        }
      }

      if (isBanned) {
        if (attempts >= maxAttempts) {
          throw new Error('Failed to generate acceptable mystery after max attempts');
        }
        continue;
      }

      const allText = mystery.clues.join(' ').toLowerCase();
      let hasBannedPhrase = false;

      for (const banned of bannedPhrases) {
        if (allText.includes(banned.toLowerCase())) {
          console.log(`⚠️ Attempt ${attempts}: Rejected banned phrase "${banned}"`);
          hasBannedPhrase = true;
          break;
        }
      }

      if (hasBannedPhrase) {
        if (attempts >= maxAttempts) {
          throw new Error('Failed to generate acceptable mystery after max attempts');
        }
        continue;
      }

      if (mystery.answer.split(' ').length > 4) {
        console.log(`⚠️ Attempt ${attempts}: Answer too long (${mystery.answer})`);
        if (attempts >= maxAttempts) {
          throw new Error('Answer too long (max 4 words)');
        }
        continue;
      }

      console.log(`✅ Accepted mystery: ${mystery.answer}`);
      break;
    }

    if (!mystery) {
      throw new Error('Failed to generate mystery');
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("mysteries")
      .select("*")
      .eq("date", today)
      .eq("category", mystery.category)
      .maybeSingle();

    if (existing) {
      console.log(`⚠️ Mystery already exists for ${mystery.category} on ${today}, returning existing one`);
      return new Response(
        JSON.stringify(existing),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("mysteries")
      .insert({
        category: mystery.category,
        difficulty: mystery.difficulty,
        answer: mystery.answer,
        clues: mystery.clues,
        fun_fact: mystery.funFact,
        date: today,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        console.log(`⚠️ Race condition detected, fetching existing mystery`);
        const { data: raceExisting } = await supabase
          .from("mysteries")
          .select("*")
          .eq("date", today)
          .eq("category", mystery.category)
          .single();

        if (raceExisting) {
          return new Response(
            JSON.stringify(raceExisting),
            {
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }
      }
      throw insertError;
    }

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