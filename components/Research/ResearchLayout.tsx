import React, { useState } from 'react';
import { orchestrateResearch, ResearchResult } from '../../services/research/orchestratorService';
import ReactMarkdown from 'react-markdown';
import { Search, Brain, BookOpen, ExternalLink, Loader2, Check } from 'lucide-react';

export const ResearchLayout: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [result, setResult] = useState<ResearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setProgress('Iniciando orquestrador...');
        setResult(null);
        setError(null);

        try {
            const data = await orchestrateResearch(query, (status) => {
                setProgress(status);
            });
            setResult(data);
        } catch (err) {
            setError('Ocorreu um erro durante a pesquisa. Tente novamente.');
            console.error(err);
        } finally {
            setIsLoading(false);
            setProgress('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Pesquisa Clínica Avançada
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Orquestrador de Evidências em Tempo Real (PubMed, Semantic Scholar, Claude 3.5 Sonnet)
                    </p>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearch()}
                        placeholder="Ex: Qual a eficácia de SGLT2i em pacientes com ICFEr sem diabetes?"
                        className="w-full p-4 pl-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        disabled={isLoading}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !query.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Pesquisar'}
                    </button>
                </div>

                {/* Progress Indicator */}
                {isLoading && (
                    <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg animate-pulse">
                        <Brain className="text-blue-600 mr-2" size={20} />
                        <span className="text-blue-700 dark:text-blue-300 font-medium">{progress}</span>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-8 animate-fade-in">

                        {/* Intent Badge */}
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                {result.intent.type}
                            </span>
                            {result.intent.keywords.map((k, i) => (
                                <span key={i} className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                    {k}
                                </span>
                            ))}
                        </div>

                        {/* Answer Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <Brain className="text-green-600 dark:text-green-400" size={24} />
                                </div>
                                <h2 className="text-xl font-bold">Síntese de Evidências</h2>
                            </div>

                            <div className="prose prose-blue dark:prose-invert max-w-none">
                                <ReactMarkdown>{result.answer}</ReactMarkdown>
                            </div>
                        </div>

                        {/* References Grid */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <BookOpen size={20} />
                                Fontes Consultadas ({result.sources.length})
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {result.sources.map((source, index) => (
                                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                {index + 1}
                                            </span>
                                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 lowercase">
                                                {source.source}
                                            </span>
                                        </div>
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="block group">
                                            <h4 className="font-medium text-blue-600 dark:text-blue-400 group-hover:underline line-clamp-2 title-font mb-1">
                                                {source.title}
                                            </h4>
                                        </a>
                                        <p className="text-sm text-gray-500 mb-2 truncate">
                                            {source.authors.join(', ')} • {source.date}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                                            {source.abstract}
                                        </p>
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors">
                                            Ver fonte original <ExternalLink size={12} className="ml-1" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};
