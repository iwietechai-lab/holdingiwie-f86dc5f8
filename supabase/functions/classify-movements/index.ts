import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres el agente financiero del holding iwie.
Centros de costo disponibles:
CC-01 iwie-holding (dirección general),
CC-02 iwie-drones (operaciones comerciales y de vuelo),
CC-03 iwie-agro (operaciones agrícolas),
CC-04 iwie-factory (I+D+I y manufactura),
CC-05 iwie-energy (energía renovable),
CC-06 iwie-legal (asesorías legales),
CC-07 iwie-motors (automotriz),
CC-08 beeflee (ganadería/agroindustria),
CC-09 udelem (educación/formación),
CC-10 busIA (transporte inteligente),
CC-11 aipasajes (pasajes y viajes IA),
CC-12 iwie-tech (tecnología y desarrollo),
CC-13 iwie-link (conectividad y redes),
CC-14 gestion-ai (gestión empresarial IA),
CC-15 Compartido (gastos transversales).

Para cada movimiento retorna JSON con:
cost_center_id, transaction_type (gasto|venta|inversion|transferencia|nomina|impuesto|otro),
account_debit, account_credit, description_normalized, confidence_score (0.0-1.0).
Responde SOLO con un array JSON, sin texto adicional.`;

interface BankMovement {
  document_number: string;
  description: string;
  amount: number;
  type: "cargo" | "abono";
  date: string;
}

interface ClassifiedMovement {
  cost_center_id: string;
  transaction_type: string;
  account_debit: string;
  account_credit: string;
  description_normalized: string;
  confidence_score: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Admin client for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user's company_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("id", userId)
      .single();

    const companyId = profile?.company_id;

    // 2. Parse input
    const { movements } = (await req.json()) as { movements: BankMovement[] };
    if (!movements || !Array.isArray(movements) || movements.length === 0) {
      return new Response(
        JSON.stringify({ error: "movements array is required and must not be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Call AI for classification via Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `Clasifica los siguientes movimientos bancarios:\n${JSON.stringify(movements, null, 2)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI classification failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.choices?.[0]?.message?.content ?? "[]";

    // Extract JSON array from response (handle markdown code blocks)
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let classified: ClassifiedMovement[];
    try {
      classified = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("AI returned invalid JSON");
    }

    if (classified.length !== movements.length) {
      console.warn(`AI returned ${classified.length} items for ${movements.length} movements`);
    }

    // 4. Insert into finance_bank_transactions
    let processed = 0;
    let requiresReview = 0;
    const errors: string[] = [];
    const processedTransactions: any[] = [];

    for (let i = 0; i < movements.length; i++) {
      const mov = movements[i];
      const cls = classified[i];

      if (!cls) {
        errors.push(`Movement ${i} (${mov.document_number}): no classification returned`);
        continue;
      }

      const status = cls.confidence_score < 0.7 ? "requiere_revision" : "procesado";
      const amount = mov.type === "cargo" ? -Math.abs(mov.amount) : Math.abs(mov.amount);

      const record = {
        company_id: companyId,
        cost_center_id: cls.cost_center_id,
        transaction_date: mov.date,
        amount,
        description_bank: mov.description,
        description_normalized: cls.description_normalized,
        transaction_type: cls.transaction_type,
        account_debit: cls.account_debit,
        account_credit: cls.account_credit,
        status,
        confidence_score: cls.confidence_score,
        document_number: mov.document_number,
        processed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("finance_bank_transactions")
        .insert(record)
        .select("id")
        .single();

      if (error) {
        errors.push(`Movement ${mov.document_number}: ${error.message}`);
        continue;
      }

      if (status === "procesado") {
        processed++;
      } else {
        requiresReview++;
      }

      processedTransactions.push({ ...record, id: data.id });
    }

    // 5. Call create-journal-entries for processed transactions
    if (processedTransactions.length > 0) {
      try {
        const journalResponse = await fetch(`${supabaseUrl}/functions/v1/create-journal-entries`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transactions: processedTransactions }),
        });

        if (!journalResponse.ok) {
          const errText = await journalResponse.text();
          console.error("Journal entries error:", errText);
          errors.push(`Journal entries creation had issues: ${errText}`);
        }
      } catch (e) {
        console.error("Failed to call create-journal-entries:", e);
        errors.push(`Failed to create journal entries: ${e.message}`);
      }
    }

    // 6. Return summary
    return new Response(
      JSON.stringify({ processed, requires_review: requiresReview, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("classify-movements error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
