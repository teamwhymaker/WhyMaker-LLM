# Environment Variables (Settings)

These are the name‑value settings the chatbot needs. They live in:
- Vercel → Project → Settings → Environment Variables

Do not share keys in email or docs. Paste them into Vercel only.

## Required settings
- OPENAI_API_KEY
  - Your OpenAI key (enables the AI to write answers).
- VERTEX_PROJECT_ID
  - Your Google Cloud Project ID (text string, e.g., `whymaker-llm-on-goog`).
- VERTEX_LOCATION
  - Usually `global`.
- GCP_SERVICE_ACCOUNT_JSON
  - Paste the entire JSON for the Google service account (starts with `{ "type": "service_account" ... }`).
- VERTEX_DATA_STORE_ID
  - Your Google Vertex AI Search Data Store ID (text string from Google Cloud Console).
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
  - From Google OAuth credentials (Web application).
- GOOGLE_OAUTH_REDIRECT_URI
  - Must match your domain exactly, e.g., `https://chatbot.whymaker.com/api/auth/callback`.

## Optional settings
- VERTEX_LANGUAGE_CODE (default: `en-US`)
- NEXT_PUBLIC_SITE_NAME (e.g., `WhyMaker Chatbot`)

## Technical note
Advanced users can use `VERTEX_ENGINE_ID` or `VERTEX_SERVING_CONFIG` instead of `VERTEX_DATA_STORE_ID` if needed.

## When the domain changes
1. Add the new callback URL in Google OAuth → Authorized redirect URIs.
2. Update `GOOGLE_OAUTH_REDIRECT_URI` in Vercel.
3. Redeploy so the change takes effect.

## Quick copy/paste example (fill in your values)
```
OPENAI_API_KEY=...
VERTEX_PROJECT_ID=whymaker-llm-on-goog
VERTEX_LOCATION=global
GCP_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
VERTEX_DATA_STORE_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=https://chatbot.whymaker.com/api/auth/callback
VERTEX_LANGUAGE_CODE=en-US
NEXT_PUBLIC_SITE_NAME=WhyMaker Chatbot
```
