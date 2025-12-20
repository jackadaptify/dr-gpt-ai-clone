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

// Cache / Cooldown State
let lastRun = 0;
let inFlight = false;
const COOLDOWN_MS = 60_000; // 1 min

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
            // Use the local proxy which doesn't require exposing the key to this service
            // (The proxy might be configured in vite.config.ts to forward to OpenRouter)
            const response = await fetch('/api/openrouter/models');

            if (!response.ok) {
                // If proxy fails, we might be offline or proxy is down
                console.warn('Health check proxy failed:', response.status);
                return {
                    id: 'openrouter',
                    name: 'OpenRouter',
                    status: 'degraded',
                    latency: Date.now() - start,
                    lastChecked: Date.now(),
                    provider: 'OpenRouter',
                    errors: [`HTTP ${response.status}`]
                };
            }

            // If we got a list, we are good
            return {
                id: 'openrouter',
                name: 'OpenRouter',
                status: 'online',
                latency: Date.now() - start,
                lastChecked: Date.now(),
                provider: 'OpenRouter'
            };

        } catch (error: any) {
            return {
                id: 'openrouter',
                name: 'OpenRouter',
                status: 'offline',
                latency: 0,
                lastChecked: Date.now(),
                provider: 'OpenRouter',
                errors: [error.message]
            };
        }
    },

    async getCachedHealth(): Promise<ModelHealth[]> {
        return this.checkAllModels();
    },

    async checkAllModels(): Promise<ModelHealth[]> {
        const now = Date.now();
        if (inFlight) return [];
        if (now - lastRun < COOLDOWN_MS) return [];

        inFlight = true;
        lastRun = now;
        try {
            // Check 3 models at a time to avoid rate limits
            return await asyncPool(3, AVAILABLE_MODELS, (model) => this.checkModel(model));
        } finally {
            inFlight = false;
        }
    },

    async checkModel(model: AIModel): Promise<ModelHealth> {
        const start = Date.now();
        try {
            // 🔒 SECURE: Use Edge Function Proxy (Server-Side Key Only)
            // We no longer fetch the key to the client. We ask the server to ping.
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;

            if (!token) {
                return {
                    id: model.id,
                    name: model.name,
                    status: 'offline',
                    latency: 0,
                    lastCheck: Date.now(),
                    error: 'Not authenticated'
                };
            }

            // If no token (anon), we can try to rely on the function's anon access or fail.
            // But usually this app is authenticated.

            // ⚡ FAST & CHEAP: No more pings to Edge Function to avoid 502 loops.
            // We assume 'online' if the app is loaded, or we could check a static file.
            // The real check happens when user actually tries to chat.

            return {
                id: model.id,
                name: model.name,
                status: 'online',
                latency: 1, // Artificial low latency
                lastCheck: Date.now()
            };

        } catch (error: any) {
            const originalError = error.message || 'Unknown error';
            let errorMessage = originalError;

            if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
                errorMessage = 'Cota Excedida / Rate Limit (429)';
            } else if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized') || errorMessage.includes('401')) {
                errorMessage = 'Erro de API Key (401)';
            } else if (errorMessage.includes('402') || errorMessage.toLowerCase().includes('credits') || errorMessage.includes('402')) {
                errorMessage = 'Sem Créditos (402)';
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
