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

CRITICAL RULES - READ CAREFULLY:
1. Choose subjects that 50-60% of educated adults would know
2. Generate EXACTLY 8 clues that progressively reveal the answer
3. Use CONCRETE, VERIFIABLE FACTS - NOT vague metaphors or poetry
4. Each clue must provide REAL information, not flowery language
5. Answer must be 1-4 words maximum
6. Make clues challenging but ALWAYS fair and factual

FORBIDDEN CLUE STYLES (DO NOT USE THESE):
❌ "fluid serpentine dance" → Instead: "Flows 692 miles through Montana and Wyoming"
❌ "transformative power" → Instead: "Carved a canyon 1,000 feet deep"
❌ "liquid highway" → Instead: "Major tributary of the Missouri River"
❌ "enduring testament" → Instead: "Established trade route since 1800s"
❌ Metaphors about "journeys", "dances", "testaments"
❌ Phrases like "could be likened to", "might be described as"
❌ Vague philosophical statements

REQUIRED CLUE STYLE:
✓ Use specific numbers, dates, measurements
✓ Name actual places, people, events
✓ State concrete facts that can be verified
✓ Be direct, not poetic
✓ Give real information, not descriptions of what it's "like"

CATEGORY DEFINITIONS - ULTRA STRICT:

PERSON: Historical figures, celebrities, scientists, artists, athletes, leaders
  ✅ ALLOWED: Individual human beings only
  ❌ NEVER: Groups, bands, fictional characters, brands

PLACE: Natural geographic features ONLY
  ✅ ALLOWED: Rivers, oceans, seas, lakes, deserts, forests, valleys, reefs, canyons, plateaus
  ✅ ALSO ALLOWED: Mountains, volcanoes, islands, glaciers, waterfalls
  ❌ NEVER: Cities, countries, buildings, man-made structures

THING: Physical objects, structures, artworks, inventions
  ✅ ALLOWED: Buildings, towers, bridges, monuments, vehicles, devices, paintings, sculptures
  ❌ NEVER: Abstract concepts, emotions, events

CLUE PROGRESSION FORMULA for ${category}:

Clue 1: Time period or era (factual, not metaphorical)
  ❌ BAD: "Born from a region known for geologic activity"
  ✅ GOOD: "Named by fur trappers in the early 1800s"
  ✅ GOOD: "First mapped by the Lewis and Clark expedition in 1806"

Clue 2: Geographic region or location (specific)
  ❌ BAD: "Its journey could be likened to a serpentine dance"
  ✅ GOOD: "Begins in northwestern Wyoming near the Continental Divide"
  ✅ GOOD: "Flows through Montana and North Dakota"

Clue 3: Physical characteristics (measurements, numbers)
  ❌ BAD: "An enduring testament to the transformative power of water"
  ✅ GOOD: "Stretches 692 miles from source to mouth"
  ✅ GOOD: "Carved a canyon with walls reaching 1,200 feet high"

Clue 4: Associated features or landmarks (name them!)
  ❌ BAD: "Associated with a large mammal of the deer family"
  ✅ GOOD: "Flows through the national park known for Old Faithful geyser"
  ✅ GOOD: "Passes through Paradise Valley in Montana"

Clue 5: Historical significance (specific events/dates)
  ❌ BAD: "Witnessed the relentless march of American expansion"
  ✅ GOOD: "Site of fur trading posts established in the 1820s"
  ✅ GOOD: "Used by Native American tribes for thousands of years"

Clue 6: Notable features or facts (concrete details)
  ❌ BAD: "Its anatomy features a major division called 'the Grand'"
  ✅ GOOD: "Features a dramatic waterfall dropping 308 feet"
  ✅ GOOD: "Home to the Grand Canyon of [location]"

Clue 7: Connections or relationships (name them specifically)
  ❌ BAD: "Ends in a body not quite fresh, yet not quite salty"
  ✅ GOOD: "Joins the Missouri River near the Montana-North Dakota border"
  ✅ GOOD: "Largest tributary of the Missouri River system"

Clue 8: Direct identifying information (very specific)
  ❌ BAD: "North American liquid highway through land of geysers"
  ✅ GOOD: "Longest undammed river in the contiguous United States"
  ✅ GOOD: "Named for the yellow sandstone cliffs along its banks"

EXAMPLES OF EXCELLENT CLUES:

