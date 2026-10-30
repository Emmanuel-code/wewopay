import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Verify a client payment server-side and record it.
 *
 * Why this exists: the public checkout page runs as anon, and migration
 * 00004 revoked anon's execute on record_successful_payment (service_role
 * only) to stop ledger manipulation. So the checkout callback can no longer
 * record payments directly — and must not be given that power back.
 *
 * Instead, this function verifies the Paystack reference against Paystack's
 * API with the secret key, checks the amount/currency/email against the
 * project and client, and only then records the payment with the service
 * role (which 00004 still allows). A fake or mismatched reference records
 * nothing. The underlying RPC is idempotent on paystack_ref, so retries
 * and duplicate callbacks cannot double-credit.
 *
 * Env required (same secrets the paystack-webhook already uses):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY
 * NOTE: the secret key must match the transaction's mode — the TEST secret
 * verifies test transactions, the LIVE secret verifies live ones.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !paystackSecret) {
      console.error("FATAL: missing edge function secrets");
      return new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference, client_id } = await req.json();
    if (!reference || !client_id) {
      return new Response(JSON.stringify({ error: "reference and client_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load client + project + developer (service role bypasses RLS).
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("*, project:projects(*)")
      .eq("id", client_id)
      .maybeSingle();
    if (clientErr || !client || !client.project) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const project = client.project;
    const { data: developer } = await supabase
      .from("developers")
      .select("commission_rate")
      .eq("id", project.developer_id)
      .maybeSingle();
    const commissionRate = Number(developer?.commission_rate ?? 3.0);

    // 1. Verify the transaction with Paystack itself.
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } },
    );
    const verifyJson = await verifyRes.json();
    const tx = verifyJson?.data;
    if (!verifyRes.ok || !tx || tx.status !== "success") {
      console.error("Paystack verification failed for", reference, verifyJson?.message);
      return new Response(JSON.stringify({ error: "Payment could not be verified with Paystack" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Amount and currency must match the project exactly (subunits).
    const expectedSubunits = Math.round(Number(project.amount) * 100);
    if (Number(tx.amount) !== expectedSubunits || (tx.currency || project.currency) !== project.currency) {
      console.error("Amount/currency mismatch for", reference, tx.amount, tx.currency, "expected", expectedSubunits, project.currency);
      return new Response(JSON.stringify({ error: "Payment amount does not match this project" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Customer email must match the client, when Paystack reports one.
    const txEmail = tx.customer?.email ? String(tx.customer.email).toLowerCase() : null;
    if (txEmail && client.email && txEmail !== String(client.email).toLowerCase()) {
      console.error("Customer email mismatch for", reference, txEmail, client.email);
      return new Response(JSON.stringify({ error: "Payment does not belong to this client" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Splits, computed server-side from the project (never from the client).
    const grossInCents = expectedSubunits;
    const paystackFeeInCents = Math.round(grossInCents * 0.015);
    const platformFeeInCents = Math.round((grossInCents * commissionRate) / 100);
    const devAmountInCents = Math.max(0, grossInCents - paystackFeeInCents - platformFeeInCents);

    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nextBilling = new Date();
    const cycle = project.billing_cycle;
    if (cycle === "MONTHLY") nextBilling.setMonth(nextBilling.getMonth() + 1);
    else if (cycle === "QUARTERLY") nextBilling.setMonth(nextBilling.getMonth() + 3);
    else if (cycle === "ANNUALLY") nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    const nextDate = cycle === "ONE_TIME" ? null : nextBilling.toISOString();

    // 5. Record atomically (service role — allowed by 00004; idempotent on ref).
    const { data: rpcResult, error: rpcError } = await supabase.rpc("record_successful_payment", {
      p_client_id: client.id,
      p_paystack_ref: reference,
      p_gross_amount: Number(project.amount),
      p_paystack_fee: paystackFeeInCents / 100,
      p_platform_fee: platformFeeInCents / 100,
      p_developer_amount: devAmountInCents / 100,
      p_currency: project.currency,
      p_invoice_number: invNumber,
      p_paystack_customer_code: tx.customer?.customer_code ?? null,
      p_subscription_code: null,
      p_next_billing_date: nextDate,
    });
    if (rpcError) {
      console.error("RPC error recording payment:", rpcError);
      throw rpcError;
    }

    // Store the authorization code for recurring subscriptions.
    const authCode = tx.authorization?.authorization_code;
    if (authCode) {
      await supabase.from("clients").update({ paystack_auth_code: authCode }).eq("id", client.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_number: rpcResult?.invoice_number ?? invNumber,
        already_processed: rpcResult?.already_processed ?? false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("verify-client-payment error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal processing error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
