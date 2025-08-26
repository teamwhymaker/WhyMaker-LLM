# Security & Privacy (Plain English)

We designed the chatbot to be helpful and safe. This page explains, without technical jargon, what it sees, what it doesn’t, and how to use it responsibly.

## What data the chatbot sees
- Google Drive content that your organization chose to include in Vertex AI Search.
- Files you upload during a chat (PDF, DOCX, PPTX, images). These are used only to answer your current question.
- Basic usage logs (errors, performance) in Vercel—no chat content is published.

## What it does not do
- It does not read your emails or unrelated files.
- It does not permanently store the files you upload.
- It does not change or delete your documents.

## Sign‑in and permissions
- You may be asked to sign in with your Google account. This ensures the system respects who is allowed to see what.
- If you cannot access a certain document normally, the chatbot won’t access it either.

## Where secrets/keys live
- API keys and service account credentials are stored only in Vercel → Environment Variables.
- Team members should never paste keys into docs, chat, or email.

## Good practices for staff
- Avoid uploading sensitive personal information (e.g., SSNs, medical records).
- For important decisions, double‑check the cited source document.
- Keep uploads small and relevant to your question.

## Request removal or access changes
- To remove a document from search results, remove it from the indexed Drive folder or adjust permissions.
- To grant a user access, update permissions in Google Drive as usual.

## Incident response (who/what/where)
- Who to contact: danielvoyevoda@outlook.com or current technical staff
- Where to check: Vercel logs, Google Cloud logs (Vertex AI Search), OpenAI usage dashboard.
- How to disable keys quickly: in Vercel, delete or rotate the related environment variable; in Google Cloud/OpenAI, rotate the key.
