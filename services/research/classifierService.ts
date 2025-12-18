import { chatCompletion } from '../openRouterService';
import { Message, Role } from '../../types';

export interface ResearchIntent {
    type: 'diagnosis' | 'treatment' | 'pharmacology' | 'guideline' | 'general';
    keywords: string[];
    originalQuery: string;
}

const CLASSIFIER_MODEL = 'meta-llama/llama-3.1-8b-instruct';

export const classifyQuery = async (query: string): Promise<ResearchIntent> => {
    const systemPrompt = `You are an expert Medical Research Assistant.
Your task is to analyze the user's medical query and extract structured information for a research engine.

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following structure:
{
  "type": "diagnosis" | "treatment" | "pharmacology" | "guideline" | "general",
  "keywords": ["list", "of", "english", "mesh", "terms", "for", "search"]
}

RULES:
1. Translate non-English queries to English MeSH terms for the "keywords" array.
2. "type" must be one of the specified values.
3. "keywords" should be optimized for PubMed/Semantic Scholar search (2-5 terms).`;

    try {
        const message: Message = {
            id: 'classifier-msg',
            role: Role.USER,
            content: query,
            timestamp: Date.now()
        };

        // Use Llama 3.1 8B for cost-effective classification (~$0.001)
        const response = await chatCompletion(
            CLASSIFIER_MODEL,
            [message],
            systemPrompt
        );

        // Parse JSON from response (handling potential markdown code blocks)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse JSON from classifier response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            ...parsed,
            originalQuery: query
        };

    } catch (error) {
        console.warn('Classifier failed, using fallback:', error);
        // Fallback logic could be implemented here or just return general
        return {
            type: 'general',
            keywords: [query], // Use raw query if extraction fails
            originalQuery: query
        };
    }
};
