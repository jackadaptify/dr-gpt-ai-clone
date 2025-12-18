import { ResearchProvider } from './types';
import { ResearchSource } from '../orchestratorService';

interface OpenAlexWork {
    id: string;
    doi?: string;
    title: string;
    publication_year: number;
    publication_date?: string;
    primary_location?: {
        landing_page_url?: string;
    };
    open_access?: {
        oa_url?: string;
    };
    authorships: Array<{
        author: {
            display_name: string;
        };
    }>;
    abstract_inverted_index?: Record<string, number[]>;
}

export const openAlexProvider: ResearchProvider = {
    name: 'OpenAlex',
    sourceType: 'Other', // Or we can add 'OpenAlex' to the type definition later

    search: async (query: string, limit: number = 5): Promise<ResearchSource[]> => {
        try {
            console.log(`[OpenAlex] Searching for: "${query}"`);

            // Build URL
            const url = new URL('https://api.openalex.org/works');
            url.searchParams.append('search', query);
            url.searchParams.append('per_page', limit.toString());
            // Filter for works with abstracts to ensure quality context
            url.searchParams.append('filter', 'has_abstract:true');
            // Select fields to minimize payload
            url.searchParams.append('select', 'id,doi,title,publication_year,publication_date,primary_location,open_access,authorships,abstract_inverted_index');
            // Polite pool using a generic email (or user's email if available, hardcoded for now)
            url.searchParams.append('mailto', 'dev@drgpt.com');

            const response = await fetch(url.toString());

            if (!response.ok) {
                console.error(`[OpenAlex] API Error: ${response.status} ${response.statusText}`);
                return [];
            }

            const data = await response.json();
            const results: OpenAlexWork[] = data.results || [];

            return results.map(work => ({
                id: work.id.replace('https://openalex.org/', ''), // Store generic ID
                title: work.title || 'Sem título',
                abstract: reconstructAbstract(work.abstract_inverted_index),
                authors: work.authorships.map(a => a.author.display_name).slice(0, 5), // Top 5 authors
                date: work.publication_date || work.publication_year?.toString() || 'Data desconhecida',
                url: work.doi || work.primary_location?.landing_page_url || work.open_access?.oa_url || work.id,
                source: 'Other' // Will map to 'OpenAlex' in orchestrator
            }));

        } catch (error) {
            console.error('[OpenAlex] Search failed:', error);
            return [];
        }
    }
};

/**
 * Reconstructs the abstract from OpenAlex's inverted index format.
 * Format: { "word": [1, 5, 10], "is": [2], ... }
 */
function reconstructAbstract(invertedIndex?: Record<string, number[]>): string {
    if (!invertedIndex) return 'Resumo não disponível.';

    const wordMap: Record<number, string> = {};
    let maxIndex = 0;

    // Map position -> word
    Object.entries(invertedIndex).forEach(([word, positions]) => {
        positions.forEach(pos => {
            wordMap[pos] = word;
            if (pos > maxIndex) maxIndex = pos;
        });
    });

    // Rebuild array
    const words: string[] = [];
    for (let i = 0; i <= maxIndex; i++) {
        if (wordMap[i]) {
            words.push(wordMap[i]);
        }
    }

    return words.join(' ');
}
