// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

// ========== CONFIG ==========
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MODEL_NAME = "gpt-4o-mini";

// ========== CORS ==========
const ALLOWED_ORIGINS = new Set([
    "https://app.doutorgpt.com",
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

// ========== TOOLS ==========
const TOOLS = [
    {
        type: "function",
        function: {
            name: "web_search",
            description: "Pesquisa na web por informações médicas, protocolos e evidências científicas.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "A consulta de pesquisa otimizada para encontrar diretrizes e papers.",
                    },
                },
                required: ["query"],
            },
        },
    },
];

// ========== DUCKDUCKGO SEARCH (NO KEY) ==========
async function performDuckDuckGoSearch(query: string): Promise<string> {
    try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        // Fake headers to look like a browser
        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        if (!response.ok) {
            throw new Error(`DuckDuckGo error: ${response.status}`);
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        if (!doc) throw new Error("Failed to parse DuckDuckGo HTML");

        const results = [];
        const elements = doc.querySelectorAll(".result__body");

        // Extract top 5 results
        let count = 0;
        for (const el of elements) {
            if (count >= 5) break;

            const titleEl = el.querySelector(".result__title .result__a");
            const snippetEl = el.querySelector(".result__snippet");
            const link = titleEl?.getAttribute("href");

            if (titleEl && snippetEl && link) {
                results.push({
                    title: titleEl.textContent,
                    snippet: snippetEl.textContent,
                    url: link
                });
                count++;
            }
        }

        if (results.length === 0) {
            return JSON.stringify({ message: "Nenhum resultado encontrado." });
        }

        return JSON.stringify(results);

    } catch (err) {
        console.error("Search Logic Error:", err);
        return JSON.stringify({ error: `Search failed: ${err.message}` });
    }
}

// ========== MAIN SERVE ==========
serve(async (req: Request) => {
    const corsHeaders = buildCorsHeaders(req);
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const { messages } = await req.json();
        if (!messages || !Array.isArray(messages)) throw new Error("Invalid messages format");

        if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

        // --- STEP 1: Call Model with Tools ---
        const initialPayload = {
            model: MODEL_NAME,
            messages: [
                {
                    role: "system",
                    content: "Você é um assistente de pesquisa médica. Se precisar de informações externas, USE A FERRAMENTA 'web_search'. Não invente fatos."
                },
                ...messages
            ],
            tools: TOOLS,
            tool_choice: "auto",
        };

        const firstResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(initialPayload)
        });

        if (!firstResponse.ok) {
            const err = await firstResponse.text();
            throw new Error(`OpenAI Step 1 Error: ${err}`);
        }

        const firstData = await firstResponse.json();
        const firstChoice = firstData.choices[0];
        const toolCalls = firstChoice.message.tool_calls;

        // If no tool call, just return the text response
        if (!toolCalls || toolCalls.length === 0) {
            return new Response(JSON.stringify(firstData), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // --- STEP 2: Execute Tools ---
        const toolCall = toolCalls[0];
        let toolResult = "";

        if (toolCall.function.name === "web_search") {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`Executing Search: ${args.query}`);
            toolResult = await performDuckDuckGoSearch(args.query);
        }

        // --- STEP 3: Call Model with Results (Streaming) ---
        const finalMessages = [
            ...initialPayload.messages,
            firstChoice.message,
            {
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: toolResult
            },
            {
                role: "system",
                content: `
DADOS DA PESQUISA ACIMA.
Agora responda à pergunta do usuário usando APENAS os dados da pesquisa.
REGRAS:
1. Cite as fontes usando o formato [1] (Título/URL).
2. Se não houver resposta nos dados, diga que não encontrou.
3. Responda em Português do Brasil.
            `.trim()
            }
        ];

        const finalPayload = {
            model: MODEL_NAME,
            messages: finalMessages,
            stream: true,
            temperature: 0.2
        };

        const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(finalPayload)
        });

        if (!finalResponse.ok) {
            const err = await finalResponse.text();
            throw new Error(`OpenAI Step 2 Error: ${err}`);
        }

        return new Response(finalResponse.body, {
            headers: {
                ...corsHeaders,
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        });

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
