import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://holdingiwie.lovable.app',
  'https://id-preview--884c43a8-f6d4-4c81-bcd5-d38f99303288.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

let corsHeaders: Record<string, string> = {};

serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
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

    const { query, limit = 10, source_types, area_category } = await req.json();

    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ memories: [], message: "Query too short" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First, use AI to extract search terms from the query
    const searchTermsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Extrae las palabras clave más importantes de la consulta del usuario para buscar en una base de conocimiento. 
Responde SOLO con un JSON: {"keywords": ["palabra1", "palabra2", ...]}`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.1,
      }),
    });

    let searchKeywords: string[] = [];
    if (searchTermsResponse.ok) {
      const termsData = await searchTermsResponse.json();
      const termsContent = termsData.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(termsContent.match(/\{[\s\S]*\}/)?.[0] || "{}");
        searchKeywords = parsed.keywords || [];
      } catch {
        // Fallback: use query words
        searchKeywords = query.split(/\s+/).filter((w: string) => w.length > 2);
      }
    }

    // Build the search query
    let dbQuery = supabase
      .from("holding_collective_memory")
      .select("id, title, processed_summary, key_concepts, tags, area_category, source_type, importance_score, created_at")
      .eq("is_processed", true)
      .order("importance_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (source_types && source_types.length > 0) {
      dbQuery = dbQuery.in("source_type", source_types);
    }

    if (area_category) {
      dbQuery = dbQuery.eq("area_category", area_category);
    }

    // Text search using embeddings_text
    if (searchKeywords.length > 0) {
      const searchPattern = searchKeywords.join(" | ");
      dbQuery = dbQuery.or(`embeddings_text.ilike.%${searchKeywords[0]}%,title.ilike.%${searchKeywords[0]}%,processed_summary.ilike.%${searchKeywords[0]}%`);
    }

    const { data: memories, error } = await dbQuery;

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        memories: memories || [],
        keywords_used: searchKeywords,
        total: memories?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Query collective memory error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
