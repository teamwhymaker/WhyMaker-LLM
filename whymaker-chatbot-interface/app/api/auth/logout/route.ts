export const runtime = "nodejs";

export async function POST() {
  // Clear the OAuth cookie by setting it with an expired date
  const response = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'wm_google_oauth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    }
  });
  
  return response;
}