For "Yellowstone River":
1. "Named by French trappers for its distinctive yellow-colored rocks"
2. "Originates in the Absaroka Range of northwestern Wyoming"
3. "Flows 692 miles before joining another major river"
4. "Runs through America's first national park, established 1872"
5. "Features the Lower Falls, dropping 308 feet into a canyon"
6. "The Grand Canyon section has walls 1,200 feet deep"
7. "Largest undammed river in the contiguous 48 states"
8. "Joins the Missouri River in western North Dakota"

For "Eiffel Tower":
1. "Completed in 1889 as the entrance arch to a world's fair"
2. "Designed by an engineer known for iron railway bridges"
3. "Stands 1,083 feet tall including its antenna"
4. "Made of 18,038 pieces of puddle iron held by 2.5 million rivets"
5. "Located on the Champ de Mars in a European capital"
6. "Was the world's tallest structure for 41 years"
7. "Painted every 7 years with 60 tons of paint"
8. "Iron lattice tower on the Left Bank of the Seine"

For "Marie Curie":
1. "Born in Warsaw, Poland in 1867"
2. "Moved to Paris in 1891 to study at the Sorbonne"
3. "First woman to win a Nobel Prize, awarded in 1903"
4. "Discovered two radioactive elements: polonium and radium"
5. "Only person to win Nobel Prizes in two different sciences"
6. "Conducted research in a converted shed in Paris"
7. "Died in 1934 from aplastic anemia caused by radiation exposure"
8. "Polish-French physicist who pioneered radioactivity research"

QUALITY CHECKLIST - Every clue must pass:
□ Contains at least ONE concrete fact (number, date, name, measurement)
□ Can be verified in an encyclopedia or Wikipedia
□ Provides new information, not just rephrasing
□ No metaphors or "poetic" language
□ No phrases like "could be described as" or "might be called"
□ Directly states facts, doesn't hint at them vaguely
□ A person hearing this clue learns something specific

Return ONLY valid JSON:
{
  "answer": "exact answer (1-4 words)",
  "category": "${category}",
  "difficulty": "medium",
  "clues": ["clue1", "clue2", "clue3", "clue4", "clue5", "clue6", "clue7", "clue8"],
  "funFact": "surprising lesser-known fact with specific details"
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
      temperature: 0.85,
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

      // NEW: Ban overly poetic/vague phrases
      const vaguePoetryPhrases = [
        'could be likened to',
        'might be described as',
        'testament to',
        'enduring legacy',
        'transformative power',
        'serpentine dance',
        'liquid highway',
        'journey across',
        'born from',
        'witness to',
        'march of',
        'anatomy features'
      ];

      const allText = mystery.clues.join(' ').toLowerCase();

      // Check banned phrases
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

      // NEW: Check for vague poetry
      let hasVaguePoetry = false;
      for (const vague of vaguePoetryPhrases) {
        if (allText.includes(vague.toLowerCase())) {
          console.log(`⚠️ Attempt ${attempts}: Too poetic/vague: "${vague}"`);
          hasVaguePoetry = true;
          break;
        }
      }

      if (hasVaguePoetry) {
        if (attempts >= maxAttempts) {
          throw new Error('Generated puzzle is too metaphorical - retry with concrete facts');
        }
        continue;
      }

      // NEW: Verify clues have concrete information
      let concreteFactCount = 0;
      const concreteIndicators = [
        /\d+/, // Contains numbers
        /\b(19|20)\d{2}\b/, // Contains years
        /\b(feet|miles|meters|kilometers|inches|pounds|tons)\b/i, // Contains measurements
        /\b(first|second|third|largest|smallest|tallest|longest)\b/i, // Contains superlatives with facts
        /\b(named|called|known as)\b/i, // Contains naming
        /\b(located|situated|found|stands|flows|runs)\b/i // Contains specific location verbs
      ];

      for (const clue of mystery.clues) {
        for (const indicator of concreteIndicators) {
          if (indicator.test(clue)) {
            concreteFactCount++;
            break;
          }
        }
      }

      if (concreteFactCount < 5) {
        console.log(`⚠️ Attempt ${attempts}: Not enough concrete facts. Only ${concreteFactCount} of 8 clues have verifiable information`);
        if (attempts >= maxAttempts) {
          throw new Error('Puzzle lacks concrete facts - needs more specific information');
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

      console.log(`✅ Quality check passed: ${concreteFactCount} clues with concrete facts`);
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