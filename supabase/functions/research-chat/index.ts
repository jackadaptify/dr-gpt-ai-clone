// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== CORS (fail-closed) ==========
const ALLOWED_ORIGINS = new Set([
    "https://app.doutorgpt.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]);

function buildCorsHeaders(req: Request) {
    const origin = req.headers.get("Origin") ?? "";
    const isAllowed =
        ALLOWED_ORIGINS.has(origin) || origin.startsWith("http://localhost:");
    return {
        "Access-Control-Allow-Origin": isAllowed ? origin : "",
        "Vary": "Origin",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
}

// ========== CONTROLES DE CUSTO (SEM LIMITAR TOKENS) ==========
const MAX_MESSAGES = 4;             // pesquisa individual: só as últimas 4
const MAX_CHARS_PER_MESSAGE = 4000; // corta prompts enormes (evita custo escondido)

function sanitizeMessages(messages: any[]) {
    const sliced = messages.slice(-MAX_MESSAGES);

    return sliced.map((m) => {
        const role = m?.role;
        let content = m?.content ?? "";
        if (typeof content !== "string") content = String(content);

        if (content.length > MAX_CHARS_PER_MESSAGE) {
            content =
                content.slice(0, MAX_CHARS_PER_MESSAGE) +
                "\n\n[TRUNCADO para reduzir custo]";
        }

        return { role, content };
    });
}

// ========== PROMPT (PUBMED-ONLY PARA REFERÊNCIAS) ==========
const RESEARCH_SYSTEM_PROMPT = `
Você é um assistente de pesquisa médica. Responda em português (Brasil).

OBJETIVO:
Responder com utilidade clínica e sempre citar evidências.

REGRAS OBRIGATÓRIAS DE REFERÊNCIA:
- As referências devem ser EXCLUSIVAMENTE do PubMed (NCBI).
- Cada referência deve incluir: (1) PMID e (2) link completo no formato:
  https://pubmed.ncbi.nlm.nih.gov/PMID/
- Se você NÃO tiver certeza do PMID, NÃO invente.
  Em vez disso, escreva: "Não encontrei um PMID confiável no PubMed para esta afirmação."

FORMATO DE SAÍDA (obrigatório):
1) Resposta (curta, prática, clinicamente útil)
2) "Referências (PubMed)" com 3–8 itens, cada item:
   - Título curto — PMID: XXXXXXXX — https://pubmed.ncbi.nlm.nih.gov/XXXXXXXX/

RESTRIÇÕES:
- Não cite Google, blogs, Wikipedia, sites de hospitais, UpToDate, etc. SOMENTE PubMed.
- Se não houver evidência boa no PubMed, diga isso claramente.
`.trim();

serve(async (req: Request) => {
    const corsHeaders = buildCorsHeaders(req);

    // Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // Fail-closed origin
    const origin = req.headers.get("Origin") ?? "";
    const originAllowed =
        ALLOWED_ORIGINS.has(origin) || origin.startsWith("http://localhost:");
    if (origin && !originAllowed) {
        return new Response(JSON.stringify({ error: "Origin not allowed" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        // Auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Body
        let body: any;
        try {
            body = await req.json();
        } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const {
            messages,
            stream = true,
            // max_tokens: NÃO definimos por padrão (sem limite forçado)
            // mas se o frontend mandar, a gente repassa (sem clamp)
            max_tokens,
            temperature = 0.2,
            top_p = 0.9,
        } = body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: "Missing or invalid messages[]" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY");
        if (!OPENROUTER_KEY) {
            return new Response(JSON.stringify({ error: "Missing OpenRouter Key" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ✅ ReaSony (não-PRO)
        const MODEL = "perplexity/sonar-reasoning";

        // Sanitiza + injeta system prompt
        const cleaned = sanitizeMessages(messages);
        const finalMessages = [
            { role: "system", content: RESEARCH_SYSTEM_PROMPT },
            ...cleaned.filter((m) => m?.role && m?.content),
        ];

        // Payload sem max_tokens por padrão
        const payload: any = {
            model: MODEL,
            messages: finalMessages,
            stream,
            temperature,
            top_p,
        };

        // Se o frontend mandar max_tokens, repassamos (sem clamp/sem teto)
        if (Number.isFinite(Number(max_tokens))) {
            payload.max_tokens = Number(max_tokens);
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "Content-Type": "application/json",
                "Accept": stream ? "text/event-stream" : "application/json",
                "HTTP-Referer": "https://app.doutorgpt.com",
                "X-Title": "DoutorGPT Research",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            return new Response(JSON.stringify({ error: "OpenRouter Error", details: errText }), {
                status: 502,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (stream) {
            return new Response(response.body, {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Internal error", details: String(error?.message ?? error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
