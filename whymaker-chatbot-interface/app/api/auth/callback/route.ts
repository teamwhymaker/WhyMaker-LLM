import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return new Response("Missing code", { status: 400 });

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

    if (!clientId || !clientSecret) {
      return new Response("Missing Google OAuth credentials", { status: 500 });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("OAuth token exchange failed:", err);
      return new Response("OAuth exchange failed", { status: 502 });
    }

    const tokens = await tokenRes.json();
    // Store tokens in an HttpOnly cookie (short TTL); client will call /api/auth/status to check
    const cookieValue = Buffer.from(JSON.stringify({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token,
      id_token: tokens.id_token,
      obtained_at: Date.now(),
    })).toString("base64");

    const res = new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": `wm_google_oauth=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
      },
    });
    return res;
  } catch (e) {
    console.error("OAuth callback error:", e);
    return new Response("Internal error", { status: 500 });
  }
}


