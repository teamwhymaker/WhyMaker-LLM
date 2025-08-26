# Deployments & Domains (Plain English)

This guide explains how to change the existing domain and Google sign‑in settings if you ever need to.

## Change the domain (already connected today)
If you need to switch from `chatbot.whymaker.com` to a new address:

1) Vercel – add the new domain
- Vercel → Project → Settings → Domains → Add your NEW domain (keep the current one until the new one works).

2) Squarespace – update DNS
- In Squarespace DNS, edit or add the CNAME for the new subdomain:
  - Host/Name: the subdomain (e.g., `chatbot2`)
  - Data/Target: the CNAME value Vercel shows (e.g., `cname.vercel-dns.com`)
  - Save and wait 5–60 minutes.
- Do not delete the old CNAME until the new domain says “Configured” in Vercel.

3) Verify in Vercel
- When the new domain shows “Configured,” Vercel will issue SSL automatically.
- You can then remove the old domain if you no longer need it.

## Update Google sign‑in (OAuth) for the new domain
When the domain changes, update the callback URL in two places:

1) Google Cloud Console
- APIs & Services → Credentials → your OAuth Client → Authorized redirect URIs → Add:
  - `https://NEW-DOMAIN/api/auth/callback`
- Keep the old URI for a short overlap if you’re migrating gradually.

2) Vercel Environment Variable
- Project → Settings → Environment Variables → update:
  - `GOOGLE_OAUTH_REDIRECT_URI=https://NEW-DOMAIN/api/auth/callback`
- Redeploy so the change takes effect.

## Rollbacks and safe releases
- Make changes in a Preview deploy first, test, then switch domains.
- Keep both domains active during the cutover window, then remove the old one.

## Common adjustments
- Switching the main site name shown in the tab? This changes the text that appears in your browser tab (e.g., from "WhyMaker Chatbot" to "WhyMaker AI Assistant"). Update `NEXT_PUBLIC_SITE_NAME` in Vercel environment variables and redeploy.
- Moving back to an older version? Use Vercel's Rollback in the Deployments tab.

## Troubleshooting
- Domain shows “Invalid Configuration” in Vercel: DNS may still be propagating; confirm the CNAME in Squarespace.
- Sign‑in error “redirect_uri_mismatch”: add the exact new callback URL in Google OAuth and update the same value in Vercel.
- Users still hit the old domain: keep both domains temporarily, or update links where the old URL is referenced (e.g., Shopify, bookmarks).

Read next:
- Environment Variables → `environment-variables.md`
- Troubleshooting → `troubleshooting.md`
