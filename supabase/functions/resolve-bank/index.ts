import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { accountNumber, bankCode } = await req.json();

    if (!accountNumber || !bankCode) {
      return new Response(JSON.stringify({ error: "accountNumber and bankCode are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call real Paystack /bank/resolve if secret key is configured
    if (paystackSecret && !paystackSecret.includes("xxxxxxxx")) {
      const res = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
          accountNumber
        )}&bank_code=${encodeURIComponent(bankCode)}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
          },
        }
      );
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sandbox / Test fallback response
    return new Response(
      JSON.stringify({
        status: true,
        message: "Account resolved (Sandbox Mode)",
        data: {
          account_number: accountNumber,
          account_name: "KWAME DEVELOPER ENTERPRISE",
          bank_id: 1,
        },
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
