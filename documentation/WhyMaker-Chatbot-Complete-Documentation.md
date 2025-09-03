# WhyMaker Chatbot - Complete Documentation

*A comprehensive guide for non-technical team members*

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture) 
3. [Getting Started](#3-getting-started)
4. [Services](#4-services)
5. [Deployment and Domains](#5-deployment-and-domains)
6. [Environment Variables](#6-environment-variables)
7. [Security and Privacy](#7-security-and-privacy)
8. [Troubleshooting](#8-troubleshooting)
9. [FAQ](#9-faq)
10. [Operations Checklist](#10-operations-checklist)

---

## 1. Overview

### What is the WhyMaker Chatbot?

The WhyMaker Chatbot is an AI-powered assistant that can answer questions about WhyMaker's documents, processes, and knowledge base. Think of it as a smart search engine that can understand natural language questions and provide conversational answers.

### What can it do?

**Answer questions about your documents:**
- Search through files stored in your Google Drive
- Understand context and provide relevant answers
- Handle follow-up questions in a conversation

**Process uploaded files:**
- Read PDF documents
- Extract text from Word documents (.docx)
- Parse PowerPoint presentations (.pptx)
- Analyze images (extract text, identify content)
- Use uploaded files as context for answering questions

**Smart conversation:**
- Remember the conversation history
- Ask clarifying questions when needed
- Provide sources and references when possible

### Where do I use it?

The chatbot lives at: **https://chatbot.whymaker.com**

You can access it from any web browser on your computer, tablet, or phone. You'll need to sign in with your Google account to use it.

### Who maintains it?

The chatbot is maintained by the WhyMaker technical team. For questions or issues, contact:
- Primary: danielvoyevoda@outlook.com
- Current technical staff (see operations checklist for backup contacts)

---

## 2. Architecture

### How It Works (Big Picture)

This guide explains the moving parts in simple terms and how information flows from your question to the final answer.

### Diagram (placeholder)
- [Insert a simple diagram showing: Browser → Vercel (API) → Google Vertex AI Search → OpenAI → Browser]

### Main pieces (plain English)
- **Website (frontend)**: the page you visit to chat and upload files.
- **Vercel (hosting)**: runs the website and a small, secure "API" that talks to Google and OpenAI.
- **Google Vertex AI Search**: finds the most relevant snippets in our documents.
- **OpenAI**: turns those snippets into a helpful, readable answer.

### Flow (step‑by‑step)
1. You type a question (optionally upload a file) and press Send.
2. The website calls our API (running on Vercel).
3. The API searches WhyMaker's documents via Google Vertex AI Search and collects the best excerpts.
4. If you uploaded files, the API also extracts text from those files (or passes images directly to the Smart model) and adds that to the context.
5. The API asks OpenAI to write a clear answer using only the provided context plus general knowledge for clarity.
6. The answer streams back to your browser so you can read it immediately.

### Sign‑in and permissions (plain English)
- If a document requires permission, you sign in with your Google account so the system respects those permissions.
- A "service account" (a special robot user) securely talks to Google on behalf of the app when needed.

### Why this design
- **Fast**: Vercel serves the site globally.
- **Accurate**: Google's search finds the right passages.
- **Clear**: OpenAI writes in plain language.
- **Private**: access follows your Google permissions; secrets live in Vercel.

---

## 3. Getting Started

### Using the WhyMaker Chatbot (Day-to-Day)

This guide shows how to use the chatbot day‑to‑day without any technical steps.

### Open the chatbot
- Visit the link (for example, `https://chatbot.whymaker.com`).
- Add it to your bookmarks for quick access.

### Sign in (if asked)
- Use your WhyMaker Google account (info@whymaker.com or your work account).
- If you see a message about a "redirect URI," that simply means the sign‑in link is being checked for security—continue the sign‑in.

### Ask a question
- Click in the message box, type your question, and press Send.
- Be specific: add names, dates, or topics (e.g., "Refund policy for workshops in 2024").
- You can ask follow‑up questions in the same chat; the chatbot remembers the conversation.

### Upload a file (optional)
- Click the + button to attach a PDF, Word document, PowerPoint, or image screenshot.
- After attaching, ask a question about the file (e.g., "Summarize slide 5," "List action items mentioned in this doc").
- Tip: The Smart model works best with files and images.

### Choose a model
- **Fast**: quick, short answers. Good for simple questions.
- **Smart**: more accurate, longer answers, understands files/images better.
- The app will switch to Smart automatically when you attach files.

### Understand the answer
- The response blends information from our documents and your uploaded files.
- If you need more detail, ask "show bullet points" or "cite the source."

### Good habits
- Keep uploads under a few megabytes so they process quickly.
- For important decisions, skim the original document.
- If something seems off, ask a follow‑up like "recheck using the Welcome Packet doc."

---

## 4. Services

### Accounts & Services We Use

Plain‑English explanations of the services that power the chatbot and who logs in where.

### Vercel (Hosting)
- **What it does**: hosts the website and the small API that answers requests.
- **Why we use it**: free, simple, fast, secure, and no servers to maintain.
- **How we log in**: with Google (info@whymaker.com).
- **What you'll see**: deployments (each change creates a preview link), domains, and environment variables (settings).

### GitHub (Code)
- **What it does**: safely stores the website code and tracks changes.
- **Why we use it**: collaboration and history (who changed what, when).
- **How we log in**: with Google (info@whymaker.com).
- **What you'll see**: the repository and pull requests.

### Google Cloud (Drive & Vertex AI Search)
- **Google Drive**: where our documents live (policies, slides, docs, etc.).
- **Vertex AI Search**: the tool that finds the most relevant text from those documents.
- **Why we use it**: strong permissions (respects who can see what) and great search quality.
- **How we log in**: Google (info@whymaker.com). The app also uses a secure "service account" to call the APIs.

### OpenAI (Answer Writing)
- **What it does**: turns the found text into a clear, helpful answer.
- **Models**: "Fast" (quick/short) and "Smart" (better accuracy, longer answers, understands images/files).
- **Billing**: pay‑as‑you‑go. The account is under info@whymaker.com, password managed by Krista.

### Squarespace (DNS for our domain)
- **What it does**: manages the records that point `chatbot.whymaker.com` to Vercel.
- **Why it matters**: without DNS, the user‑friendly web address wouldn't work.

### Where secrets live (one place)
- Vercel → Project → Settings → Environment Variables.
- Never paste keys in documents or email; put them in Vercel only.

### Who has access (suggested)
- **Admin access**: Vercel, Google Cloud, OpenAI billing.
- **Contributor access**: GitHub repo.
- **Viewer access**: read‑only for most team members.

---

## 5. Deployment and Domains

### Deployments & Domains (Plain English)

This guide explains how to change the existing domain and Google sign‑in settings if you ever need to.

### Change the domain (already connected today)
If you need to switch from `chatbot.whymaker.com` to a new address:

**1) Vercel – add the new domain**
- Vercel → Project → Settings → Domains → Add your NEW domain (keep the current one until the new one works).

**2) Squarespace – update DNS**
- In Squarespace DNS, edit or add the CNAME for the new subdomain:
  - Host/Name: the subdomain (e.g., `chatbot2`)
  - Data/Target: the CNAME value Vercel shows (e.g., `cname.vercel-dns.com`)
  - Save and wait 5–60 minutes.
- Do not delete the old CNAME until the new domain says "Configured" in Vercel.

**3) Verify in Vercel**
- When the new domain shows "Configured," Vercel will issue SSL automatically.
- You can then remove the old domain if you no longer need it.

### Update Google sign‑in (OAuth) for the new domain
When the domain changes, update the callback URL in two places:

**1) Google Cloud Console**
- APIs & Services → Credentials → your OAuth Client → Authorized redirect URIs → Add:
  - `https://NEW-DOMAIN/api/auth/callback`
- Keep the old URI for a short overlap if you're migrating gradually.

**2) Vercel Environment Variable**
- Project → Settings → Environment Variables → update:
  - `GOOGLE_OAUTH_REDIRECT_URI=https://NEW-DOMAIN/api/auth/callback`
- Redeploy so the change takes effect.

### Rollbacks and safe releases
- Make changes in a Preview deploy first, test, then switch domains.
- Keep both domains active during the cutover window, then remove the old one.

### Common adjustments
- **Switching the main site name shown in the tab?** This changes the text that appears in your browser tab (e.g., from "WhyMaker Chatbot" to "WhyMaker AI Assistant"). Update `NEXT_PUBLIC_SITE_NAME` in Vercel environment variables and redeploy.
- **Moving back to an older version?** Use Vercel's Rollback in the Deployments tab.

### Troubleshooting
- **Domain shows "Invalid Configuration" in Vercel**: DNS may still be propagating; confirm the CNAME in Squarespace.
- **Sign‑in error "redirect_uri_mismatch"**: add the exact new callback URL in Google OAuth and update the same value in Vercel.
- **Users still hit the old domain**: keep both domains temporarily, or update links where the old URL is referenced (e.g., Shopify, bookmarks).

---

## 6. Environment Variables

### Environment Variables (Settings)

These are the name‑value settings the chatbot needs. They live in:
- Vercel → Project → Settings → Environment Variables

Do not share keys in email or docs. Paste them into Vercel only.

### Required settings
- **OPENAI_API_KEY**
  - Your OpenAI key (enables the AI to write answers).
- **VERTEX_PROJECT_ID**
  - Your Google Cloud Project ID (text string, e.g., `whymaker-llm-on-goog`).
- **VERTEX_LOCATION**
  - Usually `global`.
- **GCP_SERVICE_ACCOUNT_JSON**
  - Paste the entire JSON for the Google service account (starts with `{ "type": "service_account" ... }`).
- **VERTEX_DATA_STORE_ID**
  - Your Google Vertex AI Search Data Store ID (text string from Google Cloud Console).
- **GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET**
  - From Google OAuth credentials (Web application).
- **GOOGLE_OAUTH_REDIRECT_URI**
  - Must match your domain exactly, e.g., `https://chatbot.whymaker.com/api/auth/callback`.

### Optional settings
- **VERTEX_LANGUAGE_CODE** (default: `en-US`)
- **NEXT_PUBLIC_SITE_NAME** (e.g., `WhyMaker Chatbot`)

### Technical note
Advanced users can use `VERTEX_ENGINE_ID` or `VERTEX_SERVING_CONFIG` instead of `VERTEX_DATA_STORE_ID` if needed.

### When the domain changes
1. Add the new callback URL in Google OAuth → Authorized redirect URIs.
2. Update `GOOGLE_OAUTH_REDIRECT_URI` in Vercel.
3. Redeploy so the change takes effect.

### Quick copy/paste example (fill in your values)
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

---

## 7. Security and Privacy

### Security & Privacy (Plain English)

We designed the chatbot to be helpful and safe. This page explains, without technical jargon, what it sees, what it doesn't, and how to use it responsibly.

### What data the chatbot sees
- Google Drive content that your organization chose to include in Vertex AI Search.
- Files you upload during a chat (PDF, DOCX, PPTX, images). These are used only to answer your current question.
- Basic usage logs (errors, performance) in Vercel—no chat content is published.

### What it does not do
- It does not read your emails or unrelated files.
- It does not permanently store the files you upload.
- It does not change or delete your documents.

### Sign‑in and permissions
- You may be asked to sign in with your Google account. This ensures the system respects who is allowed to see what.
- If you cannot access a certain document normally, the chatbot won't access it either.

### Where secrets/keys live
- API keys and service account credentials are stored only in Vercel → Environment Variables.
- Team members should never paste keys into docs, chat, or email.

### Good practices for staff
- Avoid uploading sensitive personal information (e.g., SSNs, medical records).
- For important decisions, double‑check the cited source document.
- Keep uploads small and relevant to your question.

### Request removal or access changes
- To remove a document from search results, remove it from the indexed Drive folder or adjust permissions.
- To grant a user access, update permissions in Google Drive as usual.

### Incident response (who/what/where)
- **Who to contact**: danielvoyevoda@outlook.com or current technical staff
- **Where to check**: Vercel logs, Google Cloud logs (Vertex AI Search), OpenAI usage dashboard.
- **How to disable keys quickly**: in Vercel, delete or rotate the related environment variable; in Google Cloud/OpenAI, rotate the key.

---

## 8. Troubleshooting

### Troubleshooting (Quick Fixes)

### I can't sign in
- Check you're using your WhyMaker Google account.
- If the domain changed, the redirect URI may need an update.
- Try a private/incognito window to rule out cached sign‑ins.

### The page says "Invalid Configuration" in Vercel
- DNS change hasn't propagated yet; wait up to an hour.
- Verify the CNAME in Squarespace points to Vercel's target and is saved.
- In Vercel, click the domain and press "Refresh" after a few minutes.

### The chatbot says it can't find my file
- File may exceed size limits (about 4 MB total per request).
- Try a smaller file or fewer files.
- For images/screenshots, ensure text is readable (not blurry or tiny).

### Answers look off or incomplete
- Switch model to Smart and ask again.
- Be specific: add names, dates, document titles, or "focus on the Welcome Packet."
- Ask for a different format: "show bullet points," "list action items," "quote the key lines."

### The domain works but Google sign‑in fails
- Make sure the exact callback URL is added in Google OAuth.
- Update `GOOGLE_OAUTH_REDIRECT_URI` in Vercel and redeploy.

### The new domain doesn't work yet
- Keep the old domain active during migration.
- Confirm Squarespace DNS record has no trailing dot if it was rejected.

### Still stuck?
- Capture the time, the error text, and what you tried; share a screenshot if possible.
- Contact Daniel on Slack/Email or your future technical contact (below).

### Contact Info
Daniel Voyevoda: danielvoyevoda@outlook.com

---

## 9. FAQ

### Frequently Asked Questions (FAQ)

### What is the chatbot using to answer?
It searches our documents (Google/Vertex AI Search) and uses OpenAI to write.

### Can I upload files?
Yes—PDF, Word, PowerPoint, and images. The Smart model works best.

### Is my data safe?
Yes—access is limited to our documents; uploads are used to answer your question only.

### Why does sign‑in use "redirect URI" instead of URL?
That's the technical name from the OAuth standard.

### Do I need to change anything if the domain changes?
Update the Google OAuth redirect URI and the variable in Vercel.

### Who can maintain this if the developer is away?
Any admin with access to Vercel, Google Cloud, and OpenAI billing can rotate keys and redeploy.

### What if the answer seems wrong?
Ask a follow‑up with more specifics, try the Smart model, or check the source document.

### Will the chatbot learn private information from my question?
No. It uses your input to answer the current request and doesn't publish that information.

### Can we rebrand the name shown in the browser tab?
Yes. Change `NEXT_PUBLIC_SITE_NAME` in Vercel and redeploy.

### How long do DNS changes take when we move domains?
Usually 5–60 minutes, sometimes up to an hour.

### Who do I contact for help?
See Troubleshooting section above for current contact details.

---

## 10. Operations Checklist

### Operations Checklist (Day‑to‑Day)

### Daily (2–5 minutes)
- Open the chatbot and ask a quick question (sanity check).
- Vercel → Project → Logs: glance for obvious errors.

### Weekly (10 minutes)
- Google Cloud → Vertex AI Search: confirm last index ran; reindex if needed.
- OpenAI Billing: review usage for any spikes.
- Vercel Deployments: ensure latest production deploy is green.

### Monthly (15 minutes)
- Rotate or verify access for team members who joined/left.
- Confirm domain and SSL status in Vercel (no warnings).
- Skim documentation pages for accuracy; update screenshots/links if needed.

### When content changes
- Add or update files in the Drive folder connected to Vertex AI Search.
- Large updates? Trigger a manual re‑index and wait for completion.

### When changing the domain
- Update Squarespace DNS (CNAME for the new subdomain).
- Google OAuth: add the new redirect URI.
- Vercel env: update `GOOGLE_OAUTH_REDIRECT_URI`; redeploy.
- Keep old domain active during the transition; remove after verification.

### Quick runbook: site down or errors
1. Check Vercel status page and project logs.
2. Roll back to a previous successful deployment.
3. If signin is broken: verify Google OAuth redirect URI and env var in Vercel.
4. If answers fail: confirm OpenAI key is valid and not rate‑limited; check Vertex AI Search.
5. If domain fails: verify Squarespace DNS CNAME matches Vercel's target.

### Contacts
- **Primary**: danielvoyevoda@outlook.com
- **Backup**: current technical staff (to be filled in).

---

*End of Documentation*

---

**Document created**: WhyMaker Chatbot Complete Documentation  
**Last updated**: 8/30/25 
**Target audience**: Non-technical team members  
**Sections**: 10 comprehensive sections covering all aspects of the chatbot

This consolidated document can now be easily copied into Google Docs for team sharing and collaboration.

