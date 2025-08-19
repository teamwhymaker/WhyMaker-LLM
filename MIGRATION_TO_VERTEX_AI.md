## WhyMaker Chatbot – Migration to Vertex AI (Project Plan)

Goal: host the UI and a minimal serverless API on Vercel, use Vertex AI Search for retrieval, use OpenAI for generation, and embed the chatbot at `whymaker.com/chatbot` (Shopify). Remove Chroma/Cloud Run complexity and hand off a no‑ops setup for non‑technical owners.

---

### 0) Scope and end state
- UI hosted on Vercel from `whymaker-chatbot-interface`.
- Serverless API route on Vercel: `POST /api/chat` → calls Vertex AI Search → calls OpenAI → streams response.
- Knowledge source: GCS bucket(s) indexed by Vertex AI Search (Enterprise Search).
- Shopify page embeds the Vercel UI via iframe.
- Secrets managed in Vercel env vars. No servers, no containers, no Chroma.

---

### 1) Prerequisites and access
- Google Cloud
  - Project with Vertex AI Search enabled.
  - Data Store created (Enterprise Search) and connected to GCS and/or website crawl.
  - Service account with roles: `Discovery Engine User` (a.k.a. Vertex AI Search) + access to the GCS bucket.
  - Download JSON key for this service account.
- OpenAI
  - API key with access to the chosen model (e.g., `gpt-4o-mini`).
- Domains
  - Vercel account with access to configure project and domain.
  - Shopify admin access to create a page and embed an iframe.

---

### 2) Vertex AI Search setup (once)
- Create a Data Store (type: Enterprise Search) in the desired location (e.g., `global`).
- Add a GCS connector pointing at `gs://whymaker-knowledge/` (or your chosen bucket/prefix).
- Configure refresh schedule (e.g., daily) and run an initial index build.
- Note these values for later env vars:
  - `VERTEX_PROJECT_ID`
  - `VERTEX_LOCATION` (often `global`)
  - `VERTEX_DATA_STORE_ID`
  - Optional: the full Serving Config name if you prefer: `projects/…/locations/…/collections/default_collection/dataStores/…/servingConfigs/default_search`.

---

### 3) Repository adjustments
- Frontend remains in `whymaker-chatbot-interface/`.
- Move API to Vercel serverless (Next.js Route Handler) within the frontend app so deploy is one project.
  - Target path: `whymaker-chatbot-interface/app/api/chat/route.ts` (for App Router) or `pages/api/chat.ts` (for Pages Router).
- Set the frontend to call relative path `/api/chat` instead of an external URL.
- Keep existing Python `api.py`/Cloud Run files for reference, but mark them as deprecated in `README.md`.

---

### 4) Implement the Vercel API route (minimal hybrid RAG)
Pseudo (TypeScript) outline for `app/api/chat/route.ts`:

```ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import {SearchServiceClient} from "@google-cloud/discoveryengine"; // Vertex AI Search

export const runtime = "nodejs"; // set to "edge" only if both SDKs support it

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  // Vertex AI Search
  const client = new SearchServiceClient({
    credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON!),
    projectId: process.env.VERTEX_PROJECT_ID,
  });

  const servingConfig = process.env.VERTEX_SERVING_CONFIG!; // or build from project/location/datastore
  const [searchResponse] = await client.search({
    servingConfig,
    query: question,
    pageSize: 8,
  });

  const snippets: string[] = [];
  for (const r of searchResponse.results ?? []) {
    const doc = r.document;
    const s = (doc?.derivedStructData as any)?.snippets || "";
    if (s) snippets.push(Array.isArray(s) ? s.join("\n") : String(s));
  }
  const context = snippets.slice(0, 6).join("\n\n");

  // OpenAI generation
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "You are WhyMaker's assistant. Prefer the provided CONTEXT." },
      { role: "user", content: `CONTEXT:\n${context}\n\nQuestion: ${question}` },
    ],
  });

  return new Response(JSON.stringify({
    answer: completion.choices?.[0]?.message?.content ?? "",
    sources: snippets.slice(0, 6),
  }), { headers: { "content-type": "application/json" } });
}
```

