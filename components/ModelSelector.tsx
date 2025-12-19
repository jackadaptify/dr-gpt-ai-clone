import React, { useState, useRef, useEffect } from 'react';
import { AIModel, Agent } from '../types';
import {
    IconArrowDown, IconCheck, IconSearch,
    getProviderIcon
} from './Icons';

interface ModelSelectorProps {
    models: AIModel[];
    selectedModelId: string;
    onSelect: (modelId: string) => void;
    isDarkMode: boolean;
    agents?: Agent[];
    onSelectAgent?: (agent: Agent) => void;
    selectedAgentId?: string | null;
}

type Tab = 'text' | 'image' | 'expert';

export default function ModelSelector({ models, selectedModelId, onSelect, isDarkMode, agents = [], onSelectAgent, selectedAgentId }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('text');
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const selectedModel = models.find(m => m.id === selectedModelId) || models[0];
    const selectedAgent = agents?.find(a => a.id === selectedAgentId);
    const displayName = selectedAgent ? selectedAgent.name : selectedModel?.name;

    const getDisplayIcon = () => {
        if (selectedAgent) {
            if (selectedAgent.avatarUrl) {
                return (
                    <img
                        src={selectedAgent.avatarUrl}
                        alt={selectedAgent.name}
                        className="w-5 h-5 rounded object-cover"
                        style={{ objectPosition: selectedAgent.avatarPosition || 'center' }}
                    />
                );
            }
            return (
                <div className={`w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br ${selectedAgent.color || 'from-gray-500 to-gray-700'} text-[10px] text-white font-bold`}>
                    {selectedAgent.name.charAt(0)}
                </div>
            );
        }
        return selectedModel?.logo ? (
            <img
                src={selectedModel.logo}
                alt={selectedModel.name}
                className="w-5 h-5 rounded object-cover bg-black/10"
            />
        ) : getProviderIcon(selectedModel?.provider || '');
    };

    // Filter models based on tab and search
    const getTabContent = () => {
        // Experts Tab = Agents
        if (activeTab === 'expert') {
            if (!agents) return [];
            if (searchQuery) {
                return agents.filter(a =>
                    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.role.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }
            return agents;
        }

        // Models Tab
        let tabModels: AIModel[] = [];

        if (activeTab === 'text') {
            tabModels = models.filter(m => !m.capabilities.imageGeneration);
        } else if (activeTab === 'image') {
            tabModels = models.filter(m => m.capabilities.imageGeneration);
        }

        // Apply search
        if (searchQuery) {
            return tabModels.filter(m =>
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.provider.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return tabModels;
    };

    const filteredItems = getTabContent();

    // Grouping Logic for Models
    const getGroupedModels = (items: AIModel[]) => {
        const groups: Record<string, AIModel[]> = {};
        // Define explicit order for known categories if desired
        const order = ['Elite 🏆', 'Raciocínio Clínico 🧠', 'Ferramentas 🛠️', 'Velocidade ⚡', 'Open Source 🔓', 'Geração de Imagens 🎨', 'Novos 🆕'];

        items.forEach(model => {
            const cat = model.category || 'Outros';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(model);
        });

        // Sort keys based on predefined order, then alphabetical for others
        return Object.keys(groups).sort((a, b) => {
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        }).map(category => ({
            category,
            models: groups[category]
        }));
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border bg-surfaceHighlight border-borderLight hover:bg-surface text-textMain shadow-convex"
            >
                <div className="flex items-center gap-2">
                    {getDisplayIcon()}
                    <span className="text-sm font-semibold tracking-wide max-w-[150px] truncate">
                        {displayName}
                    </span>
                </div>
                <IconArrowDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[360px] max-h-[500px] overflow-hidden rounded-2xl border shadow-2xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200 origin-top-left bg-surface/95 backdrop-blur-xl border-borderLight text-textMain">
                    {/* Tabs */}
                    <div className="flex items-center p-1 m-2 bg-surfaceHighlight rounded-xl">
                        {(['text', 'image', 'expert'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize
                                    ${activeTab === tab
                                        ? 'bg-surface text-textMain shadow-sm border border-borderLight'
                                        : 'text-textMuted hover:text-textMain'}
                                `}
                            >
                                {tab === 'text' ? 'Texto' : tab === 'image' ? 'Imagens' : 'Experts'}
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="px-3 pb-2">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surfaceHighlight">
                            <IconSearch className="w-4 h-4 text-textMuted" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar modelo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full placeholder-textMuted text-textMain"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
                        {/* Models (Text & Image) - Grouped */}
                        {activeTab !== 'expert' && getGroupedModels(filteredItems as AIModel[]).map(({ category, models: groupModels }) => (
                            <div key={category} className="mb-4">
                                <div className="px-3 py-1 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted">
                                        {category}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {groupModels.map(model => {
                                        const isSelected = model.id === selectedModelId;
                                        return (
                                            <button
                                                key={model.id}
                                                onClick={() => {
                                                    onSelect(model.id);
                                                    setIsOpen(false);
                                                }}
                                                className={`
                                                    w-full text-left px-3 py-3 rounded-xl flex items-center justify-between group transition-all
                                                    ${isSelected
                                                        ? 'bg-emerald-500/10 text-emerald-500'
                                                        : 'text-textMuted hover:bg-surfaceHighlight hover:text-textMain'}
                                                `}
                                            >
                                                <div className="flex items-start gap-3 overflow-hidden">
                                                    <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5 bg-surfaceHighlight">
                                                        {model.logo ? (
                                                            <div className="w-5 h-5 rounded-sm overflow-hidden">
                                                                <img src={model.logo} alt={model.name} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : getProviderIcon(model.provider)}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold truncate">{model.name}</span>
                                                            {model.badge && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 whitespace-nowrap">
                                                                    {model.badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs opacity-60 truncate">{model.description}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                    {isSelected && <IconCheck className="w-4 h-4 text-emerald-500" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Agents List (Experts Tab) */}
                        {activeTab === 'expert' && filteredItems.map(item => {
                            const agent = item as Agent;
                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => {
                                        if (onSelectAgent) onSelectAgent(agent);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-full text-left px-3 py-3 rounded-xl flex items-center justify-between group transition-all mb-1
                                        hover:bg-surfaceHighlight text-textMuted hover:text-textMain
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-surfaceHighlight">
                                            {agent.avatarUrl ? (
                                                <img
                                                    src={agent.avatarUrl}
                                                    alt={agent.name}
                                                    className="w-full h-full object-cover"
                                                    style={{ objectPosition: agent.avatarPosition || 'center' }}
                                                />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center font-bold text-white bg-gradient-to-br ${agent.color}`}>
                                                    {agent.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold">{agent.name}</span>
                                            </div>
                                            <span className="text-xs opacity-60 truncate max-w-[200px]">{agent.role}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {filteredItems.length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
                                <IconSearch className="w-8 h-8 opacity-20" />
                                <p>Nenhum item encontrado.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
