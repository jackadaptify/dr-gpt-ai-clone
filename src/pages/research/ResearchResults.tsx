import React from 'react';
import { ExternalLink, BookOpen, Quote } from 'lucide-react';

interface ResearchResultsProps {
    results: any[];
    isDarkMode: boolean;
}

export default function ResearchResults({ results, isDarkMode }: ResearchResultsProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Resultados Encontrados
            </h2>

            <div className="grid gap-4">
                {results.map((result, index) => (
                    <div
                        key={index}
                        className={`
                            p-6 rounded-xl border transition-all duration-200 group
                            ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/30' : 'bg-white border-slate-200 hover:border-indigo-300'}
                        `}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h3 className={`text-lg font-medium group-hover:text-indigo-500 transition-colors ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                                {result.title}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                                {result.source}
                            </span>
                        </div>

                        <p className={`text-sm leading-relaxed mb-4 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                            {result.snippet}
                        </p>

                        <div className="flex items-center justify-end">
                            <button className={`
                                flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors
                                ${isDarkMode ? 'hover:bg-indigo-500/10 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-600'}
                            `}>
                                <ExternalLink className="w-3 h-3" />
                                Ler Fonte Completa
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
