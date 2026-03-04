import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch unprocessed memory entries (limit to batch of 10)
    const { data: pendingEntries, error: fetchError } = await supabase
      .from("holding_collective_memory")
      .select("*")
      .eq("is_processed", false)
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) throw fetchError;

    if (!pendingEntries || pendingEntries.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending entries to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processedIds: string[] = [];

    for (const entry of pendingEntries) {
      try {
        // Skip if no content
        if (!entry.original_content || entry.original_content.trim().length < 50) {
          await supabase
            .from("holding_collective_memory")
            .update({ 
              is_processed: true, 
              processed_at: new Date().toISOString(),
              processed_summary: "Contenido insuficiente para procesar"
            })
            .eq("id", entry.id);
          continue;
        }

        // Process with AI to extract key concepts and summary
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Eres un sistema de procesamiento de conocimiento corporativo. Tu tarea es analizar contenido y extraer:
1. Un resumen conciso (máximo 300 palabras)
2. Conceptos clave (lista de 3-10 términos importantes)
3. Etiquetas relevantes para categorización
4. Puntuación de importancia (1-10)

Responde SOLO en formato JSON válido:
{
  "summary": "resumen del contenido",
  "key_concepts": ["concepto1", "concepto2", ...],
  "tags": ["tag1", "tag2", ...],
  "importance": 5
}`
              },
              {
                role: "user",
                content: `Analiza el siguiente contenido de tipo "${entry.source_type}":\n\nTítulo: ${entry.title || "Sin título"}\n\nContenido:\n${entry.original_content.slice(0, 8000)}`
              }
            ],
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI processing failed for ${entry.id}:`, await aiResponse.text());
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;

        if (!content) {
          console.error(`No AI content for ${entry.id}`);
          continue;
        }

        // Parse AI response
        let parsed;
        try {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found");
          }
        } catch (parseError) {
          console.error(`Failed to parse AI response for ${entry.id}:`, parseError);
          // Still mark as processed with basic info
          parsed = {
            summary: content.slice(0, 500),
            key_concepts: [],
            tags: [],
            importance: 5
          };
        }

        // Update the memory entry with processed data
        const { error: updateError } = await supabase
          .from("holding_collective_memory")
          .update({
            processed_summary: parsed.summary,
            key_concepts: parsed.key_concepts || [],
            tags: parsed.tags || [],
            importance_score: Math.min(10, Math.max(1, parsed.importance || 5)),
            embeddings_text: `${entry.title || ""} ${parsed.summary} ${(parsed.key_concepts || []).join(" ")}`,
            is_processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        if (updateError) {
          console.error(`Failed to update ${entry.id}:`, updateError);
          continue;
        }

        processedIds.push(entry.id);
      } catch (entryError) {
        console.error(`Error processing entry ${entry.id}:`, entryError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Processing complete", 
        processed: processedIds.length,
        total_pending: pendingEntries.length,
        processed_ids: processedIds
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process collective memory error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
