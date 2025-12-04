import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { AVAILABLE_MODELS, AIModel } from '../types';

export interface ProviderHealth {
    provider: 'OpenRouter';
    status: 'online' | 'degraded' | 'offline';
    latency: number; // in ms
    lastCheck: number;
    error?: string;
}

export interface ModelHealth {
    id: string; // The internal ID (e.g. 'gemini-2.0-flash')
    name: string;
    status: 'online' | 'degraded' | 'offline';
    latency: number;
    lastCheck: number;
    error?: string;
    rawError?: string; // New: Original error message for debugging
}

export interface UsageStats {
    totalTokens: number;
    totalCost: number; // Estimated
    requestsCount: number;
}

const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';

// Simple concurrency limiter
async function asyncPool<T>(poolLimit: number, array: any[], iteratorFn: (item: any) => Promise<T>): Promise<T[]> {
    const ret: Promise<T>[] = [];
    const executing: Promise<void>[] = [];

    for (const item of array) {
        const p = Promise.resolve().then(() => iteratorFn(item));
        ret.push(p);

        if (poolLimit <= array.length) {
            const e: Promise<void> = p.then(() => {
                executing.splice(executing.indexOf(e), 1);
            });
            executing.push(e);
            if (executing.length >= poolLimit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(ret);
}

export const modelHealthService = {

    async checkAllProviders(): Promise<ProviderHealth[]> {
        const result = await this.checkOpenRouter();
        return [result];
    },

    async checkOpenRouter(): Promise<ProviderHealth> {
        const start = Date.now();
        try {
            if (!openRouterKey) throw new Error("Missing API Key");

            const openai = new OpenAI({
                apiKey: openRouterKey,
                baseURL: "https://openrouter.ai/api/v1",
                dangerouslyAllowBrowser: true
            });

            // Active Ping: Generate 1 token with a cheap model
            await openai.chat.completions.create({
                model: 'openai/gpt-4o-mini', // Reliable model for ping
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1
            });

            return {
                provider: 'OpenRouter',
                status: 'online',
                latency: Date.now() - start,
                lastCheck: Date.now()
            };
        } catch (error: any) {
            return {
                provider: 'OpenRouter',
                status: 'offline',
                latency: Date.now() - start,
                lastCheck: Date.now(),
                error: error.message
            };
        }
    },

    async checkAllModels(): Promise<ModelHealth[]> {
        // Check 3 models at a time to avoid rate limits
        return asyncPool(3, AVAILABLE_MODELS, (model) => this.checkModel(model));
    },

    async checkModel(model: AIModel): Promise<ModelHealth> {
        const start = Date.now();
        try {
            if (!openRouterKey) throw new Error("No API Key");

            const openai = new OpenAI({
                apiKey: openRouterKey,
                baseURL: "https://openrouter.ai/api/v1",
                dangerouslyAllowBrowser: true
            });

            // Handle image/video models
            if (model.modelId.includes('flux') || model.modelId.includes('dall-e') || model.modelId.includes('image')) {
                // For check, we might skip generation to save cost/time or try a very small generation if possible.
                // OpenRouter doesn't always support generation check without cost.
                // We'll try a simple chat completion check if the model supports it (many do for capability check)
                // OR just assume online if the provider is online to save credits.
                // BUT user wants verification.
                // Let's try a minimal text request. Most multimodal models accept text input.
                // If it fails, we assume it's because it's an image-only model and try generation?
                // Actually, Flux/Dall-E on OpenRouter might be via standard completions or image endpoint.
                // Let's try the standard completion first as a "ping".

                await openai.chat.completions.create({
                    model: model.modelId,
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 1
                });
            } else {
                // Standard LLM check
                await openai.chat.completions.create({
                    model: model.modelId,
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 1
                });
            }

            return {
                id: model.id,
                name: model.name,
                status: 'online',
                latency: Date.now() - start,
                lastCheck: Date.now()
            };

        } catch (error: any) {
            const originalError = error.message || 'Unknown error';
            let errorMessage = originalError;

            if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
                errorMessage = 'Cota Excedida / Rate Limit (429)';
            } else if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized')) {
                errorMessage = 'Erro de API Key (401)';
            } else if (errorMessage.includes('404') || errorMessage.toLowerCase().includes('not found')) {
                errorMessage = 'Modelo não encontrado (404)';
            }

            return {
                id: model.id,
                name: model.name,
                status: 'offline',
                latency: 0,
                lastCheck: Date.now(),
                error: errorMessage,
                rawError: originalError
            };
        }
    },

    async getGlobalStats(): Promise<UsageStats> {
        // Fetch aggregated stats from Supabase
        const { data, error } = await supabase
            .from('usage_logs')
            .select('tokens_input, tokens_output');

        if (error) {
            console.error("Failed to fetch usage stats", error);
            return { totalTokens: 0, totalCost: 0, requestsCount: 0 };
        }

        const totalTokens = data.reduce((acc, curr) => acc + (curr.tokens_input || 0) + (curr.tokens_output || 0), 0);
        const requestsCount = data.length;

        // Rough estimation: $0.50 per 1M tokens (average of cheap models)
        const totalCost = (totalTokens / 1_000_000) * 0.50;

        return {
            totalTokens,
            totalCost,
            requestsCount
        };
    }
};
