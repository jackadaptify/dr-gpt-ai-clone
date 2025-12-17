import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { modelHealthService, ProviderHealth, ModelHealth, UsageStats } from '../../services/modelHealthService';
import { AVAILABLE_MODELS, AIModel } from '../../types';
import { fetchOpenRouterModels } from '../../services/openRouterService';
import { IconActivity, IconCheck, IconAlertTriangle, IconX, IconRefresh, IconServer, IconBrain, IconEdit } from '../Icons';
import { streamChatResponse } from '../../services/chatService';

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

    // Filter State
    const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [filterType, setFilterType] = useState<'all' | 'text' | 'image'>('all');

    // AI Agent State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isProcessingAI, setIsProcessingAI] = useState(false);

    // API Key State
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [savingKey, setSavingKey] = useState(false);
    const [apiKeyStatus, setApiKeyStatus] = useState<'configured' | 'missing'>('missing');

    // Edit State
    const [editingModel, setEditingModel] = useState<AIModel | null>(null);
    const [editForm, setEditForm] = useState({ name: '', description: '', category: '', badge: '', logo: '' });

    const handleEditClick = (model: AIModel) => {
        setEditingModel(model);
        setEditForm({
            name: model.name || '',
            description: model.description || '',
            category: model.category || 'Outros',
            badge: model.badge || '',
            logo: model.logo || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingModel) return;

        console.log('[DEBUG] Saving edit for model:', editingModel.id, editForm);

        try {
            const overrides = await adminService.getModelOverrides();
            console.log('[DEBUG] Current overrides before update:', overrides);

            overrides[editingModel.id] = {
                name: editForm.name,
                description: editForm.description,
                category: editForm.category,
                badge: editForm.badge,
                logo: editForm.logo
            };

            await adminService.updateModelOverrides(overrides);
            console.log('[DEBUG] Overrides updated successfully in DB');

            // Verify persistence immediately
            const verification = await adminService.getModelOverrides();
            console.log('[DEBUG] Verification fetch:', verification[editingModel.id]);

            // Update local state immediately
            setDynamicModels(prev => {
                const updated = prev.map(m =>
                    m.id === editingModel.id
                        ? { ...m, name: editForm.name, description: editForm.description, category: editForm.category, badge: editForm.badge, logo: editForm.logo }
                        : m
                );
                console.log('[DEBUG] Updated local dynamicModels:', updated.find(m => m.id === editingModel.id));
                return updated;
            });

            setEditingModel(null);
            alert('Alterações salvas! Verifique o console se o erro persistir.');
        } catch (error) {
            console.error('Failed to save model override', error);
            alert('Erro ao salvar alterações.');
        }
    };

    const handleSaveApiKey = async () => {
        if (!apiKeyInput.trim()) return;
        setSavingKey(true);
        try {
            await adminService.saveApiKey(apiKeyInput.trim());
            setApiKeyStatus('configured');
            setApiKeyInput(''); // Clear for security
            alert('API Key salva com sucesso!');
            refreshHealth(); // Auto-refresh status
        } catch (error) {
            console.error('Failed to save API Key', error);
            alert('Erro ao salvar API Key.');
        } finally {
            setSavingKey(false);
        }
    };

    const handleAIConfig = async () => {
        if (!aiPrompt.trim()) return;

        setIsProcessingAI(true);
        try {
            // 1. Prepare Context
            const availableModelsList = dynamicModels.map(m => `- ID: ${m.id} | Name: ${m.name} | Provider: ${m.provider}`).join('\n');
            const currentEnabled = enabledModels.join(', ');

            const systemPrompt = `
You are an AI Model Configuration Agent for the Dr. GPT platform.
Your task is to decide which AI models should be ENABLED based on the user's request and the list of available models.

AVAILABLE MODELS:
${availableModelsList}

CURRENTLY ENABLED:
${currentEnabled}

USER REQUEST:
"${aiPrompt}"

INSTRUCTIONS:
1. Analyze the user's request (e.g., "Enable only OpenAI models", "Turn off everything except Flash", "I want distinct providers").
2. Select the IDs of the models that match the criteria.
3. Return a JSON object with a single key "enabled_models" containing the array of strings (model IDs).
4. Do not return markdown formatting, just the raw JSON.`;

            // 2. Call AI (using a cheap, fast model like gpt-4o-mini)
            let responseText = "";
            await streamChatResponse(
                'openai/gpt-4o-mini',
                [],
                "Execute configuration task.",
                (chunk) => { responseText += chunk; },
                systemPrompt
            );

            // 3. Parse Response
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanJson);

            if (result.enabled_models && Array.isArray(result.enabled_models)) {
                const newEnabled = result.enabled_models;
                console.log("AI Agent selected models:", newEnabled);

                // 4. Update State & DB
                setEnabledModels(newEnabled);
                await adminService.updateModelStatusBatch(newEnabled);
                setAiPrompt('');
                alert(`Configuração aplicada! ${newEnabled.length} modelos ativos.`);
            } else {
                throw new Error("Invalid response format from AI Agent");
            }

        } catch (error) {
            console.error("AI Config Agent failed:", error);
            alert("Falha ao processar solicitação com IA. Tente ser mais específico.");
        } finally {
            setIsProcessingAI(false);
        }
    };

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
                adminService.getModelCategories(),
                adminService.getModelOverrides() // Load overrides here too
            ]);

            const settings = results[0].status === 'fulfilled' ? results[0].value : { enabled_models: [] };
            const health = results[1].status === 'fulfilled' ? results[1].value : [];
            const modelsHealth = results[2].status === 'fulfilled' ? results[2].value : [];
            const stats = results[3].status === 'fulfilled' ? results[3].value : null;
            const categories = results[4].status === 'fulfilled' ? results[4].value : { text: [], image: [], expert: [] };
            const overrides = results[5].status === 'fulfilled' ? results[5].value : {};

            // Check API Key
            const hasKey = await adminService.getApiKey();
            // Also check env var if possible, but safe to assume it's missing if we are here or just show status based on specific check
            if (hasKey || import.meta.env.VITE_OPENROUTER_API_KEY) {
                setApiKeyStatus('configured');
            } else {
                setApiKeyStatus('missing');
            }

            // Fetch Dynamic Models
            const fetchedModels = await fetchOpenRouterModels();
            const mergedModels: AIModel[] = fetchedModels.map(fm => {
                const staticDef = AVAILABLE_MODELS.find(am => am.modelId === fm.id);
                const override = overrides[fm.id] || {};

                if (staticDef) {
                    return {
                        ...staticDef,
                        name: override.name || cleanModelName(fm.name, fm.id),
                        description: override.description || staticDef.description,
                        category: override.category || staticDef.category,
                        badge: override.badge !== undefined ? override.badge : staticDef.badge,
                        logo: override.logo
                    };
                }
                return {
                    id: fm.id,
                    name: override.name || cleanModelName(fm.name, fm.id),
                    description: override.description || 'Modelo OpenRouter',
                    category: override.category || 'Novos 🆕',
                    badge: override.badge,
                    logo: override.logo,
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

            // Also handle overrides for static models if not in fetched (similar logic to App.tsx)
            // Ideally we should unify this logic in a service or hook, but duplication is acceptable for now.
            // For Admin, we want to see ALL models.

            let allActiveModels = mergedModels;
            if (allActiveModels.length === 0) {
                allActiveModels = AVAILABLE_MODELS.map(m => {
                    const override = overrides[m.id] || {};
                    return {
                        ...m,
                        name: override.name || m.name,
                        description: override.description || m.description,
                        category: override.category || m.category,
                        badge: override.badge !== undefined ? override.badge : m.badge,
                        logo: override.logo
                    };
                });
            }

            setDynamicModels(allActiveModels);

            if (!settings.enabled_models || settings.enabled_models.length === 0) {
                setEnabledModels(allActiveModels.map(m => m.id));
            } else {
                setEnabledModels(settings.enabled_models);
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

    // Helper to filter and sort models
    const getFilteredModels = (sectionType: 'text' | 'image') => {
        // 1. Check Type Filter
        if (filterType !== 'all' && filterType !== sectionType) {
            return [];
        }

        const list = dynamicModels.length > 0 ? dynamicModels : AVAILABLE_MODELS;

        return list.filter(m => {
            // 2. Search Filter
            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.provider.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            // 3. Status Filter
            const isEnabled = enabledModels.includes(m.id);
            if (filterStatus === 'enabled' && !isEnabled) return false;
            if (filterStatus === 'disabled' && isEnabled) return false;

            // 4. Section Match (Text vs Image)
            if (sectionType === 'image') return m.capabilities.imageGeneration;
            return !m.capabilities.imageGeneration;
        });
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

            {/* AI Configuration Agent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* API Key Configuration */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Configuração da API Key</h3>
                            <p className="text-sm text-zinc-400">OpenRouter API (Necessário para conexão)</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-zinc-500">Status atual:</span>
                            {apiKeyStatus === 'configured' ? (
                                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-bold border border-emerald-500/20">
                                    <IconCheck className="w-3 h-3" /> Configurada
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full text-xs font-bold border border-red-500/20">
                                    <IconX className="w-3 h-3" /> Ausente
                                </span>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="password"
                                placeholder="sk-or-v1-..."
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                            />
                            <button
                                onClick={handleSaveApiKey}
                                disabled={savingKey || !apiKeyInput.trim()}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {savingKey ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                            A chave será salva de forma segura no banco de dados e usada se não houver uma variável de ambiente definida.
                        </p>
                    </div>
                </div>

                {/* AI Configuration Agent */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0a0a0a] to-[#121212] border border-emerald-500/20 shadow-lg">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <IconBrain className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">Agente de Configuração de Modelos</h3>
                            <p className="text-sm text-zinc-400 mb-4">
                                Descreva quais modelos você quer ativos. Ex: "Ative apenas os modelos da OpenAI e o Gemini Pro".
                            </p>
                            <div className="flex gap-3">
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Digite sua solicitação para o agente..."
                                    className="flex-1 bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none h-24"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAIConfig();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleAIConfig}
                                    disabled={isProcessingAI || !aiPrompt.trim()}
                                    className={`px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isProcessingAI
                                        ? 'bg-emerald-500/20 text-emerald-500 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                                        }`}
                                >
                                    {isProcessingAI ? (
                                        <IconRefresh className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <span className="text-xl">✨</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Model Management Header & Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold">Gerenciamento de Modelos</h2>
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
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 p-1 bg-[#0a0a0a] border border-white/5 rounded-xl">
                        {(['all', 'text', 'image'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === type
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {type === 'all' ? 'Todos' : type === 'text' ? 'Texto' : 'Imagem'}
                            </button>
                        ))}
                    </div>
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <div className="flex items-center gap-2 p-1 bg-[#0a0a0a] border border-white/5 rounded-xl">
                        {(['all', 'enabled', 'disabled'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === status
                                    ? (status === 'enabled' ? 'bg-emerald-500/20 text-emerald-400' : status === 'disabled' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white')
                                    : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {status === 'all' ? 'Todos os Status' : status === 'enabled' ? 'Ativos' : 'Desativados'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Text Models Section */}
            {(filterType === 'all' || filterType === 'text') && (
                <section>
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <div className="w-1 h-6 bg-blue-500 rounded-full" />
                        <h3 className="text-lg font-bold text-zinc-200">Modelos de Texto & Raciocínio</h3>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                            {getFilteredModels('text').length}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getFilteredModels('text').map(model => (
                            <ModelCard
                                key={model.id}
                                model={model}
                                isEnabled={enabledModels.includes(model.id)}
                                onToggle={toggleModel}
                                onEdit={() => handleEditClick(model)}
                                health={modelHealth.find(h => h.id === model.id)}
                                categories={modelCategories}
                                onCategoryToggle={toggleCategory}
                            />
                        ))}
                        {getFilteredModels('text').length === 0 && (
                            <div className="col-span-2 py-8 text-center text-zinc-500 text-sm bg-[#0a0a0a] rounded-2xl border border-white/5 border-dashed">
                                Nenhhum modelo de texto encontrado com os filtros atuais.
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Image Models Section */}
            {(filterType === 'all' || filterType === 'image') && (
                <section>
                    <div className={`flex items-center gap-2 mb-4 px-2 ${filterType === 'all' ? 'pt-8 border-t border-white/5' : ''}`}>
                        <div className="w-1 h-6 bg-purple-500 rounded-full" />
                        <h3 className="text-lg font-bold text-zinc-200">Modelos de Imagem</h3>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                            {getFilteredModels('image').length}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getFilteredModels('image').map(model => (
                            <ModelCard
                                key={model.id}
                                model={model}
                                isEnabled={enabledModels.includes(model.id)}
                                onToggle={toggleModel}
                                onEdit={() => handleEditClick(model)}
                                health={modelHealth.find(h => h.id === model.id)}
                                categories={modelCategories}
                                onCategoryToggle={toggleCategory}
                            />
                        ))}
                        {getFilteredModels('image').length === 0 && (
                            <div className="col-span-2 py-8 text-center text-zinc-500 text-sm bg-[#0a0a0a] rounded-2xl border border-white/5 border-dashed">
                                Nenhhum modelo de imagem encontrado com os filtros atuais.
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Edit Modal */}
            {editingModel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Editar Modelo</h3>
                            <button onClick={() => setEditingModel(null)} className="p-1 hovered:bg-white/10 rounded-lg transition">
                                <IconX className="w-5 h-5 text-zinc-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">ID (Fixo)</label>
                                <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-zinc-400 text-sm font-mono break-all">
                                    {editingModel.id}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Logo URL (Opcional)</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={editForm.logo}
                                        onChange={e => setEditForm(prev => ({ ...prev, logo: e.target.value }))}
                                        placeholder="https://exemplo.com/logo.png"
                                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                    />
                                    {editForm.logo && (
                                        <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                            <img src={editForm.logo} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1">Recomendado: Imagem quadrada (PNG/JPG), ~250x250px</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome (Editável)</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Categoria</label>
                                <select
                                    value={editForm.category}
                                    onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                >
                                    <option value="Elite 🏆">Elite 🏆</option>
                                    <option value="Raciocínio Clínico 🧠">Raciocínio Clínico 🧠</option>
                                    <option value="Ferramentas 🛠️">Ferramentas 🛠️</option>
                                    <option value="Velocidade ⚡">Velocidade ⚡</option>
                                    <option value="Open Source 🔓">Open Source 🔓</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Badge (Opcional)</label>
                                <input
                                    type="text"
                                    value={editForm.badge}
                                    onChange={e => setEditForm(prev => ({ ...prev, badge: e.target.value }))}
                                    placeholder="Ex: Recomendado, Novo, Beta..."
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 min-h-[100px] resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-[#0a0a0a]">
                            <button
                                onClick={() => setEditingModel(null)}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-6 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Extracted Model Card Component
function ModelCard({ model, isEnabled, onToggle, onEdit, health, categories, onCategoryToggle }: any) {
    const isOnline = health?.status === 'online';

    return (
        <div className={`p-6 rounded-2xl border transition-all ${isEnabled
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-[#0a0a0a] border-white/5 opacity-60'
            }`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{model.name}</h3>
                        <button onClick={onEdit} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors" title="Editar informações">
                            <IconEdit className="w-3.5 h-3.5" />
                        </button>
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
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{model.provider}</p>
                        {model.category && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-white/5">
                                {model.category}
                            </span>
                        )}
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isEnabled}
                        onChange={(e) => onToggle(model.id, e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
            </div>

            <p className="text-sm text-zinc-400 mb-4 min-h-[40px]">{model.description}</p>

            {/* Model Details (Pricing etc) */}
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
}

// Icon wrapper for search
function IconSearch(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
    )
}
