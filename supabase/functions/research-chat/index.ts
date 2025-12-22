// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
    "https://dr-gpt.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]);

function buildCorsHeaders(req: Request) {
    const origin = req.headers.get("Origin") ?? "";
    const isAllowed = ALLOWED_ORIGINS.has(origin) || origin.startsWith("http://localhost:");
    return {
        "Access-Control-Allow-Origin": isAllowed ? origin : "",
        "Vary": "Origin",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
}

serve(async (req: Request) => {
    const corsHeaders = buildCorsHeaders(req);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // Bloqueia origin não permitido (fail-closed de verdade)
    const origin = req.headers.get("Origin") ?? "";
    const originAllowed = ALLOWED_ORIGINS.has(origin) || origin.startsWith("http://localhost:");
    if (origin && !originAllowed) {
        return new Response(JSON.stringify({ error: "Origin not allowed" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
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

        let body: any;
        try {
            body = await req.json();
        } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { messages, stream = true } = body;
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

        const MODEL = "perplexity/sonar-reasoning-pro";

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "Content-Type": "application/json",
                "Accept": stream ? "text/event-stream" : "application/json",
                "HTTP-Referer": "https://dr-gpt.app",
                "X-Title": "Dr. GPT Research",
            },
            body: JSON.stringify({ model: MODEL, messages, stream }),
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
        return new Response(JSON.stringify({ error: "Internal error", details: String(error?.message ?? error) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
