import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { AVAILABLE_MODELS, AIModel } from '../types';
import { adminService } from './adminService';

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

// Helper to get key
async function getOpenRouterKey(): Promise<string> {
    if (openRouterKey) return openRouterKey;
    const storedKey = await adminService.getApiKey(); // You might need to import adminService
    if (storedKey) return storedKey;
    throw new Error("No API Key found (Env or DB)");
}

export const modelHealthService = {

    async checkAllProviders(): Promise<ProviderHealth[]> {
        const result = await this.checkOpenRouter();
        return [result];
    },

    async checkOpenRouter(): Promise<ProviderHealth> {
        const start = Date.now();
        try {
            const apiKey = await getOpenRouterKey();

            const openai = new OpenAI({
                apiKey: apiKey,
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
            let errorMessage = error.message || 'Unknown error';
            if (errorMessage.includes('No API Key')) {
                errorMessage = 'API Key não configurada. Adicione em .env ou no Admin.';
            }
            return {
                provider: 'OpenRouter',
                status: 'offline',
                latency: Date.now() - start,
                lastCheck: Date.now(),
                error: errorMessage
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
            const apiKey = await getOpenRouterKey();

            const openai = new OpenAI({
                apiKey: apiKey,
                baseURL: "https://openrouter.ai/api/v1",
                dangerouslyAllowBrowser: true
            });

            // Handle image/video models
            if (model.modelId.includes('flux') || model.modelId.includes('dall-e') || model.modelId.includes('image')) {
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
            } else if (errorMessage.includes('No API Key')) {
                errorMessage = 'Sem API Key';
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
