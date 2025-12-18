import { ResearchProvider } from './types';
import { ResearchSource } from '../orchestratorService';

const BASE_URL = 'https://api.semanticscholar.org/graph/v1/paper/search';

export const semanticScholarProvider: ResearchProvider = {
    name: 'Semantic Scholar',
    sourceType: 'SemanticScholar',

    async search(query: string, limit = 5): Promise<ResearchSource[]> {
        try {
            const url = `${BASE_URL}?query=${encodeURIComponent(query)}&fields=title,abstract,authors,year,url,externalIds&limit=${limit}`;

            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`Semantic Scholar API Error: ${res.statusText}`);
                return [];
            }

            const data = await res.json();
            if (!data.data || !Array.isArray(data.data)) return [];

            return data.data.map((paper: any) => ({
                id: paper.externalIds?.PubMed || paper.paperId,
                title: paper.title,
                abstract: paper.abstract || 'Resumo não disponível.',
                authors: paper.authors?.map((a: any) => a.name).slice(0, 3) || [],
                date: paper.year?.toString() || 'N/D',
                url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
                source: 'SemanticScholar'
            }));

        } catch (error) {
            console.error('Semantic Scholar Search Error:', error);
            return [];
        }
    }
};
