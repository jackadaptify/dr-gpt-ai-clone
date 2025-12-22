import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MessageItem from './components/MessageItem';
import { ChatSession, Message, Role, AVAILABLE_MODELS, Folder, Agent, Attachment, AIModel, AppMode } from './types';
import { streamChatResponse, saveMessage, loadChatHistory, createChat, updateChat, loadMessagesForChat, deleteChat } from './services/chatService';
import { fetchOpenRouterModels, OpenRouterModel } from './services/openRouterService';
import { agentService } from './services/agentService';
import { extractTextFromPdf } from './services/pdfService';
import { projectService } from './services/projectService'; // Implemented
import { adminService } from './services/adminService';
import { IconMenu, IconSend, IconAttachment, IconGlobe, IconImage, IconBrain, IconPlus, IconCreditCard, IconFile, IconCheck, IconAlertTriangle } from './components/Icons';
import { v4 as uuidv4 } from 'uuid';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
// import { chatStorage } from './services/chatStorage'; // Removed for Supabase
import AdminPage from './components/Admin/AdminPage';
import InviteSignupPage from './components/Auth/InviteSignupPage';
import { modelHealthService, ModelHealth } from './services/modelHealthService';
import { authService } from './services/authService';
import { supabase } from './lib/supabase';
import ModelSelector from './components/ModelSelector';
import AttachmentMenu from './components/AttachmentMenu';
import PromptsModal from './components/PromptsModal';
import AIScribeModal from './components/AIScribeModal';
import SettingsModal from './components/SettingsModal';
import { SettingsContent } from './components/SettingsContent';

import {
    Folder as FolderIcon,
    Settings,
    Shield,
    LogOut,
    Wrench,
    Menu,
    Mic,
    ChevronDown,
    Check,
    Video,
    Plus,
    Globe,
    Image,
    CreditCard,
    User,
    Palette,
    ChevronRight,
    X,
} from 'lucide-react';
import { settingsService, UserSettings } from './services/settingsService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import RailNav from './components/RailNav';
import ChatPage from './src/pages/ChatPage';
// ... imports
import ResearchPage from './src/pages/research/ResearchPage';

// ... inside renderContent
import ScribePage from './src/pages/ScribePage';
import { ChatProvider, useChat } from './src/contexts/ChatContext';
// import ScribeReview from './components/Scribe/ScribeReview';
// import { ResearchLayout } from './components/Research/ResearchLayout'; // Removed to unify UI

import { Toaster, toast } from 'react-hot-toast';

// POOL MESTRE DE SUGESTÕES




