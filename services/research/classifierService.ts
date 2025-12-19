import { chatCompletion } from '../openRouterService';
import { Message, Role } from '../../types';

export interface ResearchIntent {
    type: 'diagnosis' | 'treatment' | 'pharmacology' | 'guideline' | 'general';
    keywords: string[]; // Main search terms (English)
    mesh_terms: string[]; // Formal MeSH terms
    include_terms: string[]; // Specific inclusions
    exclude_terms: string[]; // Negation handling (e.g. "without diabetes")
    search_queries: {
        strict: string;
        relaxed: string;
        semantic: string;
    };
    originalQuery: string;
}

const CLASSIFIER_MODEL = 'anthropic/claude-3.5-sonnet';

export const classifyQuery = async (query: string, context?: string): Promise<ResearchIntent> => {
    const systemPrompt = `You are an expert Medical Research Assistant and Query Engineer.
Your task is to analyze the user's medical query (usually in Portuguese) and construct HIGH-PRECISION search queries for PubMed/OpenAlex.

INPUT CONTEXT:
Query: "${query}"
${context ? `Active Ingredient Context: ${context}` : ''}

TASK:
1.  **Translate**: Convert the core clinical question to professional English.
2.  **MeSH Extraction**: Identify formal Medical Subject Headings (MeSH).
3.  **Boolean Logic**: Construct 3 tiers of search queries.

OUTPUT FORMAT (JSON ONLY):
Return ONLY a valid JSON object. Do not wrap in markdown code blocks like \`\`\`json ... \`\`\`. Just the raw JSON string.
{
  "type": "diagnosis" | "treatment" | "pharmacology" | "guideline" | "general",
  "keywords": ["list", "of", "english", "terms"],
  "mesh_terms": ["formal", "mesh", "headings"],
  "include_terms": ["specific", "conditions", "to", "include"],
  "exclude_terms": ["conditions", "to", "exclude", "based", "on", "negation"],
  "search_queries": {
    "strict": "Boolean string with AND, OR, NOT (e.g. 'Heart Failure' AND 'Treatment' NOT 'Beta-blockers')",
    "relaxed": "Broader Boolean string, removing NOT filters (e.g. 'Heart Failure' AND 'Treatment')",
    "semantic": "Natural language English question optimized for semantic search"
  }
}

RULES:
1.  **Negation**: If the user says "sem", "não", "exceto" (without), puts those terms in "exclude_terms" and use NOT in the 'strict' query.
2.  **Strict Query**: Be precise. Use quotes for multi-word terms.
3.  **Relaxed Query**: Remove the NOT clauses. Keep the main condition and intervention.
4.  **Semantic Query**: A full, clear English sentence describing the information need.
5.  **NO EXPANSION**: DO NOT expand terms into variations (e.g. DO NOT turn "fraction" into "fractionation OR fractionated..."). Use ONLY the exact English term or MeSH heading.
6.  **CONCISE**: Keep queries under 300 characters. Avoid massive OR chains.

Example:
Input: "Tratamento de insuficiência cardíaca sem betabloqueadores"
Output:
{
  "type": "treatment",
  "keywords": ["heart failure", "treatment"],
  "mesh_terms": ["Heart Failure", "Therapeutics"],
  "include_terms": [],
  "exclude_terms": ["beta-adrenergic antagonists"],
  "search_queries": {
    "strict": "(\"Heart Failure\"[MeSH] OR \"HFrEF\") AND (\"Therapeutics\"[MeSH]) NOT (\"Adrenergic beta-Antagonists\"[MeSH])",
    "relaxed": "(\"Heart Failure\"[MeSH] OR \"HFrEF\") AND (\"Therapeutics\"[MeSH])",
    "semantic": "What are the treatment options for heart failure without using beta-blockers?"
  }
}`;

    try {
        const message: Message = {
            id: 'classifier-msg',
            role: Role.USER,
            content: query,
            timestamp: Date.now()
        };

        const response = await chatCompletion(
            CLASSIFIER_MODEL,
            [message],
            systemPrompt
        );

        console.log('[Classifier] Raw Model Response:', response); // DEBUG LOG

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Failed to parse JSON');

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            ...parsed,
            // Ensure arrays exist
            keywords: parsed.keywords || [],
            mesh_terms: parsed.mesh_terms || [],
            include_terms: parsed.include_terms || [],
            exclude_terms: parsed.exclude_terms || [],
            search_queries: parsed.search_queries || {
                strict: query,
                relaxed: query,
                semantic: query
            },
            originalQuery: query
        };

    } catch (error) {
        console.warn('Classifier failed, using fallback:', error);
        return {
            type: 'general',
            keywords: [query],
            mesh_terms: [],
            include_terms: [],
            exclude_terms: [],
            search_queries: {
                strict: query,
                relaxed: query,
                semantic: query
            },
            originalQuery: query
        };
    }
};
