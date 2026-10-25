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

    const { developerId } = await req.json();

    if (!developerId) {
      return new Response(JSON.stringify({ error: "developerId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Fetch developer details
    const { data: dev, error: devErr } = await supabase
      .from("developers")
      .select("*")
      .eq("id", developerId)
      .single();

    if (devErr || !dev) {
      return new Response(JSON.stringify({ error: "Developer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payoutAmount = Number(dev.pending_balance || 0);
    if (payoutAmount <= 0) {
      return new Response(JSON.stringify({ error: "No pending balance to disburse" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let transferCode = `TRF_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    let transferId = `ID_${Math.floor(100000 + Math.random() * 900000)}`;

    // If live Paystack secret key is provided, execute transfer via Paystack Transfer API
    if (paystackSecret && !paystackSecret.includes("xxxxxxxx") && dev.paystack_recipient_code) {
      const res = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: Math.round(payoutAmount * 100),
          recipient: dev.paystack_recipient_code,
          reason: `wewopay Developer Subscription Payout - ${dev.name}`,
        }),
      });
      const data = await res.json();
      if (data.status && data.data?.transfer_code) {
        transferCode = data.data.transfer_code;
        transferId = String(data.data.id || transferId);
      }
    }

    // Execute atomic DB function
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("execute_developer_payout", {
      p_developer_id: dev.id,
      p_transfer_code: transferCode,
      p_transfer_id: transferId,
    });

    if (rpcErr) throw rpcErr;

    return new Response(
      JSON.stringify({
        success: true,
        transferCode,
        transferId,
        amount: payoutAmount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
