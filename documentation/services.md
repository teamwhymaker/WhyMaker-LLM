# Accounts & Services We Use

Plain‑English explanations of the services that power the chatbot and who logs in where.

## Vercel (Hosting)
- What it does: hosts the website and the small API that answers requests.
- Why we use it: free, simple, fast, secure, and no servers to maintain.
- How we log in: with Google (info@whymaker.com).
- What you’ll see: deployments (each change creates a preview link), domains, and environment variables (settings).

## GitHub (Code)
- What it does: safely stores the website code and tracks changes.
- Why we use it: collaboration and history (who changed what, when).
- How we log in: with Google (info@whymaker.com).
- What you’ll see: the repository and pull requests.

## Google Cloud (Drive & Vertex AI Search)
- Google Drive: where our documents live (policies, slides, docs, etc.).
- Vertex AI Search: the tool that finds the most relevant text from those documents.
- Why we use it: strong permissions (respects who can see what) and great search quality.
- How we log in: Google (info@whymaker.com). The app also uses a secure “service account” to call the APIs.

## OpenAI (Answer Writing)
- What it does: turns the found text into a clear, helpful answer.
- Models: “Fast” (quick/short) and “Smart” (better accuracy, longer answers, understands images/files).
- Billing: pay‑as‑you‑go. The account is under info@whymaker.com, password managed by Krista.

## Squarespace (DNS for our domain)
- What it does: manages the records that point `chatbot.whymaker.com` to Vercel.
- Why it matters: without DNS, the user‑friendly web address wouldn’t work.

## Where secrets live (one place)
- Vercel → Project → Settings → Environment Variables.
- Never paste keys in documents or email; put them in Vercel only.

## Who has access (suggested)
- Admin access: Vercel, Google Cloud, OpenAI billing.
- Contributor access: GitHub repo.
- Viewer access: read‑only for most team members.

Read next:
- Deployments & Domains → `deployment-and-domains.md`
- Environment Variables → `environment-variables.md`
