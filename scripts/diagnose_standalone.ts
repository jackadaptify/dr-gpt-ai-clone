import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const geminiKey = process.env.VITE_GEMINI_API_KEY;
const openaiKey = process.env.VITE_OPENAI_API_KEY;
const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY;

console.log("Keys loaded:", {
    Gemini: !!geminiKey,
    OpenAI: !!openaiKey,
    Anthropic: !!anthropicKey
});

const MODELS_TO_CHECK = [
    { provider: 'Google', id: 'gemini-2.0-flash', modelId: 'gemini-2.0-flash' },
    { provider: 'Google', id: 'gemini-3-pro-preview', modelId: 'gemini-3-pro-preview' },
    { provider: 'OpenAI', id: 'gpt-4o', modelId: 'gpt-4o' },
    { provider: 'OpenAI', id: 'gpt-4o-mini', modelId: 'gpt-4o-mini' },
    { provider: 'OpenAI', id: 'o3-mini', modelId: 'o3-mini' },
    { provider: 'Anthropic', id: 'claude-3-5-sonnet', modelId: 'claude-3-5-sonnet-20241022' }
];

async function checkModel(model: any) {
    try {
        if (model.provider === 'Google') {
            if (!geminiKey) throw new Error("No API Key");
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            await ai.models.generateContent({
                model: model.modelId,
                contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
                config: { maxOutputTokens: 1 }
            });
        } else if (model.provider === 'OpenAI') {
            if (!openaiKey) throw new Error("No API Key");
            const openai = new OpenAI({ apiKey: openaiKey });
            await openai.chat.completions.create({
                model: model.modelId,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1
            });
        } else if (model.provider === 'Anthropic') {
            if (!anthropicKey) throw new Error("No API Key");
            const anthropic = new Anthropic({ apiKey: anthropicKey });
            await anthropic.messages.create({
                model: model.modelId,
                max_tokens: 1,
                messages: [{ role: 'user', content: 'ping' }]
            });
        }
        console.log(`✅ ${model.id}: ONLINE`);
    } catch (error: any) {
        console.log(`❌ ${model.id}: OFFLINE`);
        console.log(`   Error: ${error.message}`);
        if (error.response) {
            console.log(`   Details:`, JSON.stringify(error.response.data || error.response, null, 2));
        }
    }
}

async function run() {
    console.log("\nStarting Diagnosis...");
    for (const model of MODELS_TO_CHECK) {
        await checkModel(model);
    }
}

run();
