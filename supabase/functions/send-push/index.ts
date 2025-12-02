import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@4.15.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  recipientId: string;
  type: "image" | "note";
  content?: string;
  imageUrl?: string;
  fromName?: string;
  timestamp?: string;
}

type PushResult = PromiseSettledResult<unknown>;

/**
 * Normalize private key input to a clean PEM string:
 * - Accepts real newlines or "\n" escaped
 * - Accepts raw base64 (adds header/footer)
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (key.includes("\\n")) key = key.replace(/\\n/g, "\n");

  const hasHeader = key.includes("BEGIN PRIVATE KEY");
  const hasFooter = key.includes("END PRIVATE KEY");

  if (!hasHeader || !hasFooter) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }

  const lines = key
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("-----BEGIN") && !l.startsWith("-----END"));

  return [
    "-----BEGIN PRIVATE KEY-----",
    ...lines,
    "-----END PRIVATE KEY-----",
  ].join("\n");
}

async function getAccessToken(): Promise<string> {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const rawKey = Deno.env.get("FIREBASE_PRIVATE_KEY");

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error("Firebase credentials not configured");
  }

  const privateKeyPem = normalizePrivateKey(rawKey);
  console.log(`Using Firebase key (chars): ${privateKeyPem.length}`);

  const privateKey = await importPKCS8(privateKeyPem, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token exchange failed:", errorText);
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error("No access token returned from Google");

  return data.access_token as string;
}

async function sendFCM(tokens: string[], data: Record<string, string>) {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is missing");

  const accessToken = await getAccessToken();
  console.log(`Sending push to ${tokens.length} device(s)`);

  const results: PushResult[] = await Promise.allSettled(
    tokens.map(async (token) => {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              data,
              android: { priority: "high" },
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      return await res.json();
    })
  );

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: PushPayload = await req.json();
    const { recipientId, type, content, imageUrl, fromName, timestamp } = payload;

    if (!recipientId || !type) {
      return new Response(
        JSON.stringify({ error: "recipientId and type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: deviceTokens, error: tokenError } = await supabaseClient
      .from("device_tokens")
      .select("token")
      .eq("user_id", recipientId);

    if (tokenError) {
      console.error("Error fetching tokens:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log("No device tokens for user");
      return new Response(
        JSON.stringify({
          ok: true,
          message: "No device tokens found for user",
          sentTo: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokens = deviceTokens.map((d) => d.token);
    console.log(`Found ${tokens.length} token(s) for recipient ${recipientId}`);

    const pushData: Record<string, string> = {
      type,
      content: content || "",
      imageUrl: imageUrl || "",
      fromName: fromName || "Someone",
      timestamp: timestamp || new Date().toISOString(),
    };

    const results = await sendFCM(tokens, pushData);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - successCount;

    if (failed > 0) {
      const errors = results
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason?.toString?.() ?? "error");
      console.error("FCM send errors:", errors);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sentTo: tokens.length,
        succeeded: successCount,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-push error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
