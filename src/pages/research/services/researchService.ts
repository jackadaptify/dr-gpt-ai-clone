import { supabase } from '../../../../lib/supabase';

export interface ResearchMessage {
    role: 'user' | 'model' | 'system';
    content: string;
}

export const streamResearchChat = async (
    messages: ResearchMessage[],
    onChunk: (chunk: string) => void
): Promise<string> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No active session");

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages,
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`Research API Error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (!reader) throw new Error("No response body");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Process SSE format if needed, but OpenRouter usually sends raw chunks or SSE data: lines.
            // Simplified parsing assuming standard OpenRouter SSE structure "data: { ... }"

            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6);
                    if (dataStr === '[DONE]') continue;

                    try {
                        const data = JSON.parse(dataStr);
                        const content = data.choices?.[0]?.delta?.content || '';
                        if (content) {
                            fullResponse += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }

        return fullResponse;

    } catch (error) {
        console.error('Research Service Error:', error);
        throw error;
    }
};
