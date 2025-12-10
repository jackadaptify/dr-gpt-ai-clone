import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { modelHealthService, ProviderHealth, ModelHealth, UsageStats } from '../../services/modelHealthService';
import { AVAILABLE_MODELS, AIModel } from '../../types';
import { fetchOpenRouterModels } from '../../services/openRouterService';
import { IconActivity, IconCheck, IconAlertTriangle, IconX, IconRefresh, IconServer } from '../Icons';

export default function ModelManager() {
    const [enabledModels, setEnabledModels] = useState<string[]>([]);
    const [modelCategories, setModelCategories] = useState<{ text: string[], image: string[], expert: string[] }>({ text: [], image: [], expert: [] });
    const [healthStatus, setHealthStatus] = useState<ProviderHealth[]>([]);
    const [modelHealth, setModelHealth] = useState<ModelHealth[]>([]);
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkingHealth, setCheckingHealth] = useState(false);
    const [dynamicModels, setDynamicModels] = useState<AIModel[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Utility to clean model names (Duplicated from App.tsx for now to ensure consistency)
    const cleanModelName = (name: string, id: string) => {
        let clean = name.replace(/^(google\/|openai\/|anthropic\/|deepseek\/|meta-llama\/)/i, '');
        clean = clean.replace(/:free/i, '');
        clean = clean.replace(/:online/i, '');

        if (id.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash';
        if (id.includes('gemini-pro-1.5')) return 'Gemini 1.5 Pro';
        if (id.includes('gpt-4o')) return 'GPT-4o';
        if (id.includes('claude-3.5-sonnet')) return 'Claude 3.5 Sonnet';

        return clean;
    };

    const handleAutoSelectPopular = async () => {
        const popularPrefixes = ['openai/', 'google/', 'anthropic/'];
        const popularIds = dynamicModels
            .filter(m => popularPrefixes.some(p => m.id.startsWith(p)) || m.id.includes('deepseek') || m.id.includes('llama-3'))
            .map(m => m.id);

        // Merge with existing enabled models to avoid unchecking
        const newEnabled = Array.from(new Set([...enabledModels, ...popularIds]));

        setEnabledModels(newEnabled);

        // Persist immediately
        const { error } = await adminService.updateModelStatusBatch(newEnabled);
        if (error) {
            alert('Erro ao salvar seleção automática.');
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                adminService.getAppSettings(),
                modelHealthService.checkAllProviders(),
                modelHealthService.checkAllModels(),
                modelHealthService.getGlobalStats(),
                adminService.getModelCategories()
            ]);

            const settings = results[0].status === 'fulfilled' ? results[0].value : { enabled_models: [] };
            const health = results[1].status === 'fulfilled' ? results[1].value : [];
            const modelsHealth = results[2].status === 'fulfilled' ? results[2].value : [];
            const stats = results[3].status === 'fulfilled' ? results[3].value : null;
            const categories = results[4].status === 'fulfilled' ? results[4].value : { text: [], image: [], expert: [] };

            if (results[0].status === 'rejected') console.error('Failed to load settings', results[0].reason);
            if (results[1].status === 'rejected') console.error('Failed to load provider health', results[1].reason);
            if (results[2].status === 'rejected') console.error('Failed to load model health', results[2].reason);
            if (results[3].status === 'rejected') console.error('Failed to load stats', results[3].reason);
            if (results[4].status === 'rejected') console.error('Failed to load categories', results[4].reason);

            // Fetch Dynamic Models
            const fetchedModels = await fetchOpenRouterModels();
            const mergedModels: AIModel[] = fetchedModels.map(fm => {
                const staticDef = AVAILABLE_MODELS.find(am => am.modelId === fm.id);
                if (staticDef) {
                    return { ...staticDef, name: cleanModelName(fm.name, fm.id) };
                }
                return {
                    id: fm.id,
                    name: cleanModelName(fm.name, fm.id),
                    description: 'Modelo OpenRouter',
                    provider: fm.id.split('/')[0] as any,
                    modelId: fm.id,
                    capabilities: {
                        vision: fm.id.includes('vision'),
                        imageGeneration: fm.id.includes('image'),
                        videoGeneration: fm.id.includes('video'),
                        audioGeneration: false,
                        webSearch: fm.id.includes('online'),
                        reasoning: fm.id.includes('reasoning'),
                        upload: true
                    },
                    details: {
                        function: 'Dynamic',
                        inputTypes: ['Text'],
                        outputTypes: ['Text'],
                        features: [],
                        pricing: { input: '?', output: '?' }
                    }
                };
            });

            if (mergedModels.length > 0) {
                setDynamicModels(mergedModels);
                // Ensure enabledModels has defaults if empty
                if (!settings.enabled_models || settings.enabled_models.length === 0) {
                    setEnabledModels(mergedModels.map(m => m.id));
                } else {
                    setEnabledModels(settings.enabled_models);
                }
            } else {
                setDynamicModels(AVAILABLE_MODELS);
                setEnabledModels(settings.enabled_models || AVAILABLE_MODELS.map(m => m.id));
            }

            setModelCategories(categories);
            setHealthStatus(health);
            setModelHealth(modelsHealth);
            setUsageStats(stats);
        } catch (error) {
            console.error('Critical failure loading data', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshHealth = async () => {
        setCheckingHealth(true);
        try {
            const results = await Promise.allSettled([
                modelHealthService.checkAllProviders(),
                modelHealthService.checkAllModels()
            ]);

            const health = results[0].status === 'fulfilled' ? results[0].value : [];
            const modelsHealth = results[1].status === 'fulfilled' ? results[1].value : [];

            if (results[0].status === 'rejected') console.error('Failed to refresh provider health', results[0].reason);
            if (results[1].status === 'rejected') console.error('Failed to refresh model health', results[1].reason);

            setHealthStatus(health);
            setModelHealth(modelsHealth);
        } finally {
            setCheckingHealth(false);
        }
    };

    const toggleModel = async (modelId: string, enabled: boolean) => {
        try {
            if (enabled) {
                setEnabledModels(prev => [...prev, modelId]);
            } else {
                setEnabledModels(prev => prev.filter(id => id !== modelId));
            }
            await adminService.updateModelStatus(modelId, enabled);
        } catch (error) {
            console.error('Failed to update model status', error);
            loadData(); // Revert on error
        }
    };

    const toggleCategory = async (modelId: string, category: 'text' | 'image' | 'expert', active: boolean) => {
        const newCategories = { ...modelCategories };
        if (active) {
            if (!newCategories[category].includes(modelId)) {
                newCategories[category] = [...newCategories[category], modelId];
            }
        } else {
            newCategories[category] = newCategories[category].filter(id => id !== modelId);
        }

        setModelCategories(newCategories);
        try {
            await adminService.updateModelCategories(newCategories);
        } catch (error) {
            console.error('Failed to update categories', error);
            loadData();
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'degraded': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'offline': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    if (loading) return <div className="text-zinc-500 animate-pulse">Carregando painel de IA...</div>;

    return (
        <div className="space-y-8">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <IconActivity className="w-5 h-5" />
                        </div>
                        <span className="text-zinc-400 text-sm font-bold">Requisições Totais</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{usageStats?.requestsCount || 0}</p>
                </div>

                <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                            <IconServer className="w-5 h-5" />
                        </div>
                        <span className="text-zinc-400 text-sm font-bold">Tokens Processados</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{(usageStats?.totalTokens || 0).toLocaleString()}</p>
                </div>

                <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <IconActivity className="w-5 h-5" />
                            </div>
                            <span className="text-zinc-400 text-sm font-bold">Status dos Provedores</span>
                        </div>
                        <button
                            onClick={refreshHealth}
                            disabled={checkingHealth}
                            className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${checkingHealth ? 'animate-spin text-emerald-500' : 'text-zinc-400'}`}
                        >
                            <IconRefresh className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {healthStatus.map(provider => (
                            <div key={provider.provider} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${provider.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                                    <span className="font-medium">{provider.provider}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-zinc-500 font-mono">{provider.latency}ms</span>
                                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(provider.status)}`}>
                                        {provider.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Models Grid */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold">Gerenciamento de Modelos ({dynamicModels.length})</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAutoSelectPopular}
                            className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-sm font-bold transition-colors"
                        >
                            Auto-Select Popular
                        </button>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar modelo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-sm focus:outline-none focus:border-emerald-500/50 w-64"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(dynamicModels.length > 0 ? dynamicModels : AVAILABLE_MODELS)
                        .filter(m =>
                            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.provider.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(model => {
                            const isEnabled = enabledModels.includes(model.id);
                            const health = modelHealth.find(h => h.id === model.id);
                            const isOnline = health?.status === 'online';

                            return (
                                <div key={model.id} className={`p-6 rounded-2xl border transition-all ${isEnabled
                                    ? 'bg-emerald-500/5 border-emerald-500/20'
                                    : 'bg-[#0a0a0a] border-white/5 opacity-60'
                                    }`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg">{model.name}</h3>
                                                {health && (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isOnline
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            }`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                            {isOnline ? `${health.latency}ms` : 'OFFLINE'}
                                                        </div>
                                                        {!isOnline && health.error && (
                                                            <span className="text-[10px] text-red-400 max-w-[200px] truncate" title={health.rawError || health.error}>
                                                                {health.error}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mt-1">{model.provider}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isEnabled}
                                                onChange={(e) => toggleModel(model.id, e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>

                                    <p className="text-sm text-zinc-400 mb-4">{model.description}</p>

                                    {/* Category Selection */}
                                    <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-black/20 border border-white/5">
                                        <span className="text-xs font-bold text-zinc-500 uppercase">Categorias:</span>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20"
                                                checked={modelCategories.text.includes(model.id)}
                                                onChange={(e) => toggleCategory(model.id, 'text', e.target.checked)}
                                            />
                                            <span className="text-xs text-zinc-300">Texto</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20"
                                                checked={modelCategories.image.includes(model.id)}
                                                onChange={(e) => toggleCategory(model.id, 'image', e.target.checked)}
                                            />
                                            <span className="text-xs text-zinc-300">Imagens</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20"
                                                checked={modelCategories.expert.includes(model.id)}
                                                onChange={(e) => toggleCategory(model.id, 'expert', e.target.checked)}
                                            />
                                            <span className="text-xs text-zinc-300">Experts</span>
                                        </label>
                                    </div>

                                    {model.details && (
                                        <div className="space-y-3 pt-4 border-t border-white/5 text-xs">
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-400">
                                                <span>Input: <span className="text-zinc-300">{model.details.pricing.input}</span></span>
                                                <span>Output: <span className="text-zinc-300">{model.details.pricing.output}</span></span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
