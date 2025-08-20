import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const raw = jar.get("wm_google_oauth")?.value;
  if (!raw) return Response.json({ authenticated: false });
  try {
    const json = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    const expiresAt = (json.obtained_at || 0) + (json.expires_in || 0) * 1000;
    const isValid = json.access_token && Date.now() < expiresAt;
    
    if (isValid && json.id_token) {
      // Decode the ID token to get user info (basic JWT decode, no verification needed for display)
      try {
        const idTokenPayload = JSON.parse(Buffer.from(json.id_token.split('.')[1], 'base64').toString('utf8'));
        return Response.json({ 
          authenticated: true,
          user: {
            email: idTokenPayload.email,
            name: idTokenPayload.name,
            picture: idTokenPayload.picture,
          }
        });
      } catch {
        return Response.json({ authenticated: true });
      }
    }
    
    return Response.json({ authenticated: !!isValid });
  } catch {
    return Response.json({ authenticated: false });
  }
}


