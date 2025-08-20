import { NextRequest } from "next/server";

export const runtime = "nodejs";

// Simple OAuth 2.0 Authorization Code flow (server-side exchange handled in /api/auth/callback)
export async function GET(_req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

  if (!clientId) {
    return new Response("Missing GOOGLE_CLIENT_ID", { status: 500 });
  }

  const scope = [
    "openid",
    "email",
    "profile",
    // Needed for Discovery Engine workspace datastores search
    "https://www.googleapis.com/auth/cloud-platform",
    // Read-only Drive access ensures identity has Drive permissions (docs suggest cloud-platform is sufficient, but keep drive.readonly for safety)
    "https://www.googleapis.com/auth/drive.readonly",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(url, 302);
}


