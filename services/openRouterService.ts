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
    currentContent?: string,
    onMessageUpdate?: (msg: Message) => void,
    onComplete?: (msg: Message) => void
): Promise<string> => {
    // 🛡️ Config Validation
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (supabaseUrl.includes('your-project.supabase.co')) {
        throw new Error('Ambiente não configurado: Atualize VITE_SUPABASE_URL no arquivo .env');
    }

    try {
        // Mandatory System Message for Dr. GPT
        let systemContent = systemPrompt || `Você é o Dr. GPT, um assistente de IA focado em medicina e saúde.
  
  DIRETRIZES FUNDAMENTAIS:
  1. IDIOMA: Responda ESTRITAMENTE em Português do Brasil (pt-BR). Mesmo que o usuário pergunte em inglês ou outro idioma, responda em Português.
  2. TOM: Profissional, direto, técnico (quando necessário) e empático.
  3. IDENTIDADE: Nunca diga "I am an AI developed by OpenAI". Diga que você é o Dr. GPT.
  
  Se o usuário enviar termos médicos em inglês, explique-os em português.`;

        // Handle Review Mode (Refinement) Logic
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

        // 1. Get Authentication (JWT)
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
            throw new Error('Usuário não autenticado via Supabase.');
        }

        // 2. Prepare Request Body for Edge Function
        const requestBody = {
            model: modelName,
            messages: messages,
            systemPrompt: systemContent,
            stream: true,
            reviewMode: reviewMode
        };

        // 3. Call Edge Function
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-chat`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'HTTP-Referer': siteUrl,
                'X-Title': siteName,
            },
            body: JSON.stringify(requestBody)
        });

        // 4. Handle Errors
        if (!response.ok) {
            let errorMessage = `Erro Edge Function: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    const specificMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
                    if (response.status === 401) errorMessage = `🔑 Erro de Autenticação na Edge Function.`;
                    else if (response.status === 500 && specificMsg.includes('402')) {
                        errorMessage = `💰 Saldo Insuficiente (OpenRouter). Verifique os créditos.`;
                    } else if (response.status === 500 && specificMsg.includes('401')) {
                        errorMessage = `🔑 Chave API Inválida (OpenRouter). Verifique a chave configurada na Edge Function.`;
                    } else {
                        errorMessage = specificMsg;
                    }
                }
            } catch (e) {
                errorMessage = await response.text();
            }
            console.error('Edge Function Error:', errorMessage);

            if (onMessageUpdate && onComplete) {
                const errorMsg: Message = {
                    id: 'error-' + Date.now(),
                    role: Role.MODEL,
                    content: `⚠️ **${errorMessage}**\n\nPor favor, tente novamente mais tarde.`,
                    timestamp: Date.now(),
                    isStreaming: false
                };
                onMessageUpdate(errorMsg);
                onComplete(errorMsg);
            }
            throw new Error(errorMessage);
        }

        // 5. Process Streaming Response
        if (!response.body) throw new Error('ReadableStream not supported.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        const citations: string[] = [];

        // Initial Callback
        let currentMessage: Message | undefined;
        if (onMessageUpdate) {
            currentMessage = {
                id: 'response-' + Date.now(),
                role: Role.MODEL,
                content: '',
                timestamp: Date.now(),
                isStreaming: true,
                modelId: modelName
            };
            onMessageUpdate(currentMessage);
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (!trimmed.startsWith('data: ')) continue;

                const jsonStr = trimmed.replace('data: ', '');
                try {
                    const json = JSON.parse(jsonStr);
                    const content = json.choices?.[0]?.delta?.content || '';

                    // Capture Citations
                    if (json.citations && Array.isArray(json.citations)) {
                        citations.push(...json.citations);
                    }

                    if (content) {
                        if (currentMessage) {
                            currentMessage.content += content;
                        }

                        // Typewriter effect
                        const chars = content.split('');
                        for (const char of chars) {
                            fullText += char;
                            onChunk(char);
                            await new Promise(r => setTimeout(r, 5));
                        }

                        if (onMessageUpdate) onMessageUpdate({ ...currentMessage! });
                    }
                } catch (e) {
                    console.warn('Error parsing stream chunk', e);
                }
            }
        }

        // Append Citations
        if (citations.length > 0) {
            const uniqueCitations = Array.from(new Set(citations));
            const references = uniqueCitations.map((url, index) => `[${index + 1}] ${url}`).join('\n');
            const refText = `\n\n### Referências\n${references}`;
            fullText += refText;
            if (currentMessage) {
                currentMessage.content += refText;
                if (onMessageUpdate) onMessageUpdate({ ...currentMessage });
            }
            onChunk(refText);
        }

        // Finalize
        if (currentMessage) {
            currentMessage.isStreaming = false;
            if (onMessageUpdate) onMessageUpdate(currentMessage);
            if (onComplete) onComplete(currentMessage);
        }

        return fullText;

    } catch (error: any) {
        console.error("OpenRouter Chat Error:", error);
        const errorMsg: Message = {
            id: 'error-' + Date.now(),
            role: Role.MODEL,
            content: `⚠️ **Erro de Conexão**: ${error.message || 'Erro desconhecido.'}`,
            timestamp: Date.now(),
            isStreaming: false
        };
        if (onMessageUpdate) onMessageUpdate(errorMsg);
        if (onComplete) onComplete(errorMsg);
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
