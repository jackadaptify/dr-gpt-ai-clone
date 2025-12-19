import React, { useState, useEffect } from 'react';
import {
    BookOpenText,
    ClipboardList,
    MessageCircleHeart,
    Video,
    FileSignature,
    ShieldAlert,
    Search,
    X,
    Brackets,
    ArrowLeft,
    LucideIcon
} from 'lucide-react';

interface Prompt {
    id: string;
    title: string;
    description: string;
    category: string;
    content: string;
    icon: LucideIcon;
}

const PROMPTS_DATA: Prompt[] = [
    {
        id: '1',
        title: 'Tradutor de "Mediquês"',
        description: 'Reescreva laudos técnicos complexos em linguagem simples e empática para compreensão do paciente.',
        category: 'Comunicação Paciente',
        icon: BookOpenText,
        content: 'Reescreva o seguinte laudo técnico em linguagem simples e empática para que o paciente possa compreender, sem perder a precisão das informações:\n\n[LAUDO]'
    },
    {
        id: '2',
        title: 'Resumo Clínico SOAP',
        description: 'Transforme anotações soltas e transcrições de consulta em uma evolução clínica no padrão S.O.A.P.',
        category: 'Produtividade Clínica',
        icon: ClipboardList,
        content: 'Organize as seguintes anotações da consulta no formato S.O.A.P. (Subjetivo, Objetivo, Avaliação, Plano):\n\n[ANOTAÇÕES]'
    },
    {
        id: '3',
        title: 'Resposta a Dúvidas Pós-Op',
        description: 'Gere respostas acolhedoras e técnicas para dúvidas comuns de recuperação no WhatsApp.',
        category: 'Retenção',
        icon: MessageCircleHeart,
        content: 'Crie uma resposta para WhatsApp, acolhedora e técnica, para a seguinte dúvida de pós-operatório:\n\n[DÚVIDA]'
    },
    {
        id: '4',
        title: 'Roteiro para Reels Educativo',
        description: 'Crie roteiros virais desmistificando mitos da sua especialidade sem ferir a ética médica.',
        category: 'Marketing Médico',
        icon: Video,
        content: 'Crie um roteiro para um Reels educativo de 60 segundos desmistificando o seguinte mito da minha especialidade, mantendo a ética médica:\n\n[MITO]'
    },
    {
        id: '5',
        title: 'Carta de Encaminhamento',
        description: 'Redija cartas formais para colegas especialistas detalhando o histórico e a necessidade do parecer.',
        category: 'Burocracia',
        icon: FileSignature,
        content: 'Redija uma carta de encaminhamento formal para um colega especialista em [ESPECIALIDADE], detalhando o seguinte caso e a razão do encaminhamento:\n\n[CASO]'
    },
    {
        id: '6',
        title: 'Análise de Interação Medicamentosa',
        description: 'Verifique rapidamente potenciais interações entre a lista de medicamentos atual e o uso contínuo do paciente.',
        category: 'Segurança',
        icon: ShieldAlert,
        content: 'Analise potenciais interações medicamentosas entre os seguintes medicamentos prescritos e de uso contínuo:\n\n[MEDICAMENTOS]'
    }
];

const CATEGORIES = ['Todos', 'Comunicação Paciente', 'Produtividade Clínica', 'Retenção', 'Marketing Médico', 'Burocracia', 'Segurança'];

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
                className="w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-300 bg-surface border border-borderLight text-textMain"
            >
                {/* Header */}
                <div className="p-6 border-b border-borderLight flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                            <Brackets className="w-6 h-6 text-emerald-500" />
                        </div>
                        Biblioteca de Prompts
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors hover:bg-surfaceHighlight text-textMuted hover:text-textMain"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search & Categories */}
                <div className="p-6 pb-2 space-y-6">
                    {/* Search Bar */}
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-300 bg-surfaceHighlight border-borderLight focus-within:border-emerald-500/50 focus-within:bg-surface">
                        <Search className="w-5 h-5 text-textMuted" />
                        <input
                            type="text"
                            placeholder="Buscar prompts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-lg placeholder-textMuted text-textMain"
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
                                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300
                                    ${selectedCategory === cat
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                                        : 'bg-surfaceHighlight hover:bg-surface text-textMuted hover:text-textMain border border-transparent hover:border-borderLight'}
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
                                    p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-4 group relative overflow-hidden
                                    bg-surfaceHighlight/30 border-borderLight hover:border-emerald-500/50 hover:bg-surfaceHighlight hover:shadow-lg
                                `}
                            >
                                <div className="flex items-start justify-between relative z-10">
                                    <div className={`p-3 rounded-xl transition-colors duration-300 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'}`}>
                                        <prompt.icon className="w-6 h-6" />
                                    </div>
                                    <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surfaceHighlight text-textMuted border border-borderLight">
                                        {prompt.category}
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <h3 className="font-semibold text-lg mb-2 transition-colors text-textMain group-hover:text-emerald-500">
                                        {prompt.title}
                                    </h3>
                                    <p className="text-sm line-clamp-3 leading-relaxed text-textMuted group-hover:text-textMain">
                                        {prompt.description}
                                    </p>
                                </div>

                                <div className="mt-auto pt-4 flex items-center gap-3 relative z-10">
                                    <button
                                        onClick={() => {
                                            onSelectPrompt(prompt.content);
                                            onClose();
                                        }}
                                        className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.98]"
                                    >
                                        Usar Prompt
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredPrompts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                            <Search className="w-16 h-16 mb-4 text-textMuted" />
                            <p className="text-xl font-medium text-textMuted">Nenhum prompt encontrado</p>
                            <p className="text-sm text-textMuted mt-2">Tente buscar por outro termo ou categoria</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
