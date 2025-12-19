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
        const systemMessage = {
            role: 'system',
            content: `Você é o Dr. GPT, um assistente de IA focado em medicina e saúde.
  
  DIRETRIZES FUNDAMENTAIS:
  1. IDIOMA: Responda ESTRITAMENTE em Português do Brasil (pt-BR). Mesmo que o usuário pergunte em inglês ou outro idioma, responda em Português.
  2. TOM: Profissional, direto, técnico (quando necessário) e empático.
  3. IDENTIDADE: Nunca diga "I am an AI developed by OpenAI". Diga que você é o Dr. GPT.
  
  Se o usuário enviar termos médicos em inglês, explique-os em português.`
        };

        // Prepare messages with System Message first
        const messages = [systemMessage];

        // Add history
        messages.push(...history.map(msg => ({
            role: msg.role === Role.USER ? 'user' : 'assistant',
            content: msg.content
        })));

        // Add new message
        messages.push({ role: 'user', content: newMessage });

        // Invoke Supabase Edge Function - REMOVED REDUNDANT CALL
        // The previous call to supabase.functions.invoke was causing a double execution.
        // It was also failing to handle the stream correctly, leading to 500 errors or timeouts.
        // We now rely solely on the direct fetch below which is properly configured for streaming.

        // Using raw fetch to Supabase Function URL for reliable streaming
        const { data: { session } } = await supabase.auth.getSession();
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-chat`;

        // Fetch custom API Key if available
        // We import adminService dynamically or assume it's available global/imported
        // But better to use the import at top if possible. 
        // Since we can't easily add import at top in this chunk, we'll assume we can fetch it via same method or pass it.
        // Actually best is to import adminService at top.
        // Let's rely on adminService being imported (I'll add the import in a separate call if needed or just use database check here if safer).
        // Actually, I can just use adminService if I import it.

        // Wait, for now let's use the supabase client to fetch it directly to avoid circular dependency if adminService uses openRouterService.
        // adminService uses supabase.
        // openRouterService uses supabase.
        // Circular dependency is unlikely but possible if adminService imports openRouterService.
        // Let's just do the DB query manually here, it's safer.

        const { data: setting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'openrouter_api_key')
            .single();

        const customApiKey = setting?.value;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelName,
                messages: messages,
                systemPrompt: systemPrompt,
                reviewMode: reviewMode,
                currentContent: currentContent,
                apiKey: customApiKey // 🔑 Inject the API key!
            }),
        });

        if (!response.ok) throw new Error(`Function error: ${response.statusText}`);
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
                        if (content) {
                            fullText += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
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
