import 'dotenv/config';
import OpenAI from 'openai';

const apiKey = process.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
    console.error("Please set VITE_OPENAI_API_KEY env var");
    process.exit(1);
}

const openai = new OpenAI({ apiKey });

async function check() {
    console.log("--- Checking DALL-E 3 (GPT Image 1) ---");

    // 1. Simulate Health Check (Model Retrieve)
    try {
        console.log("Running Health Check (models.retrieve)...");
        await openai.models.retrieve('dall-e-3');
        console.log("✅ Health Check PASSED");
    } catch (e: any) {
        console.log("❌ Health Check FAILED:", e.message);
    }

    // 2. Simulate Actual Usage (Image Generation)
    try {
        console.log("\nRunning Actual Usage (images.generate)...");
        await openai.images.generate({
            model: 'dall-e-3',
            prompt: 'A simple test square',
            n: 1,
            size: "1024x1024",
        });
        console.log("✅ Actual Usage PASSED");
    } catch (e: any) {
        console.log("❌ Actual Usage FAILED:", e.message);
    }
}

check();
