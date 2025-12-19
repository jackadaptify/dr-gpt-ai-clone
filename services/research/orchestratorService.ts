import { classifyQuery, ResearchIntent } from './classifierService';
import { normalizeDrugName } from './rxNormService';
import { pubmedProvider } from './providers/pubmedProvider';
import { openAlexProvider } from './providers/openAlexProvider';
import { chatCompletion } from '../openRouterService';
import { Message, Role } from '../../types';

export interface ResearchResult {
    answer: string;
    sources: ResearchSource[];
    intent: ResearchIntent;
}

export interface ResearchSource {
    id: string; // PMI or DOI
    title: string;
    abstract: string;
    authors: string[];
    date: string;
    url: string;
    source: 'PubMed' | 'OpenAlex' | 'Other';
}

const SYNTHESIS_MODEL = 'anthropic/claude-3.5-sonnet';

/**
 * Waterfall Search Logic
 * Attempt 1: Strict (Keywords + MeSH + NOT filters)
 * Attempt 2: Relaxed (Main conditions only, drop exclusions)
 * Attempt 3: Semantic (OpenAlex fallback)
 */
async function searchWithFallback(intent: ResearchIntent, onProgress?: (status: string) => void): Promise<ResearchSource[]> {
    const providers = [pubmedProvider, openAlexProvider];
    // OpenAlex only for semantic fallback
    const semanticProviders = [openAlexProvider];

    // 1. Strict Search
    let query = intent.search_queries.strict;
    onProgress?.(`🔍 Tentativa 1 (Estrita): Buscando por "${query}"...`);
    console.log(`[Orchestrator] Attempt 1 (Strict): ${query}`);

    let results = await executeSearch(providers, query);

    if (results.length > 0) return results;

    // 2. Relaxed Search
    query = intent.search_queries.relaxed;
    onProgress?.(`⚠️ Nenhuma evidência estrita. Tentativa 2 (Relaxada): "${query}"...`);
    console.log(`[Orchestrator] Attempt 2 (Relaxed): ${query}`);

    results = await executeSearch(providers, query);

    if (results.length > 0) return results;

    // 3. Semantic Search
    query = intent.search_queries.semantic;
    onProgress?.(`⚠️ Buscando conceitos amplos. Tentativa 3 (Semântica): "${query}"...`);
    console.log(`[Orchestrator] Attempt 3 (Semantic): ${query}`);

    results = await executeSearch(semanticProviders, query);

    return results;
}

async function executeSearch(providers: any[], query: string): Promise<ResearchSource[]> {
    const results = await Promise.all(
        providers.map((p: any) => p.search(query, 5).then((res: any) => ({ provider: p.name, res })))
    );

    let allSources: ResearchSource[] = [];
    const seenIds = new Set();

    results.forEach(({ res }) => {
        (res as ResearchSource[]).forEach(source => {
            if (!seenIds.has(source.id)) {
                seenIds.add(source.id);
                allSources.push(source);
            }
        });
    });

    return allSources.slice(0, 10);
}

export const orchestrateResearch = async (query: string, onProgress?: (status: string) => void): Promise<ResearchResult> => {
    try {
        // 1. Semantic Normalization (RxNorm)
        onProgress?.('💊 Identificando fármacos (RxNav)...');
        const rxResult = await normalizeDrugName(query);
        let contextString = '';

        if (rxResult) {
            console.log(`[Orchestrator] RxNorm Match: ${rxResult.name} (RxCUI: ${rxResult.rxcui})`);
            contextString = rxResult.name;
            if (rxResult.meshTerms && rxResult.meshTerms.length > 0) {
                contextString += ` (MeSH: ${rxResult.meshTerms.join(', ')})`;
            }
        }

        // 2. Classification & Query Engineering
        onProgress?.('🧠 Analisando pergunta e critérios (Llama 3.1)...');
        const intent = await classifyQuery(query, contextString);
        console.log('Research Intent:', intent);

        // 3. Waterfall Search
        const allSources = await searchWithFallback(intent, onProgress);

        if (allSources.length === 0) {
            return {
                answer: "Não foram encontrados artigos relevantes para esta consulta. Tente reformular a pergunta ou ampliar o escopo.",
                sources: [],
                intent
            }
        }

        // 4. Synthesis (GRADE Framework + Dosage Extraction)
        onProgress?.(`⚖️ Avaliando evidências (GRADE / Claude 3.5)...`);

        const context = allSources.map((s, i) =>
            `[Source ${i + 1}]\nTitle: ${s.title}\nDate: ${s.date}\nAuthors: ${s.authors.join(', ')}\nAbstract: ${s.abstract.length > 1000 ? s.abstract.substring(0, 1000) + '...' : s.abstract}\nURL: ${s.url}\n`
        ).join('\n---\n');

        const systemPrompt = `You are Dr. GPT, an elite Evidence-Based Medicine Assistant.
Your goal is to answer the clinical question providing a structured critical appraisal of the evidence.

QUESTION: "${intent.originalQuery}"
CONTEXT (RxNorm/MeSH): "${contextString}"

INSTRUCTIONS:
1.  **Language**: Portuguese (pt-BR).
2.  **Zero Results Policy**: Provide the best possible answer based on the search results. If the results are broad, explain how they relate to the user's specific constraints.
3.  **Structure**:
    *   **Clinical Bottom Line**: A direct, actionable answer (2-3 sentences).
    *   **Evidence Quality**: Implicitly assess quality. Use phrases like "Based on high-quality evidence from [Leading Journal]..." or "Preliminary data suggests...".
    *   **Pathophysiology/Context**: Briefly define the condition/context.
    *   **Pharmacological Treatment**: Group by drug class.
    *   **DOSAGE & TITRATION**: EXTRACT AND EXPLICITLY STATE dosages, starting doses, target doses, and titration steps if available in the text.
    *   **Non-Pharmacological**: Lifestyle, procedures, etc.
    *   **Emerging Therapies**: New drugs or approaches answering the query.
4.  **Citations**: MANDATORY usage of inline citations [1], [2] referring to the provided sources.
5.  **Negation**: If the user asked "without X", ensure the answer respects that constraint, focusing on alternatives.

EVIDENCE:
${context}`;

        const message: Message = {
            id: 'synthesis-msg',
            role: Role.USER,
            content: "Please synthesize the Clinical Bottom Line and detailed answer with Dosages.",
            timestamp: Date.now()
        };

        try {
            const answer = await chatCompletion(
                SYNTHESIS_MODEL,
                [message],
                systemPrompt
            );

            return {
                answer: answer,
                sources: allSources,
                intent: intent
            };
        } catch (synthesisError) {
            console.error('Synthesis failed:', synthesisError);
            // Fallback: Return the sources with a generic message
            return {
                answer: "Encontrei as evidências abaixo, mas tive um problema ao gerar o resumo detalhado. Verifique os artigos originais.",
                sources: allSources,
                intent: intent
            };
        }

    } catch (error) {
        console.error('Orchestration failed:', error);
        throw error;
    }
};
