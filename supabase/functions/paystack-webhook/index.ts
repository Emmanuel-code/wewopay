import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY") || Deno.env.get("PAYSTACK_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // 1. Verify HMAC-SHA512 Signature if secret is configured
    if (paystackSecret && signature) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(paystackSecret),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      );
      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(rawBody)
      );
      const expectedSignature = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (signature !== expectedSignature) {
        console.error("Invalid Paystack webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Handle charge.success event
    if (event === "charge.success") {
      const reference = data.reference;
      const amountInKoboOrPesewas = Number(data.amount || 0);
      const grossAmount = amountInKoboOrPesewas / 100;
      const customerEmail = data.customer?.email;
      const authorization = data.authorization || {};
      const authCode = authorization.authorization_code || null;
      const customerCode = data.customer?.customer_code || null;

      // Find client by email or metadata reference
      let client = null;
      if (data.metadata?.client_id) {
        const { data: c } = await supabase
          .from("clients")
          .select("*, project:projects(*)")
          .eq("id", data.metadata.client_id)
          .maybeSingle();
        client = c;
      }

      if (!client && customerEmail) {
        const { data: c } = await supabase
          .from("clients")
          .select("*, project:projects(*)")
          .eq("email", customerEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        client = c;
      }

      if (client && client.project) {
        const commissionRate = Number(data.metadata?.commission_rate || 3.0);
        const grossInCents = Math.round(grossAmount * 100);
        const paystackFeeInCents = Math.round(grossInCents * 0.015);
        const platformFeeInCents = Math.round((grossInCents * commissionRate) / 100);
        const devAmountInCents = Math.max(0, grossInCents - paystackFeeInCents - platformFeeInCents);

        const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Calculate next billing date
        const nextBilling = new Date();
        const cycle = client.project.billing_cycle;
        if (cycle === "MONTHLY") nextBilling.setMonth(nextBilling.getMonth() + 1);
        else if (cycle === "QUARTERLY") nextBilling.setMonth(nextBilling.getMonth() + 3);
        else if (cycle === "ANNUALLY") nextBilling.setFullYear(nextBilling.getFullYear() + 1);

        const nextDate = cycle === "ONE_TIME" ? null : nextBilling.toISOString();

        // Atomically record payment via stored RPC
        await supabase.rpc("record_successful_payment", {
          p_client_id: client.id,
          p_paystack_ref: reference,
          p_gross_amount: grossAmount,
          p_paystack_fee: paystackFeeInCents / 100,
          p_platform_fee: platformFeeInCents / 100,
          p_developer_amount: devAmountInCents / 100,
          p_currency: data.currency || client.project.currency || "GHS",
          p_invoice_number: invNumber,
          p_paystack_customer_code: customerCode,
          p_subscription_code: null,
          p_next_billing_date: nextDate,
        });

        // Store authorization code for recurring subscriptions
        if (authCode) {
          await supabase
            .from("clients")
            .update({ paystack_auth_code: authCode })
            .eq("id", client.id);
        }
      }
    }

    return new Response(JSON.stringify({ status: "processed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
