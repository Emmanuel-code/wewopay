import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Caller authentication, fail closed: this endpoint moves real money,
    // so it must not be invocable by anyone holding the public anon key.
    // Set CRON_SECRET in the edge function secrets and send it as the
    // x-cron-secret header from the scheduler. Without it, refuse.
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Query all active clients due for billing today
    const { data: dueClients, error: cErr } = await supabase
      .from("clients")
      .select("*, project:projects(*)")
      .eq("status", "ACTIVE")
      .lte("next_billing_date", new Date().toISOString())
      .not("paystack_auth_code", "is", null);

    if (cErr) throw cErr;

    const results = [];

    // 2. Charge recurring authorizations
    for (const client of dueClients || []) {
      if (!client.project || !client.paystack_auth_code) continue;

      const grossAmount = Number(client.project.amount);
      const amountInSubunit = Math.round(grossAmount * 100);

      let chargeSuccess = false;
      let reference = `REC_${Math.random().toString(36).substring(2, 9).toUpperCase()}_${Date.now()}`;

      // Call Paystack charge authorization if live key exists
      if (paystackSecret && !paystackSecret.includes("xxxxxxxx")) {
        try {
          const res = await fetch("https://api.paystack.co/transaction/charge_authorization", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${paystackSecret}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              authorization_code: client.paystack_auth_code,
              email: client.email,
              amount: amountInSubunit,
              currency: client.project.currency || "GHS",
              reference,
            }),
          });
          const resJson = await res.json();
          if (resJson.status && resJson.data?.status === "success") {
            chargeSuccess = true;
            reference = resJson.data.reference || reference;
          }
        } catch (e) {
          console.error(`Charge error for client ${client.id}:`, e);
        }
      } else {
        // No usable secret key: NEVER fabricate a charge. Recording a
        // payment here without moving money would invent revenue, advance
        // the billing date, and credit the developer for nothing. Skip the
        // client and report it, so a misconfigured deploy is visible
        // instead of silently minting fake payments.
        results.push({ clientId: client.id, status: "skipped_no_key" });
        continue;
      }

      if (chargeSuccess) {
        // Use the developer's actual commission rate (PRO 1.5% / Business
        // 0.8% / Free 3.0%). The old hardcoded 3.0% overcharged the
        // platform fee — and under-credited the developer — on every
        // recurring charge for paying developers.
        const { data: dev } = await supabase
          .from("developers")
          .select("commission_rate")
          .eq("id", client.project.developer_id)
          .maybeSingle();
        const commissionRate = Number(dev?.commission_rate ?? 3.0);
        const grossInCents = Math.round(grossAmount * 100);
        const paystackFeeInCents = Math.round(grossInCents * 0.015);
        const platformFeeInCents = Math.round((grossInCents * commissionRate) / 100);
        const devAmountInCents = Math.max(0, grossInCents - paystackFeeInCents - platformFeeInCents);

        const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Advance next billing date
        const nextBilling = new Date();
        const cycle = client.project.billing_cycle;
        if (cycle === "MONTHLY") nextBilling.setMonth(nextBilling.getMonth() + 1);
        else if (cycle === "QUARTERLY") nextBilling.setMonth(nextBilling.getMonth() + 3);
        else if (cycle === "ANNUALLY") nextBilling.setFullYear(nextBilling.getFullYear() + 1);

        await supabase.rpc("record_successful_payment", {
          p_client_id: client.id,
          p_paystack_ref: reference,
          p_gross_amount: grossAmount,
          p_paystack_fee: paystackFeeInCents / 100,
          p_platform_fee: platformFeeInCents / 100,
          p_developer_amount: devAmountInCents / 100,
          p_currency: client.project.currency || "GHS",
          p_invoice_number: invNumber,
          p_paystack_customer_code: client.paystack_customer_code,
          p_subscription_code: client.subscription_code,
          p_next_billing_date: nextBilling.toISOString(),
        });

        results.push({ clientId: client.id, status: "charged", reference });
      } else {
        // Increment retry count or mark overdue
        const newRetries = (client.retry_count || 0) + 1;
        const newStatus = newRetries >= 3 ? "OVERDUE" : "ACTIVE";

        await supabase
          .from("clients")
          .update({
            retry_count: newRetries,
            status: newStatus,
          })
          .eq("id", client.id);

        results.push({ clientId: client.id, status: "failed", retries: newRetries, accountStatus: newStatus });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

