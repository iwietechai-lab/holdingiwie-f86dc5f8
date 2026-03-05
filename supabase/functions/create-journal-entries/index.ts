import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: accept service role key (internal call) or user JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { transactions } = await req.json();
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: "transactions array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current year and next entry number
    const year = new Date().getFullYear();
    const prefix = `ASIENTO-${year}-`;

    const { data: lastEntry } = await supabase
      .from("finance_journal_entries")
      .select("entry_number")
      .like("entry_number", `${prefix}%`)
      .order("entry_number", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastEntry?.entry_number) {
      const lastNum = parseInt(lastEntry.entry_number.replace(prefix, ""), 10);
      if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    const entries: any[] = [];
    const errors: string[] = [];

    for (const tx of transactions) {
      const entryNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

      const record = {
        transaction_id: tx.id,
        journal_date: tx.transaction_date,
        entry_number: entryNumber,
        debit_account: tx.account_debit,
        credit_account: tx.account_credit,
        amount: Math.abs(tx.amount),
        cost_center_id: tx.cost_center_id,
        description: tx.description_normalized || tx.description_bank,
        created_by_agent: true,
      };

      const { error } = await supabase.from("finance_journal_entries").insert(record);

      if (error) {
        errors.push(`Entry for tx ${tx.id}: ${error.message}`);
      } else {
        entries.push(entryNumber);
        nextNumber++;
      }
    }

    return new Response(
      JSON.stringify({ created: entries.length, entry_numbers: entries, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-journal-entries error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
