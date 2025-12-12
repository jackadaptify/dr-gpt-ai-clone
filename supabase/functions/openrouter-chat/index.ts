// @ts-nocheck - This is a Deno edge function, IDE is configured for Node.js
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const {
            messages,
            model,
            systemPrompt,
            endpoint = 'chat/completions',
            prompt,
            n,
            size,
            modalities,
            image_config,
            stream = true,
            reviewMode = false,
            currentContent = ''
        } = await req.json();

        const apiKey = Deno.env.get('OPENROUTER_API_KEY');

        if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY is not set');
        }

        // IMAGE GENERATION (Legacy/Direct Endpoint)
        if (endpoint === 'images/generations') {
            const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://dr-gpt.app',
                    'X-Title': 'Dr. GPT',
                },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    n: n || 1,
                    size: size
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('OpenRouter Image API Error:', errorText);
                throw new Error(`OpenRouter Image API Error: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // CHAT COMPLETION (Default)
        // Construct messages array
        const apiMessages = [];

        // Add refinement instructions if in review mode
        let finalSystemPrompt = systemPrompt || '';
        if (reviewMode && currentContent) {
            const refinementPrompt = `
VOCÊ ESTÁ EM MODO DE REFINAMENTO DE PRONTUÁRIO CLÍNICO.

PRONTUÁRIO ATUAL:
${currentContent}

INSTRUÇÕES ESPECIAIS:
1. Se o usuário pedir para MODIFICAR, ALTERAR, MUDAR, ADICIONAR ou REMOVER algo do prontuário:
   - PRIMEIRO: Responda de forma conversacional e amigável (ex: "Entendido, Dr. Atualizando agora." ou "Feito! Alterei conforme solicitado.")
   - DEPOIS: Retorne o prontuário COMPLETO atualizado dentro de uma tag especial
   - FORMATO OBRIGATÓRIO:
     [Sua resposta conversacional aqui]
     <UPDATE_ACTION>
     {"new_content": "CONTEÚDO COMPLETO DO PRONTUÁRIO ATUALIZADO AQUI"}
     </UPDATE_ACTION>
   - O JSON deve conter o prontuário inteiro atualizado, não apenas a parte modificada
   - NÃO adicione comentários ou explicações dentro do new_content, apenas o documento

2. Se o usuário fizer uma PERGUNTA ou CONSULTA (não pedindo mudanças):
   - Responda normalmente sem a tag <UPDATE_ACTION>
   - Seja direto, técnico e útil

EXEMPLO de refinamento:
Usuário: "Mude torsilax para dipirona"
Sua resposta: "Entendido, Dr. Atualizando a medicação agora.
<UPDATE_ACTION>
{"new_content": "# PRONTUÁRIO MÉDICO\\n\\nS: Paciente com lombalgia...\\n\\nCONDUTA: Dipirona 500mg..."}
</UPDATE_ACTION>"
`;
            finalSystemPrompt = refinementPrompt + (finalSystemPrompt ? `\n\n${finalSystemPrompt}` : '');
        }

        if (finalSystemPrompt) {
            apiMessages.push({ role: 'system', content: finalSystemPrompt });
        }
        if (messages) {
            apiMessages.push(...messages);
        }

        const body: any = {
            model: 'openai/gpt-4o-mini', // 🔒 HARDCODED: Clinical-Pro v1.0 Engine
            messages: apiMessages,
            stream: stream,
        };

        if (modalities) {
            body.modalities = modalities;
            // Force non-streaming for multimodal requests (images) to simplify parsing
            body.stream = false;
        }
        if (image_config) body.image_config = image_config;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://dr-gpt.app',
                'X-Title': 'Dr. GPT',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API Error:', errorText);
            throw new Error(`OpenRouter API Error: ${response.statusText} - ${errorText}`);
        }

        // Handle Non-Streaming Response (e.g. for Images)
        if (!stream) {
            const data = await response.json();
            console.log('Non-streaming response from OpenRouter:', JSON.stringify(data));

            // CRITICAL: Return the data as-is, already as JSON
            // Do NOT double-stringify it
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Handle Streaming Response
        const proxyStream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            controller.close();
                            break;
                        }
                        controller.enqueue(value);
                    }
                } catch (error) {
                    controller.error(error);
                } finally {
                    reader.releaseLock();
                }
            },
        });

        return new Response(proxyStream, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
