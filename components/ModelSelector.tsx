import React, { useState, useRef, useEffect } from 'react';
import { AIModel, Agent } from '../types';
import {
    IconGoogle, IconOpenAI, IconAnthropic, IconDeepSeek, IconMeta,
    IconSearch, IconCheck, IconArrowDown, IconBrain, IconImage, IconGlobe,
    getProviderIcon
} from './Icons';
import { adminService } from '../services/adminService';
import { Info } from 'lucide-react';

interface ModelSelectorProps {
    models: AIModel[];
    selectedModelId: string;
    onSelect: (modelId: string) => void;
    isDarkMode: boolean;
    agents?: Agent[];
    onSelectAgent?: (agent: Agent) => void;
}

type Tab = 'text' | 'image' | 'expert';

export default function ModelSelector({ models, selectedModelId, onSelect, isDarkMode, agents = [], onSelectAgent }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('text');
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<{ text: string[], image: string[], expert: string[] }>({ text: [], image: [], expert: [] });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Load categories
    useEffect(() => {
        adminService.getModelCategories().then(setCategories);
    }, []);

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

        // Other Tabs = Models
        let tabModels: AIModel[] = [];

        // If categories are defined, use them
        if (categories.text.length > 0 || categories.image.length > 0) {
            const categoryIds = categories[activeTab === 'image' ? 'image' : 'text'];

            // activeTab is guaranteed to be 'text' or 'image' here because we returned early for 'expert'
            tabModels = models.filter(m => categoryIds.includes(m.id));
        } else {
            // Fallback logic
            if (activeTab === 'text') {
                tabModels = models.filter(m => !m.capabilities.imageGeneration);
            } else if (activeTab === 'image') {
                tabModels = models.filter(m => m.capabilities.imageGeneration);
            }
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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border
                    ${isDarkMode
                        ? 'bg-surfaceHighlight border-borderLight hover:bg-white/5 text-textMain shadow-convex'
                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800 shadow-sm'}
                `}
            >
                <div className="flex items-center gap-2">
                    {getProviderIcon(selectedModel?.provider || '')}
                    <span className="text-sm font-semibold tracking-wide max-w-[150px] truncate">
                        {selectedModel?.name}
                    </span>
                </div>
                <IconArrowDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`
                    absolute top-full left-0 mt-2 w-[360px] max-h-[500px] overflow-hidden rounded-2xl border shadow-2xl z-50 flex flex-col
                    animate-in fade-in zoom-in-95 duration-200 origin-top-left
                    ${isDarkMode
                        ? 'bg-[#1a1a1a]/95 backdrop-blur-xl border-white/10 text-textMain'
                        : 'bg-white/95 backdrop-blur-xl border-gray-200 text-gray-800'}
                `}>
                    {/* Tabs */}
                    <div className="flex items-center p-1 m-2 bg-black/20 rounded-xl">
                        {(['text', 'image', 'expert'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize
                                    ${activeTab === tab
                                        ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm')
                                        : 'text-zinc-500 hover:text-zinc-300'}
                                `}
                            >
                                {tab === 'text' ? 'Texto' : tab === 'image' ? 'Imagens' : 'Experts'}
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="px-3 pb-2">
                        <div className={`
                            flex items-center gap-2 px-3 py-2 rounded-xl
                            ${isDarkMode ? 'bg-black/20' : 'bg-gray-100'}
                        `}>
                            <IconSearch className="w-4 h-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar modelo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-500"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
                        {filteredItems.map(item => {
                            // Check if it's an Agent or Model based on property presence
                            const isAgent = 'role' in item;

                            if (isAgent) {
                                const agent = item as Agent;
                                return (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            if (onSelectAgent) onSelectAgent(agent);
                                            setIsOpen(false);
                                        }}
                                        className={`
                                            w-full text-left px-3 py-3 rounded-xl flex items-center justify-between group transition-all
                                            ${isDarkMode ? 'hover:bg-white/5 text-gray-300 hover:text-white' : 'hover:bg-gray-50 text-gray-700 hover:text-black'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg flex items-center justify-center w-8 h-8 font-bold text-white bg-gradient-to-br ${agent.color}`}>
                                                {agent.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold">{agent.name}</span>
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                                                        Expert
                                                    </span>
                                                </div>
                                                <span className="text-xs opacity-60 truncate max-w-[200px]">{agent.role}</span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            } else {
                                const model = item as AIModel;
                                const isSelected = model.id === selectedModelId;
                                const isNew = model.id.includes('3') || model.id.includes('opus') || model.id.includes('gemini-1.5');

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
                                                ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                                : (isDarkMode ? 'hover:bg-white/5 text-gray-300 hover:text-white' : 'hover:bg-gray-50 text-gray-700 hover:text-black')}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                                {getProviderIcon(model.provider)}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold">{model.name}</span>
                                                    {isNew && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                                                            Novo
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Info className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />
                                            {isSelected && <IconCheck className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                    </button>
                                );
                            }
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
