import React, { useState, useEffect } from 'react';
import { orchestrateResearch, ResearchResult } from '../../services/research/orchestratorService';
import ReactMarkdown from 'react-markdown';
import { Search, Brain, BookOpen, ExternalLink, Loader2, Check, AlertTriangle } from 'lucide-react';
import { DeepResearchToggle } from './DeepResearchToggle';
import { supabase } from '../../lib/supabase';

export const ResearchLayout: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [result, setResult] = useState<ResearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [useDeepResearch, setUseDeepResearch] = useState(false);
    const [credits, setCredits] = useState<number>(0);

    // Fetch user credits
    useEffect(() => {
        const fetchCredits = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('research_credits')
                    .eq('id', user.id)
                    .single();
                if (data) {
                    setCredits(data.research_credits || 0);
                }
            }
        };
        fetchCredits();
    }, []);

    const handleSearch = async () => {
        if (!query.trim()) return;

        if (useDeepResearch && credits <= 0) {
            setError('Você não tem créditos suficientes para o modo Deep Research.');
            return;
        }

        setIsLoading(true);
        // Specialized loading messages for Deep Research
        const initialStatus = useDeepResearch
            ? 'Iniciando varredura profunda (Perplexity Sonar Pro)... isso pode levar até 45s...'
            : 'Iniciando orquestrador...';
        setProgress(initialStatus);

        setResult(null);
        setError(null);

        try {
            const data = await orchestrateResearch(query, useDeepResearch, (status) => {
                setProgress(status);
            });
            setResult(data);

            // Optimistically decrement credit (real check happens on backend)
            if (useDeepResearch) {
                setCredits(prev => Math.max(0, prev - 1));
            }

        } catch (err: any) {
            console.error(err);
            if (err.message && err.message.includes('402')) {
                setError('Créditos insuficientes ou erro de pagamento no provedor.');
            } else {
                setError('Ocorreu um erro durante a pesquisa. Tente novamente.');
            }
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
                        Orquestrador de Evidências em Tempo Real
                    </p>
                </div>

                {/* Search Input & Toggle */}
                <div className="space-y-4">
                    <DeepResearchToggle
                        isEnabled={useDeepResearch}
                        onToggle={setUseDeepResearch}
                        credits={credits}
                    />

                    <div className="relative">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!isLoading) handleSearch();
                                }
                            }}
                            placeholder={useDeepResearch
                                ? "Modo Deep Research (Perplexity): Faça perguntas complexas que exigem raciocínio. Ex: 'Compare a eficácia de GLP-1 vs SGLT2i na mortalidade cardiovascular em não-diabéticos...'"
                                : "Ex: Qual a eficácia de SGLT2i em pacientes com ICFEr sem diabetes?"}
                            className="w-full p-4 pl-12 h-24 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                            disabled={isLoading}
                        />

                        <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                        <button
                            onClick={handleSearch}
                            disabled={isLoading || !query.trim()}
                            className="absolute right-4 bottom-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Pesquisar'}
                        </button>
                    </div>
                </div>

                {/* Progress Indicator (Skeleton/Loading) */}
                {isLoading && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg animate-pulse border border-blue-100 dark:border-blue-800">
                            <Brain className="text-blue-600 mr-2 animate-bounce" size={20} />
                            <span className="text-blue-700 dark:text-blue-300 font-medium">{progress}</span>
                        </div>
                        {/* Skeleton Screen for Content */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6 animate-pulse"></div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                        <AlertTriangle className="mr-2" size={20} />
                        {error}
                    </div>
                )}

                {/* Results */}
                {result && !isLoading && (
                    <div className="space-y-8 animate-fade-in pb-20">

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
                                <h2 className="text-xl font-bold">Síntese de Evidências {useDeepResearch && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Reasoning Pro</span>}</h2>
                            </div>

                            <div className="prose prose-blue dark:prose-invert max-w-none">
                                <ReactMarkdown>{result.answer}</ReactMarkdown>
                            </div>
                        </div>

                        {/* References Grid - Adapted for both modes */}
                        {(result.sources.length > 0 || (useDeepResearch && result.answer.includes('['))) && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <BookOpen size={20} />
                                    Fontes Consultadas
                                </h3>

                                {result.sources.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {result.sources.map((source, index) => (
                                            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 lowercase">
                                                        {source.source === 'Other' ? 'OpenAlex' : source.source}
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
                                ) : (
                                    <p className="text-sm text-gray-500 italic">
                                        As referências estão citadas no texto acima. Verifique os links no final da resposta.
                                    </p>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

