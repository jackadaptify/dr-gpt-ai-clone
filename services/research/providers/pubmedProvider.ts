import { ResearchProvider } from './types';
import { ResearchSource } from '../orchestratorService';

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export const pubmedProvider: ResearchProvider = {
    name: 'PubMed',
    sourceType: 'PubMed',

    async search(query: string, limit = 5): Promise<ResearchSource[]> {
        try {
            // 1. Search for IDs
            const searchUrl = `${BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${limit}&sort=relevance`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            const ids = searchData.esearchresult?.idlist || [];
            if (ids.length === 0) return [];

            // 2. Fetch Details (Abstracts)
            // using efetch for full abstract data
            const fetchUrl = `${BASE_URL}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
            const fetchRes = await fetch(fetchUrl);
            const xmlText = await fetchRes.text();

            // Simple XML parsing (browser-compatible)
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const articles = xmlDoc.getElementsByTagName('PubmedArticle');

            const sources: ResearchSource[] = [];

            for (let i = 0; i < articles.length; i++) {
                const article = articles[i];

                const title = article.querySelector('ArticleTitle')?.textContent || 'Sem título';
                const abstractText = article.querySelector('AbstractText')?.textContent || 'Resumo não disponível.';

                // Authors
                const authorNodes = article.querySelectorAll('Author');
                const authors: string[] = [];
                authorNodes.forEach(node => {
                    const lastName = node.querySelector('LastName')?.textContent;
                    const initials = node.querySelector('Initials')?.textContent;
                    if (lastName) authors.push(`${lastName} ${initials || ''}`);
                });

                // Date
                const year = article.querySelector('PubDate Year')?.textContent ||
                    article.querySelector('DateCompleted Year')?.textContent || 'N/D';

                // ID
                const pmid = article.querySelector('PMID')?.textContent || ids[i];

                sources.push({
                    id: pmid,
                    title,
                    abstract: abstractText,
                    authors: authors.slice(0, 3), // Limit authors
                    date: year,
                    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                    source: 'PubMed'
                });
            }

            return sources;

        } catch (error) {
            console.error('PubMed Search Error:', error);
            return [];
        }
    }
};
