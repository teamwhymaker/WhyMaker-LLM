# Troubleshooting (Quick Fixes)

## I can’t sign in
- Check you’re using your WhyMaker Google account.
- If the domain changed, the redirect URI may need an update.
- Try a private/incognito window to rule out cached sign‑ins.

## The page says “Invalid Configuration” in Vercel
- DNS change hasn’t propagated yet; wait up to an hour.
- Verify the CNAME in Squarespace points to Vercel’s target and is saved.
- In Vercel, click the domain and press “Refresh” after a few minutes.

## The chatbot says it can’t find my file
- File may exceed size limits (about 4 MB total per request).
- Try a smaller file or fewer files.
- For images/screenshots, ensure text is readable (not blurry or tiny).

## Answers look off or incomplete
- Switch model to Smart and ask again.
- Be specific: add names, dates, document titles, or “focus on the Welcome Packet.”
- Ask for a different format: “show bullet points,” “list action items,” “quote the key lines.”

## The domain works but Google sign‑in fails
- Make sure the exact callback URL is added in Google OAuth.
- Update `GOOGLE_OAUTH_REDIRECT_URI` in Vercel and redeploy.

## The new domain doesn’t work yet
- Keep the old domain active during migration.
- Confirm Squarespace DNS record has no trailing dot if it was rejected.

## Still stuck?
- Capture the time, the error text, and what you tried; share a screenshot if possible.
- Contact Daniel on Slack/Email or your future technical contact (below).

## Contact Info

Daniel Voyevoda: danielvoyevoda@outlook.com