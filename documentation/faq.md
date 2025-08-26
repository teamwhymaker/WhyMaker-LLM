# Frequently Asked Questions (FAQ)

## What is the chatbot using to answer?
It searches our documents (Google/Vertex AI Search) and uses OpenAI to write.

## Can I upload files?
Yes—PDF, Word, PowerPoint, and images. The Smart model works best.

## Is my data safe?
Yes—access is limited to our documents; uploads are used to answer your question only.

## Why does sign‑in use “redirect URI” instead of URL?
That’s the technical name from the OAuth standard.

## Do I need to change anything if the domain changes?
Update the Google OAuth redirect URI and the variable in Vercel.

## Who can maintain this if the developer is away?
Any admin with access to Vercel, Google Cloud, and OpenAI billing can rotate keys and redeploy.

## What if the answer seems wrong?
Ask a follow‑up with more specifics, try the Smart model, or check the source document.

## Will the chatbot learn private information from my question?
No. It uses your input to answer the current request and doesn’t publish that information.

## Can we rebrand the name shown in the browser tab?
Yes. Change `NEXT_PUBLIC_SITE_NAME` in Vercel and redeploy.

## How long do DNS changes take when we move domains?
Usually 5–60 minutes, sometimes up to an hour.

## Who do I contact for help?
See Troubleshooting → `troubleshooting.md` for current contact details.
