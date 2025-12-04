import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("Please provide VITE_GEMINI_API_KEY environment variable");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Fetching available models...");
        const response = await ai.models.list();

        console.log("\nAvailable Models:");
        // The response might be an async iterable or a simple array depending on SDK version
        // We'll handle both just in case, but usually it's a list in the response object
        // or we iterate.

        // Check if response has a 'models' property or is iterable
        if (response && typeof response === 'object') {
            // @ts-ignore
            for await (const model of response) {
                const methods = model.supportedGenerationMethods ? model.supportedGenerationMethods.join(', ') : 'Unknown';
                console.log(`- ${model.name} (${model.displayName || 'No Display Name'}): ${methods}`);
            }
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
