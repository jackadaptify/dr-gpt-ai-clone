import { classifyQuery, ResearchIntent } from './classifierService';
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
    source: 'PubMed' | 'SemanticScholar' | 'NICE' | 'OpenAlex' | 'Other'; // Added OpenAlex
}

// User specified Claude 3.5 Sonnet for synthesis
const SYNTHESIS_MODEL = 'anthropic/claude-3.5-sonnet';

export const orchestrateResearch = async (query: string, onProgress?: (status: string) => void): Promise<ResearchResult> => {
    try {
        // 1. Classification
        onProgress?.('🧠 Analisando pergunta (Llama 3.1)...');
        const intent = await classifyQuery(query);
        console.log('Research Intent:', intent);

        // 2. Search (Parallel)
        const searchTerms = intent.keywords.join(' ');
        onProgress?.(`🔍 Buscando evidências para: "${searchTerms}"...`);

        // Select providers based on intent (Simplified logic for now: ALWAYS PubMed + OpenAlex as per tier 1)
        // In future we can conditionally add NICE based on 'intent.type === guideline'

        // We can use the intent to refine the query or filter providers
        // 🚀 SWAP: Replacing semanticScholarProvider with openAlexProvider
        const providers = [pubmedProvider, openAlexProvider];

        // Execute searches
        const results = await Promise.all(
            providers.map(p => p.search(searchTerms, 5).then(res => ({ provider: p.name, res })))
        );

        // Flatten and Dedup sources (by ID/Title similarity)
        let allSources: ResearchSource[] = [];
        const seenIds = new Set();

        results.forEach(({ res }) => {
            res.forEach(source => {
                // Simple dedup by ID. Might need title similarity check later.
                if (!seenIds.has(source.id)) {
                    seenIds.add(source.id);
                    allSources.push(source);
                }
            });
        });

        // Limit context to top 10 to fit context window/cost and relevance
        allSources = allSources.slice(0, 10);

        if (allSources.length === 0) {
            return {
                answer: "Não foram encontrados artigos relevantes para esta consulta nas bases de dados verificadas (PubMed, Semantic Scholar). Tente reformular a pergunta com termos mais específicos.",
                sources: [],
                intent
            }
        }

        // 3. Synthesis
        onProgress?.(`✍️ Sintetizando ${allSources.length} artigos (Claude 3.5 Sonnet)...`);

        const context = allSources.map((s, i) =>
            `[Source ${i + 1}]\nTitle: ${s.title}\nDate: ${s.date}\nAuthors: ${s.authors.join(', ')}\nAbstract: ${s.abstract}\nReference ID: ${s.id}\nURL: ${s.url}\n`
        ).join('\n---\n');

        const systemPrompt = `You are a Medical Evidence Orchestrator using Claude 3.5 Sonnet.
Your goal is to answer the user's clinical question based STRICTLY on the provided abstracts.

INSTRUCTIONS:
1. Synthesize the answer in Portuguese (pt-BR).
2. Structure the answer clearly (Introduction, Evidence, Conclusion/Recommendation).
3. MANDATORY: Cite your sources inline using the format [1], [2], corresponding to the Source Numbers provided in the context.
4. If the evidence is conflicting, state it.
5. If the abstracts do not answer the question, state that the found evidence is insufficient.
6. Do not hallucinate references. Only use the provided context.
7. Use Markdown for formatting.

CONTEXT:
${context}`;

        const message: Message = {
            id: 'synthesis-msg',
            role: Role.USER,
            content: intent.originalQuery,
            timestamp: Date.now()
        };

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

    } catch (error) {
        console.error('Orchestration failed:', error);
        throw error;
    }
};
