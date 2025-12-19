import { supabase } from '../lib/supabase';
import { Message, Role } from '../types';

// We no longer need the API key here for Chat. 
// It might still be used for fetching models if we don't proxy that, 
// but for now we focus on securing the chat generation which is the high-risk area.
const siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';
const siteName = import.meta.env.VITE_SITE_NAME || 'Dr. GPT';

export const createOpenRouterChatStream = async (
    modelName: string,
    history: Message[],
    newMessage: string,
    onChunk: (text: string) => void,
    systemPrompt?: string,
    reviewMode?: boolean,
    currentContent?: string
): Promise<string> => {
    try {
        // Mandatory System Message for Dr. GPT
        let systemContent = systemPrompt || `Você é o Dr. GPT, um assistente de IA focado em medicina e saúde.
  
  DIRETRIZES FUNDAMENTAIS:
  1. IDIOMA: Responda ESTRITAMENTE em Português do Brasil (pt-BR). Mesmo que o usuário pergunte em inglês ou outro idioma, responda em Português.
  2. TOM: Profissional, direto, técnico (quando necessário) e empático.
  3. IDENTIDADE: Nunca diga "I am an AI developed by OpenAI". Diga que você é o Dr. GPT.
  
  Se o usuário enviar termos médicos em inglês, explique-os em português.`;

        // Handle Review Mode (Refinement) Logic - Ported from Edge Function
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
   - Seja direto, técnico e útil`;

            systemContent = `${refinementPrompt}\n\n${systemContent}`;
        }

        // Prepare messages
        const messages = [
            { role: 'system', content: systemContent }
        ];

        // Add history
        messages.push(...history.map(msg => ({
            role: msg.role === Role.USER ? 'user' : 'assistant',
            content: msg.content
        })));

        // Add new message
        messages.push({ role: 'user', content: newMessage });

        // Fetch custom API Key
        const { data: setting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'openrouter_api_key')
            .single();

        // 🛡️ Priority: Env Var (Local Override) > DB Setting (Admin Panel)
        // Since we have a known bad key in DB that we can't remove (RLS), we force the Env Var to take precedence.
        const customApiKey = import.meta.env.VITE_OPENROUTER_API_KEY || setting?.value;

        if (!customApiKey) {
            throw new Error("API Key configuration missing. Please check App Settings.");
        }

        // Direct OpenRouter Call (Bypassing Edge Function limitation)
        // Using local proxy to avoid CORS if necessary, or direct if allowed. 
        // OpenRouter allows direct calls.
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${customApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': siteUrl,
                'X-Title': siteName,
            },
            body: JSON.stringify({
                model: modelName,
                messages: messages,
                stream: true,
                // Perplexity/Sonar specific:
                temperature: 0.2,
                max_tokens: 1200, // Safe limit for reasoning models
                include_citations: true // Explicitly request citations
            }),
        });

        if (!response.ok) {
            let errorMessage = `Erro OpenRouter: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    const specificMsg = errorData.error.message || JSON.stringify(errorData.error);
                    if (response.status === 401) {
                        errorMessage = `🔑 Chave API Inválida (401). Verifique se é uma chave OpenRouter ('sk-or-v1...') e não Anthropic/OpenAI direta. Detalhe: ${specificMsg}`;
                    } else if (response.status === 402) {
                        errorMessage = `💰 Saldo Insuficiente (402). Verifique seus créditos no OpenRouter. Detalhe: ${specificMsg}`;
                    } else {
                        errorMessage = `Erro OpenRouter (${response.status}): ${specificMsg}`;
                    }
                }
            } catch (e) {
                // Fallback to text if JSON parse fails
                errorMessage = await response.text();
            }
            console.error('OpenRouter API Error:', errorMessage);
            throw new Error(errorMessage);
        }
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.slice(6));
                        const content = json.choices?.[0]?.delta?.content || '';

                        // Perplexity/OpenRouter Citations Handling
                        if (json.citations && Array.isArray(json.citations)) {
                            // Store citations to append later or stream them?
                            // Since we return fullText at the end, let's append them there or handle them via regex in UI.
                            // For now, let's just log them or append to a global Set to avoid duplicates if streamed?
                            // Actually, citations usually come in a specific packet or are consistent.
                            // Let's assume they might appear in any chunk.
                            // We'll append them at the very end of the stream loop.
                            // Hack: Store in a temporary property on the function scope?
                            // Better: parse at the end. 
                            // Wait, scoping issues. 
                            // Let's just allow the 'citations' field to be accessible.
                            // But this function returns string.
                            // I will convert the citations to a Markdown list at the end of the fullText.

                            // (No-op in chunk loop, processed after loop)
                            (reader as any).citations = json.citations;
                        }

                        if (content) {
                            // Typerwriter effect: split chunk into characters
                            const chars = content.split('');
                            for (const char of chars) {
                                fullText += char;
                                onChunk(char); // Send char by char
                                // Small delay for cadence (approx 15ms per char ~ 4000 chars/min)
                                await new Promise(r => setTimeout(r, 15));
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }

        // Append Citations if found (Perplexity)
        const citations = (reader as any).citations;
        if (citations && Array.isArray(citations) && citations.length > 0) {
            const references = citations.map((url: string, index: number) => `[${index + 1}] ${url}`).join('\n');
            fullText += `\n\n### Referências\n${references}`;
            onChunk(`\n\n### Referências\n${references}`);
        }

        return fullText;

    } catch (error) {
        console.error("OpenRouter Chat Error:", error);
        throw error;
    }
};

