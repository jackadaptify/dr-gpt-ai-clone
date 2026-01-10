// @ts-nocheck - Supabase Edge Function (Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ================== CORS CONFIG ==================
 */
const ALLOWED_ORIGINS = [
    "https://app.doutorgpt.com",
    "https://doutorgpt.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
];

function corsHeaders(req: Request) {
    const origin = req.headers.get("Origin") || "";
    const allowOrigin = ALLOWED_ORIGINS.includes(origin)
        ? origin
        : "https://app.doutorgpt.com";

    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, x-title, http-referer",
        "Vary": "Origin",
    };
}

/**
 * ================== MODEL LOCK ==================
 */
/**
 * ================== MODEL LOCK ==================
 */
const LOCKED_MODEL = "gpt-4o";

serve(async (req) => {
    const cors = corsHeaders(req);

    // Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: cors });
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: cors }
        );
    }

    try {
        /**
         * ================== AUTH ==================
         */
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: cors }
            );
        }

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
            return new Response(
                JSON.stringify({ error: "Server misconfigured: Missing Keys" }),
                { status: 500, headers: cors }
            );
        }

        const supabase = createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data } = await supabase.auth.getUser();
        if (!data?.user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: cors }
            );
        }

        /**
         * ================== BODY ==================
         */
        const body = await req.json();
        const { messages, systemPrompt, stream = true } = body;

        if (!Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: "Invalid messages" }),
                { status: 400, headers: cors }
            );
        }

        const finalMessages = systemPrompt
            ? [{ role: "system", content: systemPrompt }, ...messages]
            : messages;

        /**
         * ================== OPENAI ==================
         */
        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: LOCKED_MODEL,
                    messages: finalMessages,
                    stream,
                    // No max_tokens needed for OpenAI usually, but can be added if cost control is desired
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(errorText, {
                status: 502,
                headers: cors,
            });
        }

        if (!stream) {
            const json = await response.json();
            return new Response(JSON.stringify(json), {
                headers: { ...cors, "Content-Type": "application/json" },
            });
        }

        return new Response(response.body, {
            headers: {
                ...cors,
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (err) {
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: cors }
        );
    }
});
