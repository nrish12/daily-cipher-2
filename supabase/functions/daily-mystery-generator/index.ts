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

    const today = new Date().toISOString().split("T")[0];
    console.log(`🌅 Daily mystery generator running for ${today}`);

    const { data: existingMysteries } = await supabase
      .from("mysteries")
      .select("category")
      .eq("date", today);

    const existingCategories = new Set(
      existingMysteries?.map((m: any) => m.category) || []
    );

    const categoriesToGenerate = ['person', 'place', 'thing'].filter(
      cat => !existingCategories.has(cat)
    );

    if (categoriesToGenerate.length === 0) {
      console.log("✅ All mysteries already generated for today");
      return new Response(
        JSON.stringify({
          success: true,
          message: "All mysteries already exist for today",
          date: today,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`📝 Generating mysteries for: ${categoriesToGenerate.join(", ")}`);

    const results = [];
    const errors = [];

    for (const category of categoriesToGenerate) {
      try {
        console.log(`Generating ${category}...`);
        const generateResponse = await fetch(
          `${supabaseUrl}/functions/v1/generate-mystery`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              category,
              userId: "system",
            }),
          }
        );

        if (generateResponse.ok) {
          const mystery = await generateResponse.json();
          results.push({
            category,
            answer: mystery.answer,
            success: true,
          });
          console.log(`✅ Generated ${category}: ${mystery.answer}`);
        } else {
          const errorText = await generateResponse.text();
          errors.push({ category, error: errorText });
          console.error(`❌ Failed to generate ${category}: ${errorText}`);
        }
      } catch (error) {
        errors.push({ category, error: error.message });
        console.error(`❌ Error generating ${category}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        generated: results,
        errors: errors.length > 0 ? errors : undefined,
        message: `Generated ${results.length} mysteries for ${today}`,
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
