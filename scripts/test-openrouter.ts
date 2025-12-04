import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Manually load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/VITE_OPENROUTER_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.error("Could not read .env.local");
}

console.log("Testing OpenRouter API...");
console.log("API Key found:", apiKey ? "Yes (starts with " + apiKey.substring(0, 5) + ")" : "No");

if (!apiKey) {
    console.error("Error: VITE_OPENROUTER_API_KEY not found in .env.local");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
});

async function test() {
    try {
        console.log("Sending request to OpenRouter (google/gemini-2.0-flash-exp:free)...");
        const completion = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [
                { role: "user", content: "Say hello!" }
            ],
        });

        console.log("Success!");
        console.log("Response:", completion.choices[0].message.content);
    } catch (error) {
        console.error("API Error:", error);
    }
}

test();
