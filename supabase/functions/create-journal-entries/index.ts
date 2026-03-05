import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Accounting rules for double-entry bookkeeping
function resolveAccounts(tx: any): { debit_account: string; credit_account: string } {
  const type = tx.transaction_type as string;
  const amount = Number(tx.amount);
  const isAbono = amount > 0; // positive = income/abono

  switch (type) {
    case "venta":
      // Sale/Income: Debit Bank → Credit Revenue
      return { debit_account: "1-1-01", credit_account: tx.account_credit || "4-1-01" };

    case "gasto":
      // Operational expense: Debit Expense → Credit Bank
      return { debit_account: tx.account_debit || "5-1-01", credit_account: "1-1-01" };

    case "inversion":
      // Investment/Asset purchase: Debit Asset → Credit Bank
      return { debit_account: tx.account_debit || "1-2-01", credit_account: "1-1-01" };

    case "nomina":
      // Payroll: Debit Salaries → Credit Bank
      return { debit_account: "5-2-01", credit_account: "1-1-01" };

    case "impuesto":
      // Tax (IVA/PPM): Debit Tax liability → Credit Bank
      return { debit_account: tx.account_debit || "2-1-01", credit_account: "1-1-01" };

    case "transferencia":
      // Transfer between banks: Debit Destination Bank → Credit Origin Bank
      return {
        debit_account: tx.account_debit || "1-1-02",
        credit_account: tx.account_credit || "1-1-01",
      };

    default:
      // Fallback: use AI-suggested accounts or generic
      if (isAbono) {
        return { debit_account: tx.account_debit || "1-1-01", credit_account: tx.account_credit || "4-1-99" };
      }
      return { debit_account: tx.account_debit || "5-1-99", credit_account: tx.account_credit || "1-1-01" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
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

    // Validate token — accept service role key (internal) or user JWT
    const token = authHeader.replace("Bearer ", "");
    if (token !== serviceRoleKey) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { error: claimsError } = await authClient.auth.getClaims(token);
      if (claimsError) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { transactions } = await req.json();
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: "transactions array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current year and next correlative number
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
      const { debit_account, credit_account } = resolveAccounts(tx);

      const record = {
        transaction_id: tx.id,
        journal_date: tx.transaction_date,
        entry_number: entryNumber,
        debit_account,
        credit_account,
        amount: Math.abs(Number(tx.amount)),
        cost_center_id: tx.cost_center_id,
        description: tx.description_normalized || tx.description_bank || "Asiento automático",
        created_by_agent: true,
      };

      const { data, error } = await supabase
        .from("finance_journal_entries")
        .insert(record)
        .select("id, entry_number, debit_account, credit_account, amount")
        .single();

      if (error) {
        errors.push(`Entry for tx ${tx.id}: ${error.message}`);
      } else {
        entries.push(data);
        nextNumber++;
      }
    }

    return new Response(
      JSON.stringify({ created: entries.length, entries, errors }),
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
