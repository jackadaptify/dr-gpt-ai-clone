import { chatCompletion } from '../openRouterService';
import { Message, Role } from '../../types';

interface RxNormResult {
    rxcui: string;
    name: string;
    score: number;
    meshTerms?: string[];
}

const RXNAV_API_BASE = 'https://rxnav.nlm.nih.gov/REST';
const CACHE_KEY_PREFIX = 'rxnorm_cache_';
const FALLBACK_MODEL = 'meta-llama/llama-3.1-8b-instruct';

// Simple in-memory cache to avoid redundant API calls within the session
const memoryCache = new Map<string, RxNormResult | null>();

/**
 * Normalizes a drug name (Brand or Generic) to its RxCUI and Official English Name.
 * Uses a Fallback LLM (Llama 3.1) to translate Brazilian brand names if needed.
 */
export const normalizeDrugName = async (query: string): Promise<RxNormResult | null> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return null;

    // 1. Check Cache (Memory first, then LocalStorage could be added)
    if (memoryCache.has(trimmedQuery)) {
        console.log(`[RxNorm] Cache hit for: "${trimmedQuery}"`);
        return memoryCache.get(trimmedQuery) || null;
    }

    try {
        console.log(`[RxNorm] Searching for: "${trimmedQuery}"`);

        // 2. Direct RxNav Search (Approximate)
        let result = await queryRxNav(trimmedQuery);

        // 3. Fallback: If no result, try LLM Translation (BR Brand -> Generic English)
        if (!result) {
            console.log(`[RxNorm] No direct match. Attempting LLM fallback for: "${trimmedQuery}"`);
            const translatedTerm = await translateToGenneric(trimmedQuery);

            if (translatedTerm && translatedTerm.toLowerCase() !== trimmedQuery.toLowerCase()) {
                console.log(`[RxNorm] Translated "${trimmedQuery}" -> "${translatedTerm}". Retrying RxNav...`);
                result = await queryRxNav(translatedTerm);
            }
        }

        // 4. Update Cache (Store null if still nothing found to avoid retry loops)
        memoryCache.set(trimmedQuery, result);

        return result;

    } catch (error) {
        console.error('[RxNorm] Error in normalization:', error);
        return null; // Fail gracefully
    }
};

/**
 * Queries the RxNav ApproximateTerm API
 */
const queryRxNav = async (term: string): Promise<RxNormResult | null> => {
    try {
        // maxEntries=1 to avoid ambiguity
        const url = `${RXNAV_API_BASE}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=1`;
        const response = await fetch(url);

        if (!response.ok) return null;

        const data = await response.json();

        // Parse cryptic RxNav response
        if (data.approximateGroup?.candidate?.length > 0) {
            const candidate = data.approximateGroup.candidate[0];

            // Try to fetch MeSH terms linked to this RxCUI
            const meshTerms = await getMeshTerms(candidate.rxcui);

            return {
                rxcui: candidate.rxcui,
                name: candidate.score > 50 ? candidate.name : term, // Only adopt name if score is decent
                score: parseFloat(candidate.score || '0'),
                meshTerms
            };
        }
    } catch (e) {
        console.warn('[RxNorm] API Request failed:', e);
    }
    return null;
};

/**
 * Fetches MeSH terms linked to an RxCUI via RxNav properties
 */
const getMeshTerms = async (rxcui: string): Promise<string[]> => {
    try {
        const url = `${RXNAV_API_BASE}/rxcui/${rxcui}/allProperties.json?prop=MESH`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();

        const props = data.propConceptGroup?.propConcept;
        if (Array.isArray(props)) {
            return props.map((p: any) => p.propValue).slice(0, 3); // Return top 3 MeSH
        }
    } catch (e) {
        // Ignore MeSH fetch errors
    }
    return [];
};

/**
 * Uses Llama 3.1 8b to translate potential Brazilian brand names to English Generics.
 */
const translateToGenneric = async (term: string): Promise<string | null> => {
    const systemPrompt = `You are an expert Pharmacologist Assistant.
Your Goal: Translate a Brazilian Drug Brand Name (or common term) into its standard English Generic Name.
Context: The user is searching a medical database.

Examples:
Input: "Roacutan" -> Output: "Isotretinoin"
Input: "Dipirona" -> Output: "Metamizole"
Input: "Aspirina" -> Output: "Aspirin"
Input: "Tylenol" -> Output: "Acetaminophen"

Instruction: Return ONLY the generic name. No markdown, no punctuation. If you don't know, return the input string.`;

    try {
        const message: Message = {
            id: 'rxnorm-fallback',
            role: Role.USER,
            content: term,
            timestamp: Date.now()
        };

        const response = await chatCompletion(
            FALLBACK_MODEL,
            [message],
            systemPrompt
        );

        const cleanResponse = response.trim().replace(/['"]/g, '').replace(/\.$/, '');
        return cleanResponse;

    } catch (error) {
        console.error('[RxNorm] Translation failed:', error);
        return null;
    }
};
