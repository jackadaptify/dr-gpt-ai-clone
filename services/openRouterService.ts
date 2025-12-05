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
    systemPrompt?: string
): Promise<string> => {
    try {
        // Prepare messages
        const messages = history.map(msg => ({
            role: msg.role === Role.USER ? 'user' : 'assistant',
            content: msg.content
        }));
        messages.push({ role: 'user', content: newMessage });

        // Invoke Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('openrouter-chat', {
            body: {
                model: modelName,
                messages: messages,
                systemPrompt: systemPrompt
            },
        });

        if (error) throw error;

        // The Edge Function returns a stream, but supabase-js invoke might buffer it if not handled carefully.
        // However, for true streaming with supabase-js v2, we often need to access the raw response 
        // or use a specific pattern. 
        // Actually, supabase.functions.invoke returns a `data` which is the parsed JSON or Blob.
        // To get a stream, we might need to use the raw URL if the SDK doesn't support it easily yet 
        // or if it returns a ReadableStream.

        // Let's try to handle 'data' as a stream if possible, but usually 'invoke' awaits the response.
        // FIX: 'invoke' buffers by default. We need to use 'responseType: "stream"' if supported 
        // or just use fetch directly to the function URL.

        // Using raw fetch to Supabase Function URL for reliable streaming
        const { data: { session } } = await supabase.auth.getSession();
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-chat`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelName,
                messages: messages,
                systemPrompt: systemPrompt
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
                console.warn('Image generation request timed out after 60 seconds');
            }, 60000); // 60 second timeout

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
    // This still exposes the key if we use it here. 
    // Ideally we should proxy this too.
    // For now, let's return an empty list or a warning if no key is present,
    // but we won't break the build.
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": siteUrl,
                "X-Title": siteName,
            }
        });

        if (!response.ok) return [];

        const data = await response.json();
        return (data.data as OpenRouterModel[]).map(model => ({
            id: model.id,
            name: model.name,
        }));

    } catch (error) {
        console.error("Error fetching OpenRouter models:", error);
        return [];
    }
};
