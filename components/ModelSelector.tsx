import React, { useState, useRef, useEffect } from 'react';
import { AIModel } from '../types';
import {
    IconGoogle, IconOpenAI, IconAnthropic, IconDeepSeek, IconMeta,
    IconSearch, IconCheck, IconArrowDown, IconBrain, IconImage, IconGlobe,
    getProviderIcon
} from './Icons';

interface ModelSelectorProps {
    models: AIModel[];
    selectedModelId: string;
    onSelect: (modelId: string) => void;
    isDarkMode: boolean;
}

export default function ModelSelector({ models, selectedModelId, onSelect, isDarkMode }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
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

    // getProviderIcon is now imported from Icons.tsx

    const selectedModel = models.find(m => m.id === selectedModelId) || models[0];

    // Group models by provider
    const filteredModels = models.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.provider.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedModels = filteredModels.reduce((acc, model) => {
        const provider = model.provider || 'Outros';
        if (!acc[provider]) acc[provider] = [];
        acc[provider].push(model);
        return acc;
    }, {} as Record<string, AIModel[]>);

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
                    absolute top-full left-0 mt-2 w-[320px] max-h-[400px] overflow-hidden rounded-2xl border shadow-2xl z-50 flex flex-col
                    animate-in fade-in zoom-in-95 duration-200 origin-top-left
                    ${isDarkMode
                        ? 'bg-[#1a1a1a]/95 backdrop-blur-xl border-white/10 text-textMain'
                        : 'bg-white/95 backdrop-blur-xl border-gray-200 text-gray-800'}
                `}>
                    {/* Search Bar */}
                    <div className={`p-3 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                        <div className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg
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

                    {/* Models List */}
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
                        {Object.entries(groupedModels).map(([provider, providerModels]) => (
                            <div key={provider} className="mb-2 last:mb-0">
                                <div className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    {getProviderIcon(provider)}
                                    {provider}
                                </div>
                                <div className="space-y-1">
                                    {providerModels.map(model => {
                                        const isSelected = model.id === selectedModelId;
                                        return (
                                            <button
                                                key={model.id}
                                                onClick={() => {
                                                    onSelect(model.id);
                                                    setIsOpen(false);
                                                }}
                                                className={`
                                                    w-full text-left px-3 py-2 rounded-lg flex items-center justify-between group transition-all
                                                    ${isSelected
                                                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                                        : (isDarkMode ? 'hover:bg-white/5 text-gray-300 hover:text-white' : 'hover:bg-gray-50 text-gray-700 hover:text-black')}
                                                `}
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-medium">{model.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        {model.capabilities.vision && <IconImage className="w-3 h-3 opacity-50" />}
                                                        {model.capabilities.webSearch && <IconGlobe className="w-3 h-3 opacity-50" />}
                                                        {model.capabilities.reasoning && <IconBrain className="w-3 h-3 opacity-50" />}
                                                    </div>
                                                </div>
                                                {isSelected && <IconCheck className="w-4 h-4" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {filteredModels.length === 0 && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                Nenhum modelo encontrado.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
