import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Use service role key to bypass RLS (this is server-side code)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const { userId, token, deviceInfo } = await req.json();

    if (!userId || !token) {
      return new Response(
        JSON.stringify({ error: "userId and token are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Registering device token for user: ${userId}`);

    // Upsert device token
    const { error: upsertError } = await supabaseClient
      .from("device_tokens")
      .upsert(
        {
          user_id: userId,
          token,
          device_info: deviceInfo || {},
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,token",
        }
      );

    if (upsertError) {
      console.error("Error upserting device token:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save device token" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Successfully registered token for user: ${userId}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in register-device:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
