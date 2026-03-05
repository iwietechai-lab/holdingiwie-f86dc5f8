import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { messages } = await req.json();

    // Fetch financial context
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = now.toISOString().split('T')[0];

    const [txResult, ccResult] = await Promise.all([
      supabase.from("finance_bank_transactions").select("*").gte("transaction_date", monthStart).order("transaction_date", { ascending: false }).limit(200),
      supabase.from("finance_cost_centers").select("*").eq("is_active", true),
    ]);

    const txns = txResult.data || [];
    const centers = ccResult.data || [];

    // Build context summary
    const ingresos = txns.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0);
    const egresos = txns.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

    const byCC: Record<string, { ing: number; eg: number }> = {};
    txns.forEach((t: any) => {
      const cc = t.cost_center_id || 'Sin CC';
      if (!byCC[cc]) byCC[cc] = { ing: 0, eg: 0 };
      if (t.amount > 0) byCC[cc].ing += t.amount;
      else byCC[cc].eg += Math.abs(t.amount);
    });

    const ccSummary = Object.entries(byCC).map(([cc, v]) =>
      `${cc}: Ingresos $${Math.round(v.ing).toLocaleString()}, Egresos $${Math.round(v.eg).toLocaleString()}`
    ).join('\n');

    const systemPrompt = `Eres el agente financiero del holding iwie. Responde en español.
Hoy es ${today}. Datos del mes actual (desde ${monthStart}):
- Total ingresos: $${Math.round(ingresos).toLocaleString()}
- Total egresos: $${Math.round(egresos).toLocaleString()}
- Saldo neto: $${Math.round(ingresos - egresos).toLocaleString()}
- ${txns.length} movimientos registrados

Desglose por centro de costo:
${ccSummary}

Centros de costo: ${centers.map((c: any) => `${c.code} ${c.name}`).join(', ')}

Responde con análisis financiero preciso basado en los datos. Usa formato markdown con tablas cuando sea apropiado.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, intenta en un momento" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const result = await aiResponse.json();
    const reply = result.choices?.[0]?.message?.content || "No pude generar una respuesta.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("finance-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
