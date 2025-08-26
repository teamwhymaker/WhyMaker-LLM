# Operations Checklist (Day‑to‑Day)

## Daily (2–5 minutes)
- Open the chatbot and ask a quick question (sanity check).
- Vercel → Project → Logs: glance for obvious errors.

## Weekly (10 minutes)
- Google Cloud → Vertex AI Search: confirm last index ran; reindex if needed.
- OpenAI Billing: review usage for any spikes.
- Vercel Deployments: ensure latest production deploy is green.

## Monthly (15 minutes)
- Rotate or verify access for team members who joined/left.
- Confirm domain and SSL status in Vercel (no warnings).
- Skim documentation pages for accuracy; update screenshots/links if needed.

## When content changes
- Add or update files in the Drive folder connected to Vertex AI Search.
- Large updates? Trigger a manual re‑index and wait for completion.

## When changing the domain
- Update Squarespace DNS (CNAME for the new subdomain).
- Google OAuth: add the new redirect URI.
- Vercel env: update `GOOGLE_OAUTH_REDIRECT_URI`; redeploy.
- Keep old domain active during the transition; remove after verification.

## Quick runbook: site down or errors
1. Check Vercel status page and project logs.
2. Roll back to a previous successful deployment.
3. If signin is broken: verify Google OAuth redirect URI and env var in Vercel.
4. If answers fail: confirm OpenAI key is valid and not rate‑limited; check Vertex AI Search.
5. If domain fails: verify Squarespace DNS CNAME matches Vercel’s target.

## Contacts
- Primary: danielvoyevoda@outlook.com
- Backup: current technical staff (to be filled in).
