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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    // 1. Enforce Authentication: Require Caller Authorization Header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Infrastructure configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validate Caller JWT
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callerUser },
      error: authErr,
    } = await callerClient.auth.getUser();

    if (authErr || !callerUser) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .maybeSingle();

    const isAdmin = callerProfile?.role === "admin";

    // 3. Extract and Validate Input Parameters
    const { developerId } = await req.json();
    if (!developerId || typeof developerId !== "string") {
      return new Response(JSON.stringify({ error: "Valid developerId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service-role client to fetch the developer record (bypasses RLS inside
    // the edge runtime where JWT context can be ambiguous), then manually assert
    // ownership — same security guarantee without RLS propagation issues.
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Fetch developer and verify bank account & balance
    const { data: dev, error: devErr } = await adminClient
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

    // Security: non-admins may only withdraw their own balance
    if (!isAdmin && dev.profile_id !== callerUser.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You can only withdraw your own developer balance" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payoutAmount = Number(dev.pending_balance || 0);
    if (payoutAmount <= 0) {
      return new Response(JSON.stringify({ error: "No pending balance to disburse" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dev.bank_verified || !dev.paystack_recipient_code) {
      return new Response(
        JSON.stringify({ error: "Developer bank recipient code is not verified" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let transferCode = `TRF_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    let transferId = `ID_${Math.floor(100000 + Math.random() * 900000)}`;
    let payoutStatus = "SUCCESS";
    let paystackFailureReason: string | null = null;

    // 5. Execute transfer via Paystack Transfer API if secret key is configured
    if (paystackSecret && !paystackSecret.includes("xxxxxxxx")) {
      console.log(`Initiating Paystack transfer: amount=${payoutAmount} recipient=${dev.paystack_recipient_code}`);
      try {
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
            reason: `wewopay Developer Payout - ${dev.name}`,
          }),
        });

        const transferResponse = await res.json();
        console.log("Paystack transfer response:", JSON.stringify(transferResponse));

        if (transferResponse.status && transferResponse.data?.transfer_code) {
          transferCode = transferResponse.data.transfer_code;
          transferId = String(transferResponse.data.id || transferId);
          payoutStatus = "SUCCESS";
        } else {
          // Paystack rejected transfer (insufficient balance, OTP needed, etc.)
          // Record as PENDING so admin can manually approve/retry
          paystackFailureReason = transferResponse.message || "Paystack transfer pending approval";
          payoutStatus = "PENDING";
          console.warn("Paystack transfer not completed:", paystackFailureReason);
        }
      } catch (fetchErr: any) {
        console.error("Paystack API fetch error:", fetchErr.message);
        payoutStatus = "PENDING";
        paystackFailureReason = fetchErr.message;
      }
    } else {
      console.log("No live Paystack key — recording mock payout:", transferCode);
    }

    // 6. Write payout record
    console.log(`Inserting payout record: amount=${payoutAmount} status=${payoutStatus} code=${transferCode}`);
    const { error: insertErr } = await adminClient
      .from("payouts")
      .insert({
        developer_id: dev.id,
        amount: payoutAmount,
        currency: "GHS",
        paystack_transfer_code: transferCode,
        paystack_transfer_id: transferId,
        status: payoutStatus,
        initiated_at: new Date().toISOString(),
        completed_at: payoutStatus === "SUCCESS" ? new Date().toISOString() : null,
        failure_reason: paystackFailureReason,
      });

    if (insertErr) {
      console.error("Failed to insert payout record:", JSON.stringify(insertErr));
      return new Response(
        JSON.stringify({ message: `DB insert failed: ${insertErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Zero the developer's pending balance
    console.log(`Zeroing pending_balance for developer: ${dev.id}`);
    const { error: updateErr } = await adminClient
      .from("developers")
      .update({ pending_balance: 0 })
      .eq("id", dev.id);

    if (updateErr) {
      console.error("Failed to zero pending_balance:", JSON.stringify(updateErr));
      return new Response(
        JSON.stringify({ message: `Balance update failed: ${updateErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transferCode,
        transferId,
        amount: payoutAmount,
        status: payoutStatus,
        note: paystackFailureReason,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Disburse payout error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
