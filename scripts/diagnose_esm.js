import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load .env
const envPath = path.resolve(__dirname, '../.env');
let env = {};
try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error("Could not read .env file");
}

const geminiKey = env.VITE_GEMINI_API_KEY;
const openaiKey = env.VITE_OPENAI_API_KEY;
const anthropicKey = env.VITE_ANTHROPIC_API_KEY;

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

async function checkModel(model) {
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
    } catch (error) {
        console.log(`❌ ${model.id}: OFFLINE`);
        console.log(`   Error: ${error.message}`);
        if (error.status) console.log(`   Status: ${error.status}`);
        if (error.code) console.log(`   Code: ${error.code}`);
        if (error.type) console.log(`   Type: ${error.type}`);
    }
}

async function run() {
    console.log("\nStarting Diagnosis...");
    for (const model of MODELS_TO_CHECK) {
        await checkModel(model);
    }
}

run();
