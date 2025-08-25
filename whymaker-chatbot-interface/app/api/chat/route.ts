import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { SearchServiceClient } from "@google-cloud/discoveryengine";
import { GoogleAuth } from "google-auth-library";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Accept either JSON or multipart/form-data so users can attach files
    const contentType = req.headers.get("content-type") || "";
    let question: string = "";
    let chat_history: any[] = [];
    let model: string = "gpt-4o-mini";
    let uploadedFiles: File[] = [];

    if (/multipart\/form-data/i.test(contentType)) {
      const form = await req.formData();
      question = String(form.get("question") || "");
      model = String(form.get("model") || model);
      const historyRaw = form.get("chat_history");
      if (typeof historyRaw === "string" && historyRaw.trim()) {
        try { chat_history = JSON.parse(historyRaw); } catch {}
      }
      const files = form.getAll("files");
      uploadedFiles = files.filter((f): f is File => typeof f !== "string" && f instanceof File);
    } else {
      const data = await req.json();
      question = data?.question;
      chat_history = data?.chat_history || [];
      model = data?.model || model;
    }

    if (!question) {
      return Response.json({ error: "Question is required" }, { status: 400 });
    }

    // Check for user OAuth token (for Drive datastores)
    let usingUserOAuth = false;
    let oauthAccessToken: string | undefined;
    const jar = await cookies();
    const oauthCookie = jar.get("wm_google_oauth")?.value;
    if (oauthCookie) {
      try {
        const tokenData = JSON.parse(Buffer.from(oauthCookie, "base64").toString("utf8"));
        const expiresAt = (tokenData.obtained_at || 0) + (tokenData.expires_in || 0) * 1000;
        if (tokenData.access_token && Date.now() < expiresAt) {
          usingUserOAuth = true;
          oauthAccessToken = tokenData.access_token;
        }
      } catch {}
    }

    // Always use service account for SearchServiceClient (avoid auth compatibility issues)
    const serviceAccountJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error("GCP_SERVICE_ACCOUNT_JSON environment variable is not set");
    }
    const credentials = JSON.parse(serviceAccountJson);
    const searchClient = new SearchServiceClient({
      credentials,
      projectId: process.env.VERTEX_PROJECT_ID!,
    });

    // Debug: verify client config
    console.log("[VertexSearch] Using project:", process.env.VERTEX_PROJECT_ID);
    if (!usingUserOAuth) {
      console.log("[VertexSearch] Service account email:", credentials.client_email);
    } else {
      console.log("[VertexSearch] Using user OAuth token");
    }

    // Build the serving config path safely
    const projectId = process.env.VERTEX_PROJECT_ID!;
    const location = process.env.VERTEX_LOCATION || "global";
    const explicitServingConfig = (process.env.VERTEX_SERVING_CONFIG || "").trim();
    const engineId = (process.env.VERTEX_ENGINE_ID || "").trim();
    const dataStoreIdEnv = (process.env.VERTEX_DATA_STORE_ID || "").trim();

    let servingConfig = "";
    let attemptedEngineFirst = false;

    if (explicitServingConfig) {
      servingConfig = explicitServingConfig;
    } else if (engineId) {
      attemptedEngineFirst = true;
      servingConfig = `projects/${projectId}/locations/${location}/collections/default_collection/engines/${engineId}/servingConfigs/default_search`;
    } else if (dataStoreIdEnv) {
      servingConfig = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreIdEnv}/servingConfigs/default_search`;
    } else {
      throw new Error("Missing Vertex Search configuration. Provide VERTEX_SERVING_CONFIG or VERTEX_ENGINE_ID or VERTEX_DATA_STORE_ID.");
    }

    // Helper to robustly extract snippet text from a result document
    const extractSnippets = (doc: any): string[] => {
      const snippets: string[] = [];
      if (!doc) return snippets;

      const ds = (doc as any).derivedStructData;

      const extractFromObject = (obj: any): string[] => {
        const out: string[] = [];
        if (!obj || typeof obj !== "object") return out;
        const candidates = ["snippet", "content", "text", "title", "description", "stringValue"];
        for (const key of candidates) {
          const v = (obj as any)[key];
          if (typeof v === "string" && v.trim()) out.push(v.trim());
        }
        // listValue/structValue shapes
        const list = (obj as any)?.listValue?.values;
        if (Array.isArray(list)) {
          for (const v of list) {
            if (typeof v?.stringValue === "string" && v.stringValue.trim()) out.push(v.stringValue.trim());
          }
        }
        const fields = (obj as any)?.structValue?.fields;
        if (fields && typeof fields === "object") {
          for (const k of Object.keys(fields)) {
            const v = fields[k];
            if (typeof v?.stringValue === "string" && v.stringValue.trim()) out.push(v.stringValue.trim());
          }
        }
        return out;
      };

      const pushText = (value: any) => {
        if (value == null) return;
        if (Array.isArray(value)) {
          for (const v of value) {
            if (typeof v === "string") {
              const s = v.trim();
              if (s) snippets.push(s);
            } else if (typeof v === "object") {
              const arr = extractFromObject(v);
              for (const s of arr) if (s) snippets.push(s);
            }
          }
          return;
        }
        if (typeof value === "string") {
          const s = value.trim();
          if (s) snippets.push(s);
          return;
        }
        if (typeof value === "object") {
          const arr = extractFromObject(value);
          for (const s of arr) if (s) snippets.push(s);
        }
      };

      // Case A: plain JS object (sometimes present on Node)
      if (ds && typeof ds === "object" && !("fields" in ds)) {
        if ("snippets" in ds) pushText((ds as any).snippets);
        if ("extractiveAnswers" in ds) pushText((ds as any).extractiveAnswers);
      }

      // Case B: protobuf Struct-like object (v1alpha JSON)
      const collectStrings = (val: any, acc: string[]): void => {
        if (!val) return;
        if (typeof val === "string") {
          const s = val.trim();
          if (s) acc.push(s);
          return;
        }
        if (val.stringValue != null) {
          const s = String(val.stringValue).trim();
          if (s) acc.push(s);
          return;
        }
        if (val.listValue && Array.isArray(val.listValue.values)) {
          for (const v of val.listValue.values) collectStrings(v, acc);
          return;
        }
        if (val.structValue && val.structValue.fields) {
          const f = val.structValue.fields;
          const keys = Object.keys(f);
          for (const k of keys) collectStrings(f[k], acc);
          return;
        }
        // numbers/bools are not useful for context
      };

      const readFields = (fields: any): string[] => {
        const out: string[] = [];
        if (!fields || typeof fields !== "object") return out;
        const keys = Object.keys(fields);
        for (const key of keys) {
          const lower = key.toLowerCase();
          // Prioritize likely text carriers
          if (lower.includes("snippet") || lower.includes("extract") || lower.includes("text") || lower.includes("content")) {
            collectStrings(fields[key], out);
          }
        }
        return out;
      };

      if (ds && typeof ds === "object" && (ds as any).fields) {
        const out = readFields((ds as any).fields);
        for (const s of out) {
          const t = String(s).trim();
          if (t) snippets.push(t);
        }
      }

      return snippets;
    };

    // Utility: normalize SDK response (which can be an array of results or an object with .results)
    const toResultsArray = (response: any): any[] => {
      if (Array.isArray(response)) return response as any[];
      return (response?.results ?? []) as any[];
    };

    const resultCount = (response: any): number => toResultsArray(response).length;

    // Skip SDK search for user OAuth (has auth issues), rely on REST API below
    let searchResponse: any = { results: [] };
    
    if (!usingUserOAuth) {
      // Search for relevant documents using SDK (service account only)
      console.log("[VertexSearch] Searching with query:", question);
      [searchResponse] = await searchClient
        .search({
        servingConfig,
        query: question,
        pageSize: 8,
        })
        .catch(async (err: any) => {
          // If engine path fails (NOT_FOUND) and we have a datastore id, try datastore path for compatibility
          if ((String(err?.code) === "5" || /NOT_FOUND/i.test(String(err))) && attemptedEngineFirst && dataStoreIdEnv) {
            const dsServingConfig = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreIdEnv}/servingConfigs/default_search`;
          return await searchClient.search({
              servingConfig: dsServingConfig,
              query: question,
              pageSize: 8,
            });
          }
          throw err;
        });

      // If the first search returned no results, heuristically try the Data Store path as a second attempt
      if (resultCount(searchResponse) === 0 && dataStoreIdEnv) {
        const dsServingConfig = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreIdEnv}/servingConfigs/default_search`;
        try {
          console.log("[VertexSearch] engine returned 0; trying dataStore servingConfig=", dsServingConfig);
          const [fallbackResponse] = await searchClient.search({
            servingConfig: dsServingConfig,
            query: question,
            pageSize: 8,
          });
          // Only replace if the DS search actually returns results
          if (resultCount(fallbackResponse) > 0) {
            console.log("[VertexSearch] dataStore search produced results; switching to DS response.");
            searchResponse = fallbackResponse;
            servingConfig = dsServingConfig;
          } else {
            console.log("[VertexSearch] dataStore search also returned 0 results.");
          }
        } catch (e) {
          // ignore and keep original response
          console.log("[VertexSearch] dataStore search threw error:", e);
        }
      }
    }

    // Multi-query decomposition for complex questions
    const decomposeQuestion = (q: string): string[] => {
      const queries = [q]; // Always include the original
      const normalized = q.toLowerCase().trim();
      
      // Split on question markers and coordinating conjunctions
      const questionSplitRegex = /(?:\?\s*(?:and|also|what about|how about|who is|what is|where is|when is))|(?:\band\b|\bor\b|\balso\b)/i;
      const parts = q.split(questionSplitRegex).map(p => p.trim()).filter(p => p.length > 10);
      
      if (parts.length > 1) {
        for (const part of parts) {
          // Clean up fragments and ensure they're question-like
          let clean = part.replace(/^(and|or|also|what about|how about)\s*/i, "").trim();
          if (clean && !clean.endsWith('?')) clean += '?';
          if (clean.length > 15) queries.push(clean);
        }
      }
      
      // Extract obvious sub-questions with question words
      const subQuestions = Array.from(q.matchAll(/(who|what|where|when|how|why)\s+[^?]+\?/gi));
      for (const match of subQuestions) {
        const subQ = match[0].trim();
        if (subQ && !queries.includes(subQ)) queries.push(subQ);
      }
      
      return Array.from(new Set(queries)).slice(0, 4); // Cap at 4 queries max
    };

    const searchQueries = decomposeQuestion(question);
    console.log("[VertexSearch] Decomposed into", searchQueries.length, "queries:", searchQueries);

    // Use v1alpha REST API for all searches (works with both auth modes)
    let alphaResults: any[] | undefined;
    let alphaSummaryText: string | undefined;
    {
      // Create appropriate auth client based on mode
      let authClient: any;
      if (usingUserOAuth && oauthAccessToken) {
        // Use user OAuth token for REST calls
        authClient = {
          request: async (opts: any) => {
            const headers = { 
              ...opts.headers, 
              Authorization: `Bearer ${oauthAccessToken}`,
              'Content-Type': 'application/json'
            };
            const response = await fetch(opts.url, {
              method: opts.method || 'GET',
              headers,
              body: opts.data ? JSON.stringify(opts.data) : undefined,
            });
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            return { data: await response.json() };
          }
        };
      } else {
        // Use service account
        const auth = new GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });
        authClient = await auth.getClient();
      }
      const sc = (process.env.VERTEX_SERVING_CONFIG || servingConfig).replace(/^\//, "");
      const url = `https://discoveryengine.googleapis.com/v1alpha/${sc}:search`;

      const alphaSearch = async (q: string) => {
        try {
          const body = {
            query: q,
            pageSize: 10,
            languageCode: process.env.VERTEX_LANGUAGE_CODE || "en-US",
            queryExpansionSpec: { condition: "AUTO" },
            spellCorrectionSpec: { mode: "AUTO" },
            contentSearchSpec: {
              snippetSpec: { returnSnippet: true, maxSnippetCount: 5 },
              extractiveContentSpec: {
                maxExtractiveAnswerCount: 3,
                maxExtractiveSegmentCount: 10,
                numPreviousSegments: 1,
                numNextSegments: 1,
              },
            },
            userInfo: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" },
          } as any;
          const { data } = await (authClient as any).request({ url, method: "POST", data: body });
          return data as any;
        } catch (e) {
          console.log("[VertexSearch] v1alpha REST error for query=", q, e);
          return undefined;
        }
      };

      const seenDocIds = new Set<string>();
      const collect = (arr: any[]) => {
        for (const r of arr || []) {
          const id = r?.document?.id || r?.document?.name;
          if (id && !seenDocIds.has(id)) {
            seenDocIds.add(id);
            (alphaResults ||= []).push(r);
          }
        }
      };

      // Search all decomposed queries
      for (const [index, query] of searchQueries.entries()) {
        console.log(`[VertexSearch] Running query ${index + 1}/${searchQueries.length}: "${query}"`);
        const result = await alphaSearch(query);
        
        if (Array.isArray(result?.results)) {
          console.log(`[VertexSearch] Query ${index + 1} produced ${result.results.length} results`);
          if (!alphaResults) alphaResults = [];
          collect(result.results);
        }
        
        if (!alphaSummaryText && result?.summary?.summaryText) {
          alphaSummaryText = String(result.summary.summaryText).trim();
        }
      }

      // Generic expansion strategy for low-recall queries
      const buildExpansions = (q: string): string[] => {
        const expansions: string[] = [];
        const normalized = q.replace(/\s+/g, " ").trim();
        // 1) Extract capitalized multi-word names (e.g., "Lisa Pitura")
        const nameMatches = Array.from(normalized.matchAll(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}/g)).map(m => m[0]);
        for (const name of nameMatches) expansions.push(name);
        // 2) Remove leading wh-phrases like "who is", "what is", etc.
        const stripped = normalized.replace(/^(who|what|where|when|how)\s+(is|are|was|were|does|do|did)\s+/i, "");
        if (stripped && stripped !== normalized) expansions.push(stripped);
        // 3) Add a version with the company name appended if missing
        if (!/\bWhyMaker\b/i.test(normalized)) {
          expansions.push(`${stripped || normalized} WhyMaker`);
        }
        // 4) Noun-ish tokens (drop stopwords)
        const stop = new Set(["the","a","an","of","for","to","in","on","at","and","or","with","about","who","what","where","when","how","is","are","was","were","does","do","did","whats","who's","what's"]);
        const tokens = normalized.split(/[^A-Za-z]+/).filter(t => t && !stop.has(t.toLowerCase()) && t.length > 2);
        // Build a couple of 1-2 gram variants
        for (let i = 0; i < tokens.length; i++) {
          expansions.push(tokens[i]);
          if (i + 1 < tokens.length) expansions.push(`${tokens[i]} ${tokens[i+1]}`);
        }
        // De-dupe and cap
        return Array.from(new Set(expansions)).slice(0, 8);
      };
      // Only use expansion queries if we still have low total results after multi-query search
      const expansionQueries = (alphaResults?.length ?? 0) >= 3 ? [] : buildExpansions(question);

      collect(alphaResults || []);

      for (const q of expansionQueries) {
        const extra = await alphaSearch(q);
        if (Array.isArray(extra?.results)) collect(extra.results);
        if (!alphaSummaryText && extra?.summary?.summaryText) {
          alphaSummaryText = String(extra.summary.summaryText).trim();
        }
      }
    }

    // Extract snippets from search results
    const snippets: string[] = [];
    const results = (alphaResults ?? toResultsArray(searchResponse)) ?? [];
    console.log("[VertexSearch] Processing", results.length, "results");
    
    for (const r of results) {
      const doc = r.document;
      console.log("[VertexSearch] Document ID:", doc?.id);
      console.log("[VertexSearch] Document URI:", doc?.uri);
      
      // Try to extract snippets first
      const extracted = extractSnippets(doc);
      if (extracted.length > 0) {
        snippets.push(...extracted);
      }

      // If v1alpha result includes structured extractive answers/snippets, pull them explicitly
      try {
        const dsd = (doc as any)?.derivedStructData ?? {};
        const pushIf = (arr: any, key: string, subKey: string) => {
          if (Array.isArray(arr)) {
            for (const item of arr) {
              const v = item?.[subKey];
              if (typeof v === "string" && v.trim()) snippets.push(v.trim());
            }
          }
        };
        pushIf(dsd?.extractiveAnswers, "extractiveAnswers", "content");
        pushIf(dsd?.snippets, "snippets", "snippet");
        pushIf(dsd?.extractiveSegments, "extractiveSegments", "content");
      } catch {}

      if (snippets.length === 0) {
        // Fallback: use document title or URI as context if no snippets
        const title = (doc?.structData as any)?.title || doc?.name || "Document";
        const uri = doc?.uri || "";
        if (title && title !== "Document") {
          snippets.push(`From ${title}: ${uri}`);
        }
      }
    }

    if (snippets.length === 0) {
      const summaryText = alphaSummaryText || (searchResponse as any)?.summary?.summaryText;
      if (summaryText && String(summaryText).trim()) {
        snippets.push(String(summaryText).trim());
      }
    } else if (alphaSummaryText) {
      // Append summary for extra context if we have room
      snippets.push(alphaSummaryText);
    }

    // Minimal runtime debug to verify retrieval
    console.log("[VertexSearch] servingConfig=", servingConfig);
    console.log("[VertexSearch] results=", results.length, "snippets=", snippets.length);

    const context = snippets
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean)
      .join("\n\n");

    // Extract text from any uploaded files and append to context
    let uploadsContext = "";
    if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      const extractTextFromFile = async (file: File): Promise<string> => {
        try {
          const arrayBuf = await file.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          const name = (file.name || "").toLowerCase();
          if (name.endsWith(".pdf")) {
            const res = await pdfParse(buf);
            return String(res.text || "").trim();
          }
          if (name.endsWith(".docx") || name.endsWith(".doc")) {
            const res = await mammoth.extractRawText({ buffer: buf });
            return String(res.value || "").trim();
          }
          return buf.toString("utf8").trim();
        } catch {
          return "";
        }
      };
      const chunks: string[] = [];
      for (const f of uploadedFiles.slice(0, 4)) {
        const text = await extractTextFromFile(f);
        if (text) {
          chunks.push(`File: ${f.name}\n${text.slice(0, 8000)}`);
        }
      }
      uploadsContext = chunks.join("\n\n");
    }

    console.log("[VertexSearch] contextChars=", context.length);
    if (snippets.length > 0) {
      console.log("[VertexSearch] firstSnippetSample=", (snippets[0] || "").slice(0, 200));
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Convert chat history to OpenAI format
    // Single detailed prompt (markdown-forward) inspired by the local version
    const qa_system_prompt = (
      "You are a world-class business and educational assistant, specifically tailored for the WhyMaker team. " +
      "Your primary goal is to help WhyMaker staff create high-quality materials, including sales scripts, " +
      "marketing collateral, lesson plans, and more.\n\n" +
      "To answer the user's request, synthesize information from the following sources: \n" +
      "1. The provided internal WhyMaker documents (retrieved context below). \n" +
      "2. Any text extracted from the user's uploaded files (if provided).\n" +
      "3. Your general knowledge for broader context and information not available in the documents.\n\n" +
      "CRITICAL INSTRUCTIONS:\n" +
      "- Provide comprehensive, well-structured, and clear responses. Do not be overly brief.\n" +
      "- Use Markdown formatting (### Headers, - Bullet Points, and **bold text**) to improve readability, " +
      "and ensure outputs are easy to interpret.\n" +
      "- Prefer direct quotes and exact numbers from the CONTEXT when relevant.\n" +
      "- If the provided context doesn't contain a specific answer, clearly state that the information isn't " +
      "in WhyMaker's documents. Then, provide the best possible answer based on your general knowledge, " +
      "while noting it may not be specific to WhyMaker.\n\n" +
      `CONTEXT BEGIN\n${context}\n\n${uploadsContext ? `UPLOADED FILES\n${uploadsContext}\n` : ""}CONTEXT END`
    );

    const messages: any[] = [
      {
        role: "system",
        content: qa_system_prompt
      }
    ];

    // Add chat history
    for (const msg of chat_history) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      });
    }

    // Add current question
    messages.push({
      role: "user",
      content: question
    });

    // Get response from OpenAI
    // Handle model-specific parameter constraints
    const isReasoningModel = /^(?:o[134]|gpt-5)/i.test(model);
    
    const completionParams: any = {
      model: model,
      messages: messages,
      stream: true,
    };
    
    if (isReasoningModel) {
      // o1/o3/o4 and GPT‑5 series models use max_completion_tokens; some constrain temperature
      completionParams.temperature = 1;
      completionParams.max_completion_tokens = 1400;
    } else {
      // Traditional models support variable temperature and max_tokens
      completionParams.temperature = 0.6;
      completionParams.max_tokens = 1400;
    }
    
    const stream = await openai.chat.completions.create(completionParams);

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let loggedSample = false;
        const extractText = (chunk: any): string => {
          if (!chunk) return "";
          const choice = chunk?.choices?.[0] ?? {};
          const text = choice?.delta?.content ?? choice?.message?.content ?? (chunk as any)?.output_text ?? "";
          return typeof text === "string" ? text : "";
        };
        try {
          for await (const chunk of stream as any) {
            const delta = extractText(chunk);
            if (!loggedSample) {
              loggedSample = true;
              console.log("[OpenAI Stream] first chunk keys:", Object.keys(chunk || {}));
            }
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
