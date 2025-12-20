// @ts-nocheck - Deno Edge Function (Supabase). IDE may be configured for Node.js.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- CORS (fail-closed) ----
const ALLOWED_ORIGINS = new Set([
    "https://dr-gpt.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]);

function buildCorsHeaders(req: Request) {
    const origin = req.headers.get("Origin") ?? "";
    const isAllowed = ALLOWED_ORIGINS.has(origin);

    // Fail-closed: if origin isn't explicitly allowed, do NOT reflect it.
    // (Still return basic headers so server-to-server and curl work.)
    const allowOrigin = isAllowed ? origin : "https://dr-gpt.app";

    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Vary": "Origin",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, x-title, http-referer",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
}

// ---- Model control (critical cost control) ----
// Option A (recommended): lock to a single model (cheapest & predictable).
const DEFAULT_CHAT_MODEL = "openai/gpt-4o-mini"; // change to your desired default

// Option B: whitelist (if you really need multiple).
const ALLOWED_CHAT_MODELS = new Set([
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "openai/gpt-5.2-chat",
    "perplexity/sonar-reasoning-pro",
]);

const ALLOWED_IMAGE_MODELS = new Set([
    // add only if you actually use image generation via OpenRouter
]);

serve(async (req: Request) => {
    const corsHeaders = buildCorsHeaders(req);

    // Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // Only allow POST
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        // 1) AUTH: Require JWT
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2) Validate JWT against Supabase
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        if (!supabaseUrl || !supabaseAnonKey) {
            // Server misconfig (do not leak details)
            return new Response(JSON.stringify({ error: "Server misconfigured" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3) Parse JSON safely
        let payload: any = {};
        try {
            payload = await req.json();
        } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const {
            messages,
            systemPrompt,
            endpoint = "chat/completions",
            prompt,
            n,
            size,
            modalities,
            image_config,
            stream = true,
            reviewMode = false,
            currentContent = "",
            // DO NOT accept apiKey from client (ignored)
            // apiKey,
            // model (we will control)
        } = payload;

        // 4) Read OpenRouter key from Secrets ONLY
        const openrouterKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
        if (!openrouterKey) {
            return new Response(JSON.stringify({ error: "Server misconfigured" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 5) Route: images
        if (endpoint === "images/generations") {
            const imageModel = payload?.model;
            if (imageModel && !ALLOWED_IMAGE_MODELS.has(imageModel)) {
                return new Response(JSON.stringify({ error: "Model not allowed" }), {
                    status: 403,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${openrouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://dr-gpt.app",
                    "X-Title": "Dr. GPT",
                },
                body: JSON.stringify({
                    model: imageModel,
                    prompt,
                    n: n || 1,
                    size,
                }),
            });

            if (!response.ok) {
                // sanitize
                return new Response(JSON.stringify({ error: "Provider error" }), {
                    status: 502,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 6) Route: chat
        // Model: lock or whitelist
        const model = payload?.model;

        // ✅ CORREÇÃO OBRIGATÓRIA: Validar modelo e evitar fallback
        if (!model || typeof model !== 'string') {
            console.error("Missing model parameter");
            return new Response(JSON.stringify({ error: "Model not provided" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Hard guarantee: never allow unknown models
        if (!ALLOWED_CHAT_MODELS.has(model)) {
            return new Response(JSON.stringify({ error: "Model not allowed" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ---- DEEP RESEARCH CREDIT CHECK ----
        if (model === "perplexity/sonar-reasoning-pro") {
            // Call the RPC function to deduct credit safely
            const { data: creditDeducted, error: creditError } = await supabaseClient.rpc('deduct_research_credit', {
                user_id: user.id
            });

            if (creditError) {
                console.error("Credit check failed:", creditError);
                return new Response(JSON.stringify({ error: "Failed to check credits" }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            if (creditDeducted !== true) {
                return new Response(JSON.stringify({ error: "Insufficient research credits (402)" }), {
                    status: 402, // Payment Required
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }
        // ------------------------------------

        const apiMessages: any[] = [];

        // Review mode prompt hardening
        let finalSystemPrompt = systemPrompt || "";
        if (reviewMode && currentContent) {
            const refinementPrompt = `
VOCÊ ESTÁ EM MODO DE REFINAMENTO DE PRONTUÁRIO CLÍNICO.

PRONTUÁRIO ATUAL:
${currentContent}

INSTRUÇÕES ESPECIAIS:
1. Se o usuário pedir para MODIFICAR, ALTERAR, MUDAR, ADICIONAR ou REMOVER algo do prontuário:
   - PRIMEIRO: Responda de forma conversacional e amigável.
   - DEPOIS: Retorne o prontuário COMPLETO atualizado dentro da tag:
     <UPDATE_ACTION>
     {"new_content": "CONTEÚDO COMPLETO DO PRONTUÁRIO ATUALIZADO AQUI"}
     </UPDATE_ACTION>

2. Se o usuário fizer uma PERGUNTA (não pedindo mudanças):
   - Responda normalmente sem a tag <UPDATE_ACTION>.
`;
            finalSystemPrompt = refinementPrompt + (finalSystemPrompt ? `\n\n${finalSystemPrompt}` : "");
        }

        if (finalSystemPrompt) apiMessages.push({ role: "system", content: finalSystemPrompt });
        if (messages) apiMessages.push(...messages);

        const body: any = { model, messages: apiMessages, stream: !!stream };

        if (modalities) {
            body.modalities = modalities;
            body.stream = false;
        }
        if (image_config) body.image_config = image_config;

        // Specific config for Research
        if (model === "perplexity/sonar-reasoning-pro") {
            body.max_tokens = 4000; // Deprecated but used by some providers
            body.max_output_tokens = 4000; // Preferable
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${openrouterKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://dr-gpt.app",
                "X-Title": "Dr. GPT",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            // sanitize upstream errors
            return new Response(JSON.stringify({ error: "Provider error" }), {
                status: response.status === 401 ? 502 : 502,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!stream) {
            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Stream proxy
        const proxyStream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) return controller.close();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        controller.enqueue(value);
                    }
                } catch (e) {
                    controller.error(e);
                } finally {
                    reader.releaseLock();
                    controller.close();
                }
            },
        });

        return new Response(proxyStream, {
            headers: {
                ...corsHeaders,
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch {
        // fail closed, no sensitive details
        return new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