Notes:
- For streaming, switch to OpenAI streaming APIs and return a streaming response.
- If you prefer building the Serving Config dynamically, use env vars for `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_DATA_STORE_ID` and construct the string.

---

### 5) Frontend changes
- Ensure API base is relative: calls to `/api/chat`.
- Keep the existing UI, token streaming, and file chip rendering. Remove any references to the old FastAPI URL.
- Expose `NEXT_PUBLIC_SITE_NAME` etc. as needed.

---

### 6) Vercel project setup
- Create a new Vercel project; set the Root Directory to `whymaker-chatbot-interface`.
- Framework preset: Next.js.
- Build command: auto (`next build`).
- Output: standard (don’t use static export since we need an API route).
- Environment variables (Production/Preview/Development):
  - `OPENAI_API_KEY` = xxxxx
  - `OPENAI_MODEL` = `gpt-4o-mini` (or preferred)
  - `VERTEX_PROJECT_ID` = `…`
  - `VERTEX_LOCATION` = `global`
  - `VERTEX_DATA_STORE_ID` = `…` (optional if using full serving config)
  - `VERTEX_SERVING_CONFIG` = `projects/.../servingConfigs/default_search`
  - `GCP_SERVICE_ACCOUNT_JSON` = paste full JSON of the GCP key
- Redeploy to test. Verify `/api/chat` from the deployed URL.

---

### 7) Shopify embed
- In Shopify Admin → Online Store → Pages → Add page → Title: Chatbot.
- Add a section of type “Custom liquid” and paste:
```html
<div style="height:80vh">
  <iframe
    src="https://YOUR-VERCEL-DOMAIN/chat?embed=1"
    style="width:100%;height:100%;border:0"
    allow="clipboard-read; clipboard-write"
  ></iframe>
</div>
```
- Optional: add a top navigation link to this page.

---

### 8) Security and compliance
- Ensure CORS and headers are correct (iframe uses different origin; API is same site on Vercel).
- Restrict OpenAI key exposure: all calls to OpenAI must be from the serverless route only.
- Store GCP key exclusively in Vercel env vars.
- Consider basic rate limiting per IP/session in the API route.

---

### 9) Monitoring, logging, and costs
- Vercel: use Logs tab; enable Analytics if desired.
- Google Cloud: Vertex AI Search logs in Cloud Logging; verify connector status and indexing schedule.
- Costs (est.):
  - Vertex AI Agent/Search queries: ~$2–$2.5 per 1,000 search requests.
  - OpenAI tokens: depends on model (e.g., `gpt-4o-mini` low cost; `gpt-4o` higher).
  - GCS storage for source files; Vertex indexing storage per GB after free tier.

---

### 10) Decommission old infrastructure
- Mark `api.py`, `rag.py`, `index_job.py`, Dockerfile, and Cloud Run/GCSFuse notes as deprecated in `README.md`.
- Keep the GCS bucket with documents; this remains the truth source for Vertex Search.
- Remove Render/Cloud Run services after Vercel cutover is stable for a week.

---

### 11) Handoff checklist (for non‑technical owners)
- To add or remove content: upload or delete files in `gs://whymaker-knowledge/...`.
- In Vertex AI Search Data Store, click “Reindex” (or wait for scheduled refresh).
- No other maintenance required. If the chat breaks:
  - Check Vercel deploy status and logs.
  - Check Vertex AI Data Store indexing status.
  - Rotate OpenAI key if needed (Vercel env var) and redeploy.

---

### 12) Rollout plan
- Staging deploy on Vercel with preview domain; validate `/api/chat` and UI.
- Point Shopify iframe to preview; test with internal users.
- Production deploy; update Shopify to production Vercel domain or custom domain.
- Monitor for 48–72 hours; then decommission old stack.

---

### 13) Nice‑to‑haves (post‑migration)
- Add citations UI using Vertex Search snippet metadata.
- Add streaming in the Vercel route.
- Add Drive/Sheets connector to Vertex for automatic ingestion.
- Add simple admin page (protected) to trigger reindex and show last status.


