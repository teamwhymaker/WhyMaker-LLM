# How It Works (Big Picture)

This guide explains the moving parts in simple terms and how information flows from your question to the final answer.

## Diagram (placeholder)
- [Insert a simple diagram showing: Browser → Vercel (API) → Google Vertex AI Search → OpenAI → Browser]

## Main pieces (plain English)
- Website (frontend): the page you visit to chat and upload files.
- Vercel (hosting): runs the website and a small, secure “API” that talks to Google and OpenAI.
- Google Vertex AI Search: finds the most relevant snippets in our documents.
- OpenAI: turns those snippets into a helpful, readable answer.

## Flow (step‑by‑step)
1. You type a question (optionally upload a file) and press Send.
2. The website calls our API (running on Vercel).
3. The API searches WhyMaker’s documents via Google Vertex AI Search and collects the best excerpts.
4. If you uploaded files, the API also extracts text from those files (or passes images directly to the Smart model) and adds that to the context.
5. The API asks OpenAI to write a clear answer using only the provided context plus general knowledge for clarity.
6. The answer streams back to your browser so you can read it immediately.

## Sign‑in and permissions (plain English)
- If a document requires permission, you sign in with your Google account so the system respects those permissions.
- A “service account” (a special robot user) securely talks to Google on behalf of the app when needed.

## Why this design
- Fast: Vercel serves the site globally.
- Accurate: Google’s search finds the right passages.
- Clear: OpenAI writes in plain language.
- Private: access follows your Google permissions; secrets live in Vercel.

## Read next
- Everyday use → `getting-started.md`
- Services & accounts → `services.md`