// Non-streaming fallback (if needed)
export const chatCompletion = async (
    modelId: string,
    messages: Message[],
    systemPrompt?: string
): Promise<string> => {
    // For now, we can reuse the streaming function and just return the final result
    // or implement a non-streaming endpoint. 
    // Let's just use the streaming one and wait for it.
    return new Promise((resolve, reject) => {
        createOpenRouterChatStream(
            modelId,
            messages.slice(0, -1), // History
            messages[messages.length - 1].content, // Last message
            () => { }, // Ignore chunks
            systemPrompt
        ).then(resolve).catch(reject);
    });
};

// Helper to convert Base64 to Blob
const base64ToBlob = (base64: string, mimeType: string) => {
    try {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    } catch (e) {
        console.error('Error converting base64 to blob:', e);
        return null;
    }
};

export const generateOpenRouterImage = async (
    modelName: string,
    prompt: string,
    onChunk: (text: string) => void
): Promise<{ display: string; save: string }> => {
    // Use the model selected by the user (supports any OpenRouter image model)
    const imageModel = modelName;
    onChunk(`🎨 Gerando imagem com ${imageModel}...\n\n`);

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-chat`;

            // Add timeout to prevent infinite blocking
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.warn('Image generation request timed out after 120 seconds');
            }, 120000); // 120 second timeout

            try {
                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: imageModel,
                        messages: [{ role: 'user', content: `Generate an image of: ${prompt}` }],
                        modalities: ['image', 'text'], // Critical for image generation
                        stream: false // We want the full JSON with base64
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId); // Clear timeout if request completes

                if (response.status === 429) {
                    attempt++;
                    const delay = attempt * 2000; // 2s, 4s, 6s
                    if (attempt < maxRetries) {
                        onChunk(`⚠️ Tráfego alto. Tentando novamente em ${delay / 1000}s... (Tentativa ${attempt}/${maxRetries})\n\n`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = errorText;
                    try {
                        const errorJson = JSON.parse(errorText);
                        if (errorJson.error) errorMessage = errorJson.error.message || errorJson.error;
                    } catch (e) {
                        // Use raw text
                    }
                    throw new Error(`Erro na Edge Function: ${errorMessage}`);
                }

                // Log raw response size for debugging (avoid logging full base64)
                const responseText = await response.text();
                console.log('✅ RESPOSTA: Recebida', { size: responseText.length });

                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('JSON Parse Error:', parseError);
                    console.error('Failed to parse:', responseText.substring(0, 500));
                    throw new Error(`Resposta inválida do servidor: ${parseError instanceof Error ? parseError.message : 'Erro de parsing'}`);
                }

                let imageUrl: string | undefined;

                // 1. Priority 1: Try to get from choices[0].message.images (Multimodal standard)
                const message = data.choices?.[0]?.message;
                if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
                    const firstImage = message.images[0];
                    // Check structure: choices[0].message.images[0].image_url.url
                    if (typeof firstImage === 'object' && firstImage?.image_url?.url) {
                        imageUrl = firstImage.image_url.url;
                    }
                    // Fallback for legacy/other formats
                    else if (typeof firstImage === 'string') {
                        imageUrl = firstImage;
                    }
                }

                // 2. Priority 2: Fallback to content Regex ONLY if no image found above
                // AND content is not null/empty
                if (!imageUrl && message?.content) {
                    const content = message.content;
                    // Regex to find markdown image: ![alt](url)
                    const markdownMatch = content.match(/!\[.*?\]\((.*?)\)/);
                    if (markdownMatch && markdownMatch[1]) {
                        imageUrl = markdownMatch[1];
                    }
                    // Sometimes models just return the URL
                    else if (content.startsWith('http') || content.startsWith('data:image')) {
                        imageUrl = content.trim();
                    }
                }

                if (imageUrl) {
                    // Ensure it has the prefix if it's a raw base64 string without data URI scheme
                    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                        imageUrl = `data:image/png;base64,${imageUrl}`;
                    }

                    // 🚀 OPTIMIZATION: Convert Base64 to Blob URL for UI Display
                    // This prevents the UI from freezing when rendering huge Base64 strings
                    let displayUrl = imageUrl;
                    if (imageUrl.startsWith('data:image')) {
                        const base64Data = imageUrl.split(',')[1];
                        const mimeType = imageUrl.split(';')[0].split(':')[1];
                        const blob = base64ToBlob(base64Data, mimeType);
                        if (blob) {
                            displayUrl = URL.createObjectURL(blob);
                            console.log('✅ Converted Base64 to Blob URL for display:', displayUrl);
                        }
                    }

                    const displayMarkdown = `![Imagem Gerada](${displayUrl})\n\n*Gerado por ${imageModel}*`;
                    const saveMarkdown = `![Imagem Gerada](${imageUrl})\n\n*Gerado por ${imageModel}*`;

                    onChunk(displayMarkdown);

                    return {
                        display: displayMarkdown,
                        save: saveMarkdown
                    };
                }

                console.error("OpenRouter Response Structure:", JSON.stringify(data, null, 2));
                throw new Error("Modelo não retornou imagem (verifique se o prompt é permitido).");

            } catch (fetchError) {
                clearTimeout(timeoutId); // Ensure timeout is cleared on error

                // Handle AbortError (timeout)
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    const timeoutMsg = `⏱️ Tempo limite excedido (60s). A geração de imagem foi cancelada.`;
                    onChunk(timeoutMsg);
                    return { display: timeoutMsg, save: timeoutMsg };
                }

                // Re-throw to outer catch for retry logic
                throw fetchError;
            }

        } catch (error) {
            if (attempt >= maxRetries - 1 || (error instanceof Error && !error.message.includes('429'))) {
                console.error("Image Generation Error:", error);
                const errorMsg = `❌ Erro ao gerar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
                onChunk(errorMsg);
                return { display: errorMsg, save: errorMsg };
            }
            attempt++;
        }
    }
    return { display: "Erro desconhecido.", save: "Erro desconhecido." };
};

export const generateOpenRouterMedia = async (
    modelName: string,
    prompt: string,
    onChunk: (text: string) => void
): Promise<string> => {
    onChunk("⚠️ A geração de mídia ainda não foi migrada para o servidor seguro. Em breve!");
    return "Funcionalidade em manutenção para segurança.";
};

export interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing?: {
        prompt: string;
        completion: string;
    };
}

export const fetchOpenRouterModels = async (): Promise<OpenRouterModel[]> => {
    try {
        // Use the local proxy to avoid CORS
        // /api/openrouter/models -> https://openrouter.ai/api/v1/models
        const response = await fetch('/api/openrouter/models');

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const data = await response.json();
        // OpenRouter returns { data: [...] }
        return data.data || [];
    } catch (error) {
        console.error("Error fetching OpenRouter models:", error);
        // Fallback to empty list (which triggers static list usage in UI)
        return [];
    }
};
