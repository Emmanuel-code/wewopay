import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Send a client invitation email via Resend.
 *
 * Called after a client is created from the dashboard. The client record
 * already exists by then, so a failed email must never fail client
 * creation — this function only reports success/failure, and the caller
 * falls back to manual link sharing when sending isn't possible.
 *
 * Env required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (to load the client)
 *   RESEND_API_KEY, RESEND_FROM_EMAIL (a sender address on a domain
 *   verified in Resend — without a verified domain, Resend rejects sends
 *   to addresses other than the account owner's).
 *
 * Body: { client_id, payment_link_url }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resendKey || !fromEmail) {
      return new Response(JSON.stringify({ error: "Email delivery is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id, payment_link_url } = await req.json();
    if (!client_id || !payment_link_url) {
      return new Response(JSON.stringify({ error: "client_id and payment_link_url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("*, project:projects(name, amount, currency, billing_cycle)")
      .eq("id", client_id)
      .maybeSingle();
    if (clientErr || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectName = client.project?.name ?? "your service";
    const amount = client.project
      ? `${client.project.currency} ${Number(client.project.amount).toFixed(2)}${client.project.billing_cycle && client.project.billing_cycle !== "ONE_TIME" ? `/${client.project.billing_cycle.toLowerCase()}` : ""}`
      : "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [client.email],
        subject: `Your payment link for ${projectName}`,
        html: `<p>Hi ${client.name},</p><p>You have been invited to pay for <strong>${projectName}</strong>${amount ? ` (${amount})` : ""} via WewoPay.</p><p><a href="${payment_link_url}">Complete your payment here</a></p><p>If the button doesn't work, copy this link into your browser:<br/>${payment_link_url}</p>`,
      }),
    });
    const resJson = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Resend send failed:", resJson);
      return new Response(JSON.stringify({ error: resJson?.message || "Failed to send invitation email" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, email_id: resJson?.id ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-client-invite error:", err);
    return new Response(JSON.stringify({ error: "Internal processing error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