function AppContent(): React.ReactElement {
    const { session, user, loading } = useAuth();
    const {
        chats,
        currentChatId,
        activeChat,
        createNewChat,
        selectChat,
        deleteChatSession,
        updateChatTitle,
        input,
        setInput,
        isGenerating,
        pendingAttachments,
        setPendingAttachments
    } = useChat();

    // Local UI State
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeMode, setActiveMode] = useState<AppMode>('chat');
    const [scribeContent, setScribeContent] = useState('');
    const [folders, setFolders] = useState<Folder[]>([]);
    // State removed: chats, currentChatId, input, isGenerating

    // -- SETTINGS STATE --
    const [settingsState, setSettingsState] = useState<UserSettings>({
        custom_instructions: '',
        response_preferences: '',
        theme: 'dark',
        language: 'pt-BR'
    });

    const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Add modal state

    const [nickname, setNickname] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [otherSpecialty, setOtherSpecialty] = useState('');
    const [professionalFocus, setProfessionalFocus] = useState('');
    const [specificPreference, setSpecificPreference] = useState('');
    const [isSettingsLoading, setIsSettingsLoading] = useState(false);
    const [isSettingsSaving, setIsSettingsSaving] = useState(false);

    // Load Settings
    useEffect(() => {
        if (activeMode === 'settings' && user) {
            setIsSettingsLoading(true);
            settingsService.getUserSettings(user.id)
                .then(data => {
                    if (data) {
                        setSettingsState(data);

                        // Parse Custom Instructions
                        const instructions = data.custom_instructions || '';
                        const nameMatch = instructions.match(/Name: (.*?)(\n|$)/);
                        const specialtyMatch = instructions.match(/Specialty: (.*?)(\n|$)/);

                        if (nameMatch) setNickname(nameMatch[1]);
                        if (specialtyMatch) {
                            const spec = specialtyMatch[1];
                            const knownSpecialties = ['Cardiologia', 'Dermatologia', 'Clínica Geral', 'Pediatria', 'Ortopedia', 'Neurologia', 'Ginecologia', 'Psiquiatria'];
                            if (knownSpecialties.includes(spec)) {
                                setSpecialty(spec);
                            } else {
                                setSpecialty('Outra');
                                setOtherSpecialty(spec);
                            }
                        }

                        // Parse Preferences
                        const preferences = data.response_preferences || '';
                        const focusMatch = preferences.match(/Focus: (.*?)(\n|$)/);
                        const specificMatch = preferences.match(/Preferences: (.*?)(\n|$)/);

                        if (focusMatch) setProfessionalFocus(focusMatch[1]);
                        if (specificMatch) setSpecificPreference(specificMatch[1]);
                    }
                })
                .finally(() => setIsSettingsLoading(false));
        }
    }, [activeMode, user]);

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSettingsSaving(true);

        const finalSpecialty = specialty === 'Outra' ? otherSpecialty : specialty;
        const formattedInstructions = `Name: ${nickname}\nSpecialty: ${finalSpecialty}`;
        const formattedPreferences = `Focus: ${professionalFocus}\nPreferences: ${specificPreference}`;

        const newSettings = {
            ...settingsState,
            custom_instructions: formattedInstructions,
            response_preferences: formattedPreferences
        };

        try {
            console.log('Saving profile settings:', newSettings);
            await settingsService.updateUserSettings(user.id, newSettings);
            setSettingsState(newSettings);
            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            console.error('Error saving settings FULL:', error);
            console.error('Error message:', error.message);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
            toast.error('Erro ao salvar perfil: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setIsSettingsSaving(false);
        }
    };

    const [selectedModelId, setSelectedModelId] = useState<string>(AVAILABLE_MODELS[0].id);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);

    // Settings State
    const [settingsTab, setSettingsTab] = useState<'profile' | 'subscription' | 'appearance' | 'security'>('profile');

    // Rotating Suggestions Logic


    // Typewriter trigger for ScribeReview
    const [typewriterTrigger, setTypewriterTrigger] = useState<{ content: string; timestamp: number } | null>(null);
    const [reviewTitle, setReviewTitle] = useState('Revisão de Prontuário');

    // Update suggestions when pinned items change or on mount




    // Rotating Suggestions Logic remains...
    // Removed duplicate state logic.


    const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);
    const [isAIScribeModalOpen, setIsAIScribeModalOpen] = useState(false);
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false); // Can be local or context? App doesn't render menu directly anymore except maybe in Scribe? No, ScribePage handles it. ChatPage handles it. 
    // Keeping for safety if used elsewhere, but likely unused now.

    const [activeTools, setActiveTools] = useState({
        web: false,
        image: false,
        thinking: false
    });

    const [enabledModels, setEnabledModels] = useState<string[]>(AVAILABLE_MODELS.map(m => m.id));
    const [modelHealth, setModelHealth] = useState<ModelHealth[]>([]);
    const [dynamicModels, setDynamicModels] = useState<AIModel[]>([]);

    // Audio Recording Logic
    const { isListening, transcript, toggleListening, hasSupport: hasMicSupport } = useSpeechRecognition();
    const [textBeforeRecording, setTextBeforeRecording] = useState('');

    // Update input with transcript
    useEffect(() => {
        if (isListening) {
            setInput(textBeforeRecording + (textBeforeRecording && transcript ? ' ' : '') + transcript);
        }
    }, [transcript, isListening, textBeforeRecording]);

    const handleMicClick = () => {
        if (!isListening) {
            setTextBeforeRecording(input);
        }
        toggleListening();
    };

    // Utility to clean model names
    const cleanModelName = (name: string, id: string) => {
        // Remove provider prefixes
        let clean = name.replace(/^(google|openai|anthropic|deepseek|meta-llama|meta|baidu|nvidia|qwen|microsoft|perplexity|mistral)[:\/]\s*/i, '');

        // Remove specific suffixes or technical jargon if needed
        clean = clean.replace(/:free/i, '');
        clean = clean.replace(/:online/i, '');

        // Capitalize nicely if needed (OpenRouter names are usually okay, but sometimes lowercase)
        // But let's trust OpenRouter's name mostly, just stripping the prefix.

        // Special overrides for very popular models to look "Premium"
        if (id.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash';
        if (id.includes('gemini-pro-1.5')) return 'Gemini 1.5 Pro';
        if (id.includes('gpt-4o')) return 'GPT-4o';
        if (id.includes('claude-3.5-sonnet')) return 'Claude 3.5 Sonnet';

        return clean;
    };


    // handlePaste removed (moved to ChatPage)

    const toggleTool = (tool: 'web' | 'image' | 'thinking') => {
        setActiveTools(prev => ({ ...prev, [tool]: !prev[tool] }));
    };



    // Load Dynamic Models & Overrides
    const loadModelsAndOverrides = async () => {
        try {
            const fetched = await fetchOpenRouterModels();
            // Fetch overrides from admin settings
            const overrides = await adminService.getModelOverrides();

            // Merge with local definitions to get capabilities
            const mergedModels: AIModel[] = fetched.map(fm => {
                // Try to find a matching static definition
                const staticDef = AVAILABLE_MODELS.find(am => am.modelId === fm.id);
                const override = overrides[fm.id] || {};

                if (staticDef) {
                    return {
                        ...staticDef,
                        name: override.name || cleanModelName(fm.name, fm.id), // Use cleaned name or override
                        // Apply overrides if present
                        description: override.description || staticDef.description,
                        category: override.category || staticDef.category,
                        badge: override.badge !== undefined ? override.badge : staticDef.badge,
                        logo: override.logo // Propagate logo
                    };
                }

                // Infer capabilities for new models
                const isVision = fm.id.includes('vision') || fm.id.includes('gemini') || fm.id.includes('claude-3') || fm.id.includes('gpt-4o');
                const isReasoning = fm.id.includes('reasoning') || fm.id.includes('o1') || fm.id.includes('deepseek-r1');

                return {
                    id: fm.id, // Use OpenRouter ID as internal ID for dynamic ones
                    name: override.name || cleanModelName(fm.name, fm.id),
                    description: override.description || 'Modelo disponível via OpenRouter',
                    category: override.category || 'Novos 🆕',
                    badge: override.badge,
                    logo: override.logo,
                    provider: fm.id.split('/')[0] as any, // Rough inference
                    modelId: fm.id,
                    capabilities: {
                        vision: isVision,
                        imageGeneration: fm.id.includes('image') || fm.id.includes('flux'),
                        videoGeneration: fm.id.includes('video'),
                        audioGeneration: false,
                        webSearch: fm.id.includes('online'), // Some models have :online suffix
                        reasoning: isReasoning,
                        upload: isVision // Usually if vision, can upload
                    },
                    details: {
                        function: 'Dynamic Model',
                        inputTypes: ['Text'],
                        outputTypes: ['Text'],
                        features: [],
                        pricing: { input: '?', output: '?' }
                    }
                };
            });

            if (mergedModels.length > 0) {
                setDynamicModels(mergedModels);
            } else {
                // Apply overrides to static list if fetch fails or yields nothing
                const overriddenStatic = AVAILABLE_MODELS.map(m => {
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
                setDynamicModels(overriddenStatic);
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            // Fallback to static with local overrides?
            // For now just fail gracefully, keeping existing state or static default
        }
    };

    useEffect(() => {
        loadModelsAndOverrides();
    }, []);

    // Circuit Breaker: Filter out offline models
    // Use dynamicModels instead of AVAILABLE_MODELS
    const activeModelList = dynamicModels.length > 0 ? dynamicModels : AVAILABLE_MODELS;

    const availableAndHealthyModels = activeModelList.filter(m => {
        // 1. Check if model is enabled in Admin settings
        if (enabledModels.length > 0 && !enabledModels.includes(m.id)) {
            return false;
        }

        // 2. Optional: We could check health here, but we'll keep it permissive 
        // to avoid hiding models that might just be temporarily slow.
        // const health = modelHealthService.find(h => h.id === m.id || h.id === m.modelId);
        // const isHealthy = health ? health.status !== 'offline' : true;

        return true;

        /* 
        const isEnabled = enabledModels.includes(m.id);
        if (!isEnabled) return false;

        const health = modelHealthService.find(h => h.id === m.id || h.id === m.modelId);
        const isHealthy = health ? health.status !== 'offline' : true;
        return isHealthy;
        */
    });

    // Load enabled models
    const loadEnabledModels = async () => {
        try {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'enabled_models').maybeSingle();
            if (data?.value) {
                console.log('🔄 Reloading enabled models:', data.value);
                setEnabledModels(data.value);
                // If currently selected model is now disabled, switch to first available that is enabled (and healthy if possible)
                // We do this check in the effect below usually, but good to be aware.
            }
        } catch (error) {
            console.error('Failed to load enabled models:', error);
        }
    };

    useEffect(() => {
        loadEnabledModels();

        let cancelled = false;
        let inFlight = false;
        let consecutiveFailures = 0;

        const COOLDOWN_MS = 60_000;     // 1 min mínimo entre checks (mesmo que alguém chame manual)
        const INTERVAL_MS = 5 * 60_000; // 5 min
        let lastRun = 0;

        const run = async () => {
            const now = Date.now();
            if (cancelled) return;
            if (inFlight) return;
            if (now - lastRun < COOLDOWN_MS) return;

            inFlight = true;
            lastRun = now;

            try {
                // ✅ Seu fluxo normal (não-relacionado a health)
                await loadEnabledModels?.();

                // ✅ Health: agora vai vir de cache (ver parte 2)
                const health = await modelHealthService.getCachedHealth();
                if (!cancelled) setModelHealth(health);

                consecutiveFailures = 0;
            } catch (err) {
                consecutiveFailures += 1;

                // Circuit breaker: se falhar várias vezes, reduz frequência (evita loop caro em cenário de falha)
                if (consecutiveFailures >= 3) {
                    // opcional: setModelHealth([]) ou mostrar "degraded"
                    // e.g. if (!cancelled) setModelHealth([]);
                }
            } finally {
                inFlight = false;
            }
        };

        // Run once
        run();

        // Periodic
        const interval = setInterval(run, INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    // Auto-Failover: If selected model becomes unhealthy, switch to first available
    useEffect(() => {
        if (availableAndHealthyModels.length > 0 && !availableAndHealthyModels.find(m => m.id === selectedModelId)) {
            console.warn(`Model ${selectedModelId} is unavailable. Switching to ${availableAndHealthyModels[0].id}`);
            setSelectedModelId(availableAndHealthyModels[0].id);
        }
    }, [availableAndHealthyModels, selectedModelId]);

    // Load chats from Supabase
    // Load chats is now handled by ChatProvider



    // 🚀 Optimized: Lazy Load Messages
    // Lazy loading moved to ChatContext



    // Auto-resize textarea
    // Scroll and resize logic moved to ChatPage or ChatContext


    // Load Projects
    useEffect(() => {
        if (session?.user?.id) {
            projectService.getProjects().then(setFolders);
        }
    }, [session?.user?.id]);

    const handleCreateProject = async (name: string) => {
        const { project, error } = await projectService.createProject(name);
        if (project) {
            setFolders(prev => [...prev, project]);
        } else if (error) {
            console.error('Project creation failed:', error);
            alert(`Falha ao criar projeto: ${error.message || JSON.stringify(error)}. \n\nVerifique se você rodou o script SQL no Supabase.`);
        }
    };

    const handleRenameChat = async (chatId: string, newTitle: string) => {
        updateChatTitle(chatId, newTitle);
    };

    const handleDeleteChat = async (chatId: string) => {
        await deleteChatSession(chatId);
    };

    const handleAssignChatToProject = async (chatId: string, projectId: string | null) => {
        // Logic to assign chat
        // Context doesn't have assignChat yet, but strict refactor implies we should update local state via context-like pattern 
        // OR just rely on re-fetch.
        // For now, assume context updates 'chats' if we refresh, or we just call service.
        await projectService.assignChatToProject(chatId, projectId);
        // We can't update 'chats' state directly as it's active in Context.
        //Ideally context exposes `updateChat` or reload.
    };

    const handleDeleteProject = async (projectId: string) => {
        const success = await projectService.deleteProject(projectId);
        if (success) {
            setFolders(prev => prev.filter(f => f.id !== projectId));
            // Update local state to reflect that chats are now unassigned (assuming backend handles this logic or we just rely on reload, but better to update optimistic UI)
            // Start loading chats again? or let context handle it.
            // setChats(prev => prev.map(c => c.folderId === projectId ? { ...c, folderId: undefined } : c));

            toast.success('Projeto excluído com sucesso');
        } else {
            toast.error('Erro ao excluir projeto');
        }
    };



    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const handleNewChat = () => {
        createNewChat(undefined, selectedModelId);
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    // Sync selected model when switching chats
    useEffect(() => {
        const currentChat = chats.find(c => c.id === currentChatId);
        // Only switch if the chat has a specific model assigned AND it's different
        if (currentChat && currentChat.modelId && currentChat.modelId !== selectedModelId) {
            // Verify if model exists/is healthy before hard switching if we want to be safe,
            // but for persistence we should respect the chat's setting.
            setSelectedModelId(currentChat.modelId);
        }
    }, [currentChatId, chats, selectedModelId]);

    // Agent Handlers
    const updateUser = async (updates: any) => {
        if (!user) return;
        try {
            await settingsService.updateUserSettings(user.id, updates);
            toast.success('Perfil atualizado!');
            setSettingsState(prev => ({ ...prev, ...updates }));
        } catch (e) {
            console.error(e);
            toast.error('Erro ao atualizar perfil.');
        }
    };

    const signOut = async () => {
        await authService.signOut();
        window.location.reload();
    };

    // Agent handlers removed (unused in this view)


    const handleModelSelect = (newModelId: string) => {
        setSelectedModelId(newModelId);
        setSelectedAgentId(null);
        if (currentChatId) {
            updateChat(currentChatId, { modelId: newModelId });
        }
    };

    // Agent CRUD removed

    // 🔧 FIX: Handle Mode Change with Cleanup
    const handleModeChange = (newMode: AppMode) => {
        setActiveMode(newMode);

        // If switching to a dashboard mode (Scribe, Anti-Glosa, Justificativa),
        // we MUST clear the current chat so the dashboard view renders instead of the chat view.
        // Also clear when entering 'chat' to avoid showing history from other modes (like Research)
        if (newMode === 'scribe' || newMode === 'antiglosa' || newMode === 'justificativa' || newMode === 'chat') {
            selectChat(''); // Clear selection
            setSelectedAgentId(null); // Optional: also clear agent context
        }
    };

    return (
        <div className="flex h-[100dvh] bg-background text-textMain font-sans overflow-hidden selection:bg-emerald-500/30">

            {/* Rail Navigation (Desktop Only) */}
            <div className="hidden md:block h-full z-50">
                <RailNav
                    activeMode={activeMode}
                    onModeChange={handleModeChange}
                    isDarkMode={isDarkMode}
                />
            </div>

            {/* Sidebar */}
            {activeMode !== 'scribe-review' && activeMode !== 'admin' && (
                <Sidebar
                    chats={chats.filter(c => {
                        // 🔍 Research Mode Filtering

                        // 💬 Standard Chat Mode Filtering
                        // Exclude dashboard-specific chats (scribe-mode, antiglosa-mode, etc) AND research-mode
                        if (activeMode === 'chat') {
                            return c.agentId !== 'scribe-mode' &&
                                c.agentId !== 'antiglosa-mode' &&
                                c.agentId !== 'justificativa-mode';
                        }
                        // For other dashboard modes (scribe, antiglosa), the sidebar might not be visible 
                        // or we might want specific history.
                        // Currently, Scribe/Antiglosa view handles history internally or doesn't show sidebar 
                        // (based on user flow), but 'scribe' mode renders sidebar.

                        // Default fallback (e.g. Scribe Mode showing history?)
                        // If we are in 'scribe', maybe we show 'scribe-mode' chats?
                        if (activeMode === 'scribe') return c.agentId === 'scribe-mode';
                        if (activeMode === 'antiglosa') return c.agentId === 'antiglosa-mode';
                        if (activeMode === 'justificativa') return c.agentId === 'justificativa-mode';

                        return true;
                    })}
                    folders={folders}
                    currentChatId={currentChatId}
                    onSelectChat={(chatId) => {
                        const chat = chats.find(c => c.id === chatId);
                        selectChat(chatId);

                        if (chat?.agentId === 'scribe-mode') {
                            console.log('📂 Opening Scribe Chat under Review Mode');
                            setActiveMode('scribe-review');

                            // Restore Content: Find the latest message that looks like a SOAP document
                            // robustly by checking for length and role
                            const lastDocMessage = [...chat.messages]
                                .reverse()
                                .find(m => m.role === Role.MODEL && m.content.length > 50 && !m.content.includes("Precisa de algum ajuste"));

                            if (lastDocMessage) {
                                // Remove any internal tags if present in the raw content before setting state
                                const cleanContent = lastDocMessage.content.replace(/<UPDATE_ACTION>[\s\S]*?<\/UPDATE_ACTION>/g, '').trim();

                                const updateMatch = lastDocMessage.content.match(/<UPDATE_ACTION>\s*(\{[\s\S]*?\})\s*<\/UPDATE_ACTION>/);
                                if (updateMatch && updateMatch[1]) {
                                    try {
                                        const json = JSON.parse(updateMatch[1]);
                                        setScribeContent(json.new_content);
                                    } catch (e) {
                                        setScribeContent(lastDocMessage.content);
                                    }
                                } else {
                                    setScribeContent(cleanContent);
                                }
                            } else {
                                setScribeContent('Carregando prontuário...'); // Should lazy load eventually
                            }
                        } else if (chat?.agentId === 'antiglosa-mode') {
                            setActiveMode('scribe-review');
                            setReviewTitle('Defesa Anti-Glosa');

                            // Robust restoration logic
                            const lastDocMessage = [...chat.messages]
                                .reverse()
                                .find(m => m.role === Role.MODEL && m.content.length > 50 && !m.content.includes("Precisa de algum ajuste"));

                            if (lastDocMessage) {
                                const updateMatch = lastDocMessage.content.match(/<UPDATE_ACTION>\s*(\{[\s\S]*?\})\s*<\/UPDATE_ACTION>/);
                                if (updateMatch && updateMatch[1]) {
                                    try {
                                        const json = JSON.parse(updateMatch[1]);
                                        setScribeContent(json.new_content);
                                    } catch (e) {
                                        setScribeContent(lastDocMessage.content);
                                    }
                                } else {
                                    setScribeContent(lastDocMessage.content);
                                }
                            } else {
                                setScribeContent('Carregando defesa...');
                            }

                        } else if (chat?.agentId === 'justificativa-mode') {
                            setActiveMode('scribe-review');
                            setReviewTitle('Justificativa Prévia');

                            // Robust restoration logic
                            const lastDocMessage = [...chat.messages]
                                .reverse()
                                .find(m => m.role === Role.MODEL && m.content.length > 50 && !m.content.includes("Precisa de algum ajuste"));

                            if (lastDocMessage) {
                                const updateMatch = lastDocMessage.content.match(/<UPDATE_ACTION>\s*(\{[\s\S]*?\})\s*<\/UPDATE_ACTION>/);
                                if (updateMatch && updateMatch[1]) {
                                    try {
                                        const json = JSON.parse(updateMatch[1]);
                                        setScribeContent(json.new_content);
                                    } catch (e) {
                                        setScribeContent(lastDocMessage.content);
                                    }
                                } else {
                                    setScribeContent(lastDocMessage.content);
                                }
                            } else {
                                setScribeContent('Carregando justificativa...');
                            }

                        } else {
                            if ((activeMode as string) === 'scribe-review' || activeMode === 'scribe' || activeMode === 'antiglosa' || activeMode === 'justificativa') {
                                setActiveMode('chat');
                            }
                        }
                    }}
                    onNewChat={handleNewChat}
                    isOpen={sidebarOpen}
                    setIsOpen={setSidebarOpen}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}

                    activeMode={activeMode}
                    onCreateProject={handleCreateProject}
                    onAssignChatToProject={handleAssignChatToProject}
                    onRenameChat={handleRenameChat}
                    onDeleteChat={handleDeleteChat}
                    onModeChange={setActiveMode}
                    settingsTab={settingsTab}
                    onSettingsTabChange={setSettingsTab}
                    onDeleteProject={handleDeleteProject}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative h-full w-full">
                {activeMode === 'settings' ? (
                    <SettingsContent
                        isDarkMode={isDarkMode}
                        activeTab={
                            settingsTab === 'profile' ? 'personalization' :
                                settingsTab === 'subscription' ? 'subscription' :
                                    settingsTab === 'appearance' ? 'general' :
                                        settingsTab === 'security' ? 'data' : 'personalization'
                        }
                        toggleTheme={toggleTheme}
                    />
                ) : activeMode === 'research' ? (
                    <ResearchPage
                        isDarkMode={isDarkMode}
                        user={user}
                    />
                ) : (activeMode.startsWith('scribe') && (!currentChatId || activeMode === 'scribe-review')) ? (
                    <ScribePage
                        isDarkMode={isDarkMode}
                        activeMode={activeMode}
                        onGenerate={async (consultation, thoughts, patientName, patientGender, audioBlob, scenario = 'evolution') => {
                            const newChatId = uuidv4();
                            const scribeModelId = 'openai/gpt-4o-mini';

                            const newChat: ChatSession = {
                                id: newChatId,
                                title: patientName || 'Nova Consulta',
                                modelId: scribeModelId,
                                messages: [],
                                updatedAt: Date.now(),
                                agentId: 'scribe-mode',
                                folderId: undefined,
                                metadata: {
                                    patient_name: patientName,
                                    patient_gender: patientGender
                                }
                            };

                            // Create logic
                            await createChat(newChat);
                            selectChat(newChatId); // Use context method
                            setSelectedModelId(scribeModelId);

                            const welcomeMsg: Message = {
                                id: uuidv4(),
                                role: Role.MODEL,
                                content: "Consulta processada. Precisa de algum ajuste ou documento extra (atestado/encaminhamento)?",
                                timestamp: Date.now(),
                                modelId: scribeModelId
                            };
                            await saveMessage(newChatId, welcomeMsg);

                            setActiveMode('scribe-review');
                            setReviewTitle(scenario === 'anamnesis' ? 'Anamnese Completa' : scenario === 'bedside' ? 'Evolução Beira-Leito' : 'Evolução Clínica');
                            setScribeContent('Processando dados da consulta...\n\nGerando Documentação...');

                            let audioUrl = "";
                            if (audioBlob) {
                                try {
                                    const fileName = `telemed_${new Date().toISOString()}.webm`;
                                    const { data, error } = await supabase.storage
                                        .from('chat-attachments')
                                        .upload(fileName, audioBlob, { contentType: 'audio/webm' });
                                    if (error) throw error;
                                    const { data: { publicUrl } } = supabase.storage
                                        .from('chat-attachments')
                                        .getPublicUrl(fileName);
                                    audioUrl = publicUrl;
                                } catch (error) {
                                    console.error("Upload failed", error);
                                    alert("Falha ao enviar áudio da consulta.");
                                    return;
                                }
                            }

                            const patientContext = patientName
                                ? `PACIENTE: ${patientName} (Sexo: ${patientGender})`
                                : `PACIENTE: Não Identificado`;

                            let scenarioInstruction = "";
                            switch (scenario) {
                                case 'anamnesis':
                                    scenarioInstruction = "Gere uma Anamnese Completa estruturada baseada na transcrição.";
                                    break;
                                case 'bedside':
                                    scenarioInstruction = "Gere uma Evolução de Visita à Beira do Leito estruturada.";
                                    break;
                                case 'clinical_meeting':
                                    scenarioInstruction = "Gere uma Ata de Reunião Clínica estruturada.";
                                    break;
                                case 'evolution':
                                default:
                                    scenarioInstruction = "Gere uma Evolução Médica Diária (SOAP) estruturada.";
                                    break;
                            }

                            // Simplified Prompt Construction for stability
                            const commonInstructions = `TASK: Gere o documento médico baseado no áudio/texto e na NOTA TÉCNICA.\n\n${scenarioInstruction}\n\nREGRA: Gere SEMPRE o documento completo. Receita/Atestado apenas se solicitado no texto. FORMATO: Texto pronto para copiar.`;
                            const finalPrompt = audioUrl
                                ? `[AUDIO MODE] URL: ${audioUrl}\nNOTA: "${thoughts}"\nCONTEXTO: ${patientContext}\n${commonInstructions}`
                                : `[TEXT MODE] TRANSCRIPT: "${consultation}"\nNOTA: "${thoughts}"\nCONTEXTO: ${patientContext}\n${commonInstructions}`;

                            try {
                                const response = await streamChatResponse(
                                    scribeModelId,
                                    [{ role: Role.USER, content: finalPrompt, id: 'prompt', timestamp: Date.now() }],
                                    finalPrompt,
                                    (chunk) => {
                                        setScribeContent(prev => {
                                            if (prev.startsWith('Processando')) return chunk;
                                            return prev + chunk;
                                        });
                                    },
                                    undefined,
                                    { webSearch: false, imageGeneration: false },
                                    newChatId,
                                    undefined
                                );
                                setScribeContent(response);

                                const docMessage: Message = {
                                    id: uuidv4(),
                                    role: Role.MODEL,
                                    content: response,
                                    displayContent: '📄 Prontuário Gerado',
                                    timestamp: Date.now(),
                                    modelId: scribeModelId
                                };
                                await saveMessage(newChatId, docMessage);

                                // Refresh context if possible, or wait for auto-refresh
                                // selectChat(newChatId) was called earlier

                            } catch (e) {
                                setScribeContent('Erro ao gerar prontuário.');
                                console.error(e);
                            }
                        }}
                        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        onOpenSettings={() => {
                            setIsSettingsOpen(true);
                            setSidebarOpen(false);
                        }}
                        scribeContent={scribeContent}
                        setScribeContent={setScribeContent}
                        typewriterTrigger={typewriterTrigger}
                        reviewTitle={reviewTitle}
                        onSave={async () => {
                            if (!currentChatId) return;
                            const saveMessageObj: Message = {
                                id: uuidv4(),
                                role: Role.MODEL,
                                content: scribeContent,
                                displayContent: '💾 Prontuário Salvo',
                                timestamp: Date.now(),
                                modelId: selectedModelId
                            };
                            await saveMessage(currentChatId, saveMessageObj);
                            updateChat(currentChatId, { updatedAt: Date.now() });
                            toast.success('Prontuário salvo no histórico!', {
                                style: {
                                    background: isDarkMode ? '#18181b' : '#fff',
                                    color: isDarkMode ? '#10b981' : '#059669',
                                    border: '1px solid ' + (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.2)')
                                }
                            });
                        }}
                        onClose={() => {
                            setActiveMode('chat');
                            createNewChat();
                        }}
                    >
                        {activeMode === 'scribe-review' && (
                            <ChatPage
                                isDarkMode={isDarkMode}
                                sidebarOpen={sidebarOpen}
                                setSidebarOpen={setSidebarOpen}
                                activeMode={activeMode}
                                availableAndHealthyModels={availableAndHealthyModels}
                                selectedModelId={selectedModelId}
                                handleModelSelect={handleModelSelect}
                                agents={agents}
                                handleSelectAgent={(agentId) => {
                                    const agent = agents.find(a => a.id === agentId);
                                    if (agent) {
                                        setSelectedAgentId(agent.id);
                                        createNewChat(agent.id, agent.modelId || selectedModelId);
                                    }
                                }}
                                selectedAgentId={selectedAgentId}
                                user={user}
                                handleMicClick={handleMicClick}
                                isListening={isListening}
                                hasMicSupport={hasMicSupport}

                            />
                        )}
                    </ScribePage>
                ) : activeMode === 'admin' ? (
                    <AdminPage />
                ) : (activeMode === 'chat' || (currentChatId && activeMode === 'scribe')) ? (
                    <ChatPage
                        isDarkMode={isDarkMode}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        activeMode={activeMode}
                        availableAndHealthyModels={availableAndHealthyModels}
                        selectedModelId={selectedModelId}
                        handleModelSelect={handleModelSelect}
                        agents={agents}
                        handleSelectAgent={(agentId) => {
                            const agent = agents.find(a => a.id === agentId);
                            if (agent) {
                                setSelectedAgentId(agent.id);
                                createNewChat(agent.id, agent.modelId || selectedModelId);
                            }
                        }}
                        selectedAgentId={selectedAgentId}
                        user={user}
                        // inputs and messages handled by context
                        handleMicClick={handleMicClick}
                        isListening={isListening}
                        hasMicSupport={hasMicSupport}

                    />
                ) : null}



                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    isDarkMode={isDarkMode}
                    toggleTheme={() => setIsDarkMode(!isDarkMode)}
                />





            </div>
        </div >
    );
}

export default function App() {
    return (
        <AuthProvider>
            <ChatProvider>
                <Toaster />
                <AppContent />
            </ChatProvider>
        </AuthProvider>
    );
}