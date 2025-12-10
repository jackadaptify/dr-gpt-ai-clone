import React, { useState, useEffect } from 'react';
import { IconSearch, IconX, IconBrackets, IconArrowLeft } from './Icons';

interface Prompt {
    id: string;
    title: string;
    description: string;
    category: string;
    content: string;
}

const PROMPTS_DATA: Prompt[] = [
    {
        id: '1',
        title: 'Tradução de Texto',
        description: 'Traduza qualquer texto para o seu idioma desejado.',
        category: 'Popular',
        content: 'Traduza o seguinte texto para [IDIOMA]:\n\n[TEXTO]'
    },
    {
        id: '2',
        title: 'Transforme em Mensagem Concisa',
        description: 'Transforme texto extenso em conteúdo claro e legível mantendo a mensagem original.',
        category: 'Popular',
        content: 'Reescreva o texto abaixo de forma mais concisa e direta, mantendo os pontos principais:\n\n[TEXTO]'
    },
    {
        id: '3',
        title: 'Estratégia de Conteúdo',
        description: 'Guia interativo para identificar ansiedades e criar conteúdo relevante não promocional.',
        category: 'Marketing',
        content: 'Crie uma estratégia de conteúdo para [NICHO] focada em resolver as dores e ansiedades do público-alvo, sem ser excessivamente promocional.'
    },
    {
        id: '4',
        title: 'Post para Instagram',
        description: 'Crie legendas engajadoras para suas fotos e vídeos.',
        category: 'Marketing',
        content: 'Escreva uma legenda para um post de Instagram sobre [TEMA]. O tom deve ser [TOM] e incluir hashtags relevantes.'
    },
    {
        id: '5',
        title: 'Resumo de Artigo',
        description: 'Obtenha os pontos-chave de artigos longos ou documentos.',
        category: 'Acadêmico',
        content: 'Resuma o seguinte artigo em tópicos principais, destacando as conclusões mais importantes:\n\n[TEXTO]'
    },
    {
        id: '6',
        title: 'Email Profissional',
        description: 'Escreva emails formais e claros para diversas situações.',
        category: 'Comunicação',
        content: 'Escreva um email profissional para [DESTINATÁRIO] sobre [ASSUNTO]. O objetivo é [OBJETIVO].'
    }
];

const CATEGORIES = ['Todos', 'Popular', 'Marketing', 'Comunicação', 'Acadêmico', 'Criação de Conteúdo'];

interface PromptsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPrompt: (content: string) => void;
    isDarkMode: boolean;
}

export default function PromptsModal({ isOpen, onClose, onSelectPrompt, isDarkMode }: PromptsModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [filteredPrompts, setFilteredPrompts] = useState(PROMPTS_DATA);

    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase();
        const filtered = PROMPTS_DATA.filter(prompt => {
            const matchesSearch = prompt.title.toLowerCase().includes(lowerQuery) ||
                prompt.description.toLowerCase().includes(lowerQuery);
            const matchesCategory = selectedCategory === 'Todos' || prompt.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
        setFilteredPrompts(filtered);
    }, [searchQuery, selectedCategory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`
                    w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden
                    ${isDarkMode ? 'bg-[#18181b] text-zinc-200' : 'bg-white text-gray-800'}
                `}
            >
                {/* Header */}
                <div className={`p-6 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-100'} flex items-center justify-between`}>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <IconBrackets className="w-6 h-6 text-emerald-500" />
                        Biblioteca de Prompts
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    >
                        <IconX className="w-6 h-6" />
                    </button>
                </div>

                {/* Search & Categories */}
                <div className="p-6 pb-2 space-y-6">
                    {/* Search Bar */}
                    <div className={`
                        flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all
                        ${isDarkMode
                            ? 'bg-black/20 border-white/10 focus-within:border-emerald-500/50'
                            : 'bg-gray-50 border-gray-200 focus-within:border-emerald-500/50'}
                    `}>
                        <IconSearch className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar prompts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-lg placeholder-gray-500"
                            autoFocus
                        />
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`
                                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                                    ${selectedCategory === cat
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : isDarkMode
                                            ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Prompts Grid */}
                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPrompts.map(prompt => (
                            <div
                                key={prompt.id}
                                className={`
                                    p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 group
                                    ${isDarkMode
                                        ? 'bg-white/5 border-white/5 hover:border-emerald-500/30 hover:bg-white/10'
                                        : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-lg'}
                                `}
                            >
                                <div className="flex items-start justify-between">
                                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <IconBrackets className="w-5 h-5" />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-bold text-lg mb-2 group-hover:text-emerald-500 transition-colors">{prompt.title}</h3>
                                    <p className={`text-sm line-clamp-3 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                                        {prompt.description}
                                    </p>
                                </div>

                                <div className="mt-auto pt-4 flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            onSelectPrompt(prompt.content);
                                            onClose();
                                        }}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        Usar
                                    </button>
                                    <button
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-gray-100 text-gray-600'}`}
                                    >
                                        Visualizar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredPrompts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                            <IconSearch className="w-12 h-12 mb-4" />
                            <p className="text-lg font-medium">Nenhum prompt encontrado</p>
                            <p className="text-sm">Tente buscar por outro termo ou categoria</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
