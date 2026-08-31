import type { IntelligenceResult } from "./types.js";

export type AIReasoningResult = { enabled: boolean; model?: string; content?: string | null; parsed?: unknown; reason?: string; usage?: unknown };

export async function reasonWithOpenAICompatible(result: IntelligenceResult, instruction: string): Promise<AIReasoningResult> {
  const key = process.env.AI_API_KEY;
  if (!key) return { enabled: false, reason: "AI_API_KEY not configured; deterministic intelligence remains available" };
  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-5-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 30000));
  const compact = {
    url: result.finalUrl,
    entity: result.entity,
    scores: { seo: result.seo, security: result.security, quality: result.quality, trust: result.trust },
    socials: result.socials,
    contacts: result.contacts,
    importantPages: result.importantPages,
    technologies: result.technologies,
    brand: result.brand,
    competitors: result.competitors,
    contradictions: result.contradictions,
    evidencePages: result.pages.map(p => ({ url: p.url, title: p.title, description: p.description, jsonLdTypes: p.jsonLdTypes, headings: p.headings.slice(0, 10), text: p.textSample.slice(0, 2500) }))
  };
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: Number(process.env.AI_TEMPERATURE || 0.1),
        max_tokens: Number(process.env.AI_MAX_TOKENS || 3000),
        messages: [
          { role: "system", content: "You are an evidence-first URL intelligence analyst. Never invent facts. Distinguish observed facts from inference. Cite source URLs from the supplied evidence. If uncertain, say so." },
          { role: "user", content: `${instruction}\n\nEvidence:\n${JSON.stringify(compact)}` }
        ]
      })
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = await response.json() as any;
    const content = data?.choices?.[0]?.message?.content ?? null;
    let parsed: unknown;
    if (typeof content === "string") { try { parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")); } catch { /* text is valid output too */ } }
    return { enabled: true, model, content, parsed, usage: data?.usage };
  } finally { clearTimeout(timer); }
}
