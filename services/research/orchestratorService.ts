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

const SYNTHESIS_MODEL = 'perplexity/sonar-reasoning-pro';

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

export const orchestrateResearch = async (query: string, useDeepResearch: boolean = false, onProgress?: (status: string) => void): Promise<ResearchResult> => {
    try {
        // 1. Semantic Normalization (RxNorm)
        onProgress?.('💊 Identificando fármacos (RxNav)...');
        const rxResult = await normalizeDrugName(query);
        let contextString = '';

        if (rxResult) {
            console.log(`[Orchestrator] RxNorm Match: ${rxResult.name} (RxCUI: ${rxResult.rxcui})`);
            contextString = rxResult.name;
        }

        // 2. Classification
        onProgress?.('🧠 Analisando pergunta e critérios...');
        const intent = await classifyQuery(query, contextString);
        console.log('Research Intent:', intent);

        let allSources: ResearchSource[] = [];
        let answer = "";

        // CHECK MODEL: If Deep Research enabled
        if (useDeepResearch) {
            onProgress?.(`🌐 Pesquisando na Web Médica (Perplexity Sonar Reasoning Pro)... Isso pode demorar até 45s.`);

            const systemPrompt = `Você é o Dr. GPT, um especialista em pesquisa clínica de alto nível.
Regras OBRIGATÓRIAS:
1. Responda SEMPRE em Português do Brasil.
2. Seja EXTENSIVO e DETALHADO. Use estrutura científica: Introdução, Metodologia (se aplicável), Evidências Principais, Análise Crítica e Conclusão.
3. CITE TUDO: Use o formato [1], [2] ao longo do texto.
4. Ao final, liste as Referências Bibliográficas completas com links se houver.
5. Se não encontrar evidências exatas, diga claramente.
6. Use Markdown para formatar (negrito, listas, tabelas).`;

            const message: Message = {
                id: 'synthesis-msg',
                role: Role.USER,
                content: query, // Use raw query or intent.originalQuery
                timestamp: Date.now()
            };

            try {
                // Using the specialized model
                const response = await chatCompletion(
                    'perplexity/sonar-reasoning-pro',
                    [message],
                    systemPrompt
                );

                answer = response;
                // Note: The OpenRouter service already appends citations at the bottom if parsing works.
                // We rely on that for now.

            } catch (e) {
                console.error("Perplexity Search Failed", e);
                // Propagate error to layout to handle credits/auth issues
                throw e;
            }

        } else {
            // MANUAL WATERFALL (Fallback or Legacy Mode)
            // 3. Waterfall Search
            allSources = await searchWithFallback(intent, onProgress);

            if (allSources.length === 0) {
                return {
                    answer: "Não foram encontrados artigos relevantes para esta consulta. Tente reformular a pergunta ou ampliar o escopo.",
                    sources: [],
                    intent
                }
            }

            // 4. Synthesis
            onProgress?.(`⚖️ Avaliando evidências (GRADE / Claude 3.5)...`);

            const context = allSources.map((s, i) =>
                `[Source ${i + 1}]\nTitle: ${s.title}\nDate: ${s.date}\nAuthors: ${s.authors.join(', ')}\nAbstract: ${s.abstract.length > 1000 ? s.abstract.substring(0, 1000) + '...' : s.abstract}\nURL: ${s.url}\n`
            ).join('\n---\n');

            const systemPrompt = `Você é o Dr. GPT. Sua tarefa é sintetizar as evidências fornecidas acima para responder à pergunta do médico: "${query}".
Diretrizes:
- Use Português do Brasil.
- Cite as fontes usando [1], [2], etc.
- Seja objetivo e clínico.
- Inclua "Conclusão Clínica" no final.
`;
            const msg: Message = { id: 's', role: Role.USER, content: context, timestamp: Date.now() };
            answer = await chatCompletion('anthropic/claude-3.5-sonnet', [msg], systemPrompt); // Hardcoded fallback if SYNTHESIS_MODEL is changed
        }

        return {
            answer: answer,
            sources: allSources, // Might be empty for Sonar unless we parse citations into sources manually here, but OpenRouter service appends them to text.
            intent: intent
        };

    } catch (error) {
        console.error('Orchestration failed:', error);
        throw error;
    }
};
