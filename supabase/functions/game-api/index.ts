import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const { category, userId, action, today: todayParam, categories } = await req.json();

    const today = todayParam || new Date().toISOString().split("T")[0];

    if (action === "regenerate-all") {
      console.log(`🔄 Regenerating ALL puzzles for ${today}...`);

      const { error: deleteError } = await supabase
        .from("mysteries")
        .delete()
        .eq("date", today);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw new Error(`Failed to delete puzzles: ${deleteError.message}`);
      }

      console.log(`✅ Deleted all puzzles for ${today}`);

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

      return new Response(
        JSON.stringify({ success: true, generated: results.length }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!category) {
      throw new Error("Category is required");
    }

    if (action === "regenerate") {
      console.log(`🔄 Regenerating ${category} mystery...`);

      const { error: deleteError } = await supabase
        .from("mysteries")
        .delete()
        .eq("date", today)
        .eq("category", category);

      if (deleteError) {
        console.error("Delete error:", deleteError);
      } else {
        console.log(`✅ Deleted old ${category} mystery for ${today}`);
      }
    } else {
      console.log(`Looking for ${category} mystery for ${today}`);

      const { data: existingMystery } = await supabase
        .from("mysteries")
        .select("*")
        .eq("date", today)
        .eq("category", category)
        .maybeSingle();

      if (existingMystery) {
        console.log(`✅ Found existing ${category} mystery:`, existingMystery.answer);
        return new Response(
          JSON.stringify(existingMystery),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    console.log(`No existing mystery found, generating new ${category} mystery...`);

    const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-mystery`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category, userId }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`Failed to generate mystery: ${errorText}`);
    }

    const newMystery = await generateResponse.json();
    console.log(`✅ Generated new ${category} mystery:`, newMystery.answer);

    return new Response(
      JSON.stringify(newMystery),
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