import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const system = (
      "You generate very short chat titles.\n" +
      "Rules:\n" +
      "- 2 to 6 words, Title Case.\n" +
      "- No punctuation or emojis.\n" +
      "- Keep key nouns; drop filler words.\n" +
      "- If a proper noun appears (e.g., WhyMaker), include it.\n" +
      "- Output only the title text."
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      temperature: 0.3,
      max_tokens: 24,
      messages: [
        { role: "system", content: system },
        { role: "user", content: String(prompt) },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw
      .replace(/[\n\r]/g, " ")
      .replace(/[`"'()\[\]{}<>_*#~:;!?.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = cleaned.split(" ").filter(Boolean).slice(0, 6);
    let title = words.join(" ");
    if (title.length > 40) title = title.slice(0, 40).trim();

    if (!title) {
      const fallback = String(prompt)
        .replace(/[\n\r]/g, " ")
        .replace(/[`"'()\[\]{}<>_*#~:;!?.,]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .slice(0, 6)
        .join(" ");
      title = fallback || "New Chat";
    }

    return Response.json({ title });
  } catch (err) {
    console.error("Title generation error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}


