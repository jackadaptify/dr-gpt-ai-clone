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
import { IconMenu, IconSend, IconAttachment, IconGlobe, IconImage, IconBrain, IconPlus, IconCreditCard, IconFile } from './components/Icons';
import { v4 as uuidv4 } from 'uuid';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
// import { chatStorage } from './services/chatStorage'; // Removed for Supabase
import AdminPage from './components/Admin/AdminPage';
import { modelHealthService, ModelHealth } from './services/modelHealthService';
import { authService } from './services/authService';
import { supabase } from './lib/supabase';
import ModelSelector from './components/ModelSelector';
import AttachmentMenu from './components/AttachmentMenu';
import PromptsModal from './components/PromptsModal';
import AIScribeModal from './components/AIScribeModal';
import AntiGlosaModal from './components/AntiGlosaModal';
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
    Activity,
    ShieldAlert,
    FileText,
    Siren,
    ClipboardList,
    Instagram,
    MessageCircle,
    Star,
    Brain,
    Mail,
    Pin,
    CreditCard,
    User,
    Palette,
    ChevronRight,
    X,
} from 'lucide-react';
import { settingsService, UserSettings } from './services/settingsService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import RailNav from './components/RailNav';
import ScribeView from './components/ScribeView';
import AntiGlosaView from './components/AntiGlosaView';
import JustificativaView from './components/JustificativaView';
import ScribeReview from './components/Scribe/ScribeReview';
import { Toaster, toast } from 'react-hot-toast';

// POOL MESTRE DE SUGESTÕES
const ALL_SUGGESTIONS = [
    // CLÍNICO (A dor da incerteza e tempo)
    {
        title: "Hipóteses Diagnósticas",
        text: "Atue como médico sênior. Baseado nos sintomas e histórico que vou colar, liste diagnósticos diferenciais ordenados por probabilidade e exames confirmatórios.",
        icon: "Activity"
    },
    {
        title: "Interação Medicamentosa",
        text: "Vou listar os medicamentos do paciente. Verifique interações graves, contraindicações e ajustes de dose necessários baseados nas bulas recentes.",
        icon: "ShieldAlert"
    },
    {
        title: "Resumir Artigo/PDF",
        text: "Vou colar um texto técnico. Resuma: Metodologia, Resultados principais (NNT/NNH) e aplicabilidade prática para o consultório.",
        icon: "FileText"
    },
    {
        title: "Protocolo de Emergência",
        text: "Cite o passo a passo do protocolo mais atual (ACLS/ATLS/PALS) para a condição clínica que vou descrever.",
        icon: "Siren"
    },
    {
        title: "Evolução SOAP",
        text: "Transforme minhas anotações soltas em uma Evolução Clínica formal no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano).",
        icon: "ClipboardList"
    },

    // MARKETING & GESTÃO (A dor de atrair pacientes e burocracia)
    {
        title: "Post para Instagram",
        text: "Crie uma legenda educativa para Instagram sobre a doença que vou citar, com tom empático e focado em atrair pacientes particulares.",
        icon: "Instagram"
    },
    {
        title: "Responder Paciente (WhatsApp)",
        text: "Escreva uma mensagem de pós-consulta elegante para perguntar a evolução do paciente e fidelizar, sem parecer invasivo.",
        icon: "MessageCircle"
    },
    {
        title: "Responder Avaliação Google",
        text: "Escreva uma resposta profissional e grata para uma avaliação 5 estrelas que recebi no Google My Business.",
        icon: "Star"
    },
    {
        title: "Simplificar Laudo",
        text: "Reescreva este laudo técnico em linguagem simples e analógica para que um paciente leigo possa entender a gravidade.",
        icon: "Brain"
    },
    {
        title: "Email para Convênio",
        text: "Escreva uma carta de justificativa técnica para convênio médico autorizar o procedimento X para o paciente Y.",
        icon: "Mail"
    }
];

const ICON_MAP: Record<string, any> = {
    Activity, ShieldAlert, FileText, Siren, ClipboardList, Instagram, MessageCircle, Star, Brain, Mail
};

function AppContent() {
    const { session, user, loading } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeMode, setActiveMode] = useState<AppMode>('chat');
    const [scribeContent, setScribeContent] = useState('');
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]); // Real folders state
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // -- SETTINGS STATE --
    const [settingsState, setSettingsState] = useState<UserSettings>({
        custom_instructions: '',
        response_preferences: '',
        theme: 'dark',
        language: 'pt-BR'
    });
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
    // Load pinned suggestions from localStorage
    const [pinnedSuggestions, setPinnedSuggestions] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('drgpt_pinned_suggestions');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading pinned suggestions:', e);
            return [];
        }
    });

    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Typewriter trigger for ScribeReview
    const [typewriterTrigger, setTypewriterTrigger] = useState<{ content: string; timestamp: number } | null>(null);
    const [reviewTitle, setReviewTitle] = useState('Revisão de Prontuário');

    // Update suggestions when pinned items change or on mount
    useEffect(() => {
        const pinnedItems = ALL_SUGGESTIONS.filter(s => pinnedSuggestions.includes(s.title));
        const unpinnedItems = ALL_SUGGESTIONS.filter(s => !pinnedSuggestions.includes(s.title));

        // Shuffle unpinned items
        const shuffledUnpinned = [...unpinnedItems].sort(() => 0.5 - Math.random());

        // Combine: Pinned first, then fill remaining slots up to 4
        const newSuggestions = [...pinnedItems, ...shuffledUnpinned].slice(0, 4);
        setSuggestions(newSuggestions);
    }, [pinnedSuggestions]);

    const togglePin = (e: React.MouseEvent, title: string) => {
        e.stopPropagation(); // Prevent triggering the suggestion
        setPinnedSuggestions(prev => {
            const newPinned = prev.includes(title)
                ? prev.filter(t => t !== title)
                : [...prev, title]; // No limit on pins, but UI shows max 4 anyway

            localStorage.setItem('drgpt_pinned_suggestions', JSON.stringify(newPinned));
            return newPinned;
        });
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentButtonRef = useRef<HTMLButtonElement>(null);
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
    const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);
    const [isAIScribeModalOpen, setIsAIScribeModalOpen] = useState(false);
    const [isAntiGlosaModalOpen, setIsAntiGlosaModalOpen] = useState(false);
    const scrollThrottleRef = useRef<number | null>(null); // 🔧 FIX: Throttle scroll updates

    const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
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

    // Load Dynamic Models
    useEffect(() => {
        const loadModels = async () => {
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
                        name: cleanModelName(fm.name, fm.id), // Use cleaned name
                        // Apply overrides if present
                        description: override.description || staticDef.description,
                        category: override.category || staticDef.category,
                        badge: override.badge !== undefined ? override.badge : staticDef.badge
                    };
                }

                // Infer capabilities for new models
                const isVision = fm.id.includes('vision') || fm.id.includes('gemini') || fm.id.includes('claude-3') || fm.id.includes('gpt-4o');
                const isReasoning = fm.id.includes('reasoning') || fm.id.includes('o1') || fm.id.includes('deepseek-r1');

                return {
                    id: fm.id, // Use OpenRouter ID as internal ID for dynamic ones
                    name: cleanModelName(fm.name, fm.id),
                    description: override.description || 'Modelo disponível via OpenRouter',
                    category: override.category || 'Novos 🆕',
                    badge: override.badge,
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

            // Also check if any purely static models (AVAILABLE_MODELS that aren't in OpenRouter yet or are custom) need overriding
            // and aren't covered by the merged list if the fetched list is missing them.
            // Actually, we generally construct the list heavily based on AVAILABLE_MODELS if fetch fails or is partial.
            // But let's assume mergedModels handles the bulk. 

            // However, we must ensure that ALL AVAILABLE_MODELS are present even if not in fetched, 
            // incase OpenRouter list is partial.
            // Ideally we iterate over a superset of IDs.
            // For now, let's just stick to the existing logic which prefers mergedModels but falls back if empty.
            // Better logic: Map over AVAILABLE_MODELS too to apply overrides if they are NOT in fetched?
            // The current logic only overrides things founded in `fetched`. 
            // If `fetched` is empty, we setDynamicModels(AVAILABLE_MODELS). We need to override that too.

            if (mergedModels.length > 0) {
                setDynamicModels(mergedModels);
            } else {
                // Apply overrides to static list
                const overriddenStatic = AVAILABLE_MODELS.map(m => {
                    const override = overrides[m.id] || {};
                    return {
                        ...m,
                        description: override.description || m.description,
                        category: override.category || m.category,
                        badge: override.badge !== undefined ? override.badge : m.badge
                    };
                });
                setDynamicModels(overriddenStatic);
            }
        };

        loadModels();
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
    useEffect(() => {
        // Load settings
        import('./lib/supabase').then(({ supabase }) => {
            supabase.from('app_settings').select('value').eq('key', 'enabled_models').single()
                .then(({ data }) => {
                    if (data?.value) {
                        setEnabledModels(data.value);
                        // If current selected model is disabled, switch to first available
                        if (!data.value.includes(selectedModelId)) {
                            setSelectedModelId(data.value[0] || AVAILABLE_MODELS[0].id);
                        }
                    }
                });
        });

        // Load Health Status (Circuit Breaker)
        const checkHealth = async () => {
            const health = await modelHealthService.checkAllModels();
            setModelHealth(health);
        };
        checkHealth();
        // Periodic check every 5 minutes
        const interval = setInterval(checkHealth, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Auto-Failover: If selected model becomes unhealthy, switch to first available
    useEffect(() => {
        if (availableAndHealthyModels.length > 0 && !availableAndHealthyModels.find(m => m.id === selectedModelId)) {
            console.warn(`Model ${selectedModelId} is unavailable. Switching to ${availableAndHealthyModels[0].id}`);
            setSelectedModelId(availableAndHealthyModels[0].id);
        }
    }, [availableAndHealthyModels, selectedModelId]);

    // Load chats from Supabase
    // Load chats from Supabase
    useEffect(() => {
        if (session?.user?.id) {
            console.log('🔄 Effect triggered: Loading chats for user', session.user.id);
            loadChatHistory(session.user.id).then(loadedChats => {
                setChats(loadedChats);
            });

            // Load active agents initially
            agentService.getActiveAgents().then(setAgents).catch(console.error);

            // Reload agents when tab becomes visible (e.g. returning from Admin)
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    console.log('👀 Tab visible: Reloading agents...');
                    agentService.getActiveAgents().then(setAgents).catch(console.error);
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        }
    }, [session?.user?.id]); // 🔧 FIX: Only reload if User ID changes

    // 🚀 Lazy Load Messages
    useEffect(() => {
        if (currentChatId) {
            const chat = chats.find(c => c.id === currentChatId);
            if (chat && chat.messages.length === 0) {
                console.log('📥 Lazy loading messages for chat:', currentChatId);
                loadMessagesForChat(currentChatId).then(messages => {
                    if (messages.length > 0) {
                        setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages } : c));
                    }
                });
            }
        }
    }, [currentChatId, chats]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

    // Auto-focus textarea after generation completes
    useEffect(() => {
        if (!isGenerating && textareaRef.current) {
            // Small delay to ensure DOM updates are complete
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }, [isGenerating]);

    // Scroll to bottom (instant during generation to prevent UI freeze)
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({
            behavior: isGenerating ? 'auto' : 'smooth' // 🔧 FIX: Instant scroll during generation
        });
    };

    // 🔧 FIX: Throttle scroll to prevent UI freeze during streaming
    useEffect(() => {
        // Cancel previous throttle
        if (scrollThrottleRef.current) {
            cancelAnimationFrame(scrollThrottleRef.current);
        }

        // Throttle scroll to once per animation frame
        scrollThrottleRef.current = requestAnimationFrame(() => {
            scrollToBottom();
            scrollThrottleRef.current = null;
        });

        // Cleanup
        return () => {
            if (scrollThrottleRef.current) {
                cancelAnimationFrame(scrollThrottleRef.current);
            }
        };
    }, [chats, currentChatId, isGenerating]);

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
        await updateChat(chatId, { title: newTitle });
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));
    };

    const handleDeleteChat = async (chatId: string) => {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) setCurrentChatId(null);
        await deleteChat(chatId);
    };

    const handleAssignChatToProject = async (chatId: string, projectId: string | null) => {
        const success = await projectService.assignChatToProject(chatId, projectId);
        if (success) {
            setChats(prev => prev.map(c => c.id === chatId ? { ...c, folderId: projectId || undefined } : c));
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

    const getCurrentChat = () => chats.find(c => c.id === currentChatId);

    const handleNewChat = () => {
        const newChat: ChatSession = {
            id: uuidv4(),
            title: 'Novo Chat',
            modelId: selectedModelId,
            messages: [],
            updatedAt: Date.now()
        };
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        createChat(newChat); // Persist to Supabase
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    // Sync selected model when switching chats
    useEffect(() => {
        const currentChat = chats.find(c => c.id === currentChatId);
        if (currentChat) {
            setSelectedModelId(currentChat.modelId);
        }
    }, [currentChatId, chats]);

    const handleSelectAgent = (agent: Agent) => {
        // Use agent's model if available AND healthy, otherwise fallback
        const targetModelId = agent.modelId && availableAndHealthyModels.some(m => m.id === agent.modelId)
            ? agent.modelId
            : (availableAndHealthyModels.find(m => m.id === selectedModelId) ? selectedModelId : availableAndHealthyModels[0]?.id || AVAILABLE_MODELS[0].id);

        // DO NOT create a welcome message automatically. Let the user use Ice Breakers.
        const newChat: ChatSession = {
            id: uuidv4(),
            title: agent.name,
            modelId: targetModelId,
            agentId: agent.id,
            messages: [], // Start empty to show Welcome Screen with Ice Breakers
            updatedAt: Date.now()
        };

        setSelectedModelId(targetModelId);
        setSelectedAgentId(agent.id); // Track selected agent
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        createChat(newChat); // Persist to Supabase
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = `${fileName}`;

            try {
                // Extract text if PDF (Client-side)
                let extractedText = '';
                if (file.type === 'application/pdf') {
                    try {
                        extractedText = await extractTextFromPdf(file);
                        console.log('📄 PDF Extracted:', extractedText.length, 'chars');
                    } catch (e) {
                        console.error('Failed to extract PDF text:', e);
                        toast.error('Erro ao ler texto do PDF. O arquivo será enviado apenas como anexo.');
                    }
                }

                // Upload to Supabase
                const { error: uploadError } = await supabase.storage
                    .from('chat-attachments')
                    .upload(filePath, file);

                if (uploadError) {
                    throw uploadError;
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('chat-attachments')
                    .getPublicUrl(filePath);

                const newAttachment: Attachment = {
                    id: uuidv4(),
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    url: publicUrl,
                    mimeType: file.type,
                    name: file.name,
                    extractedText: extractedText || undefined
                };

                setPendingAttachments(prev => [...prev, newAttachment]);

            } catch (error) {
                console.error('Error uploading file:', error);
                alert('Falha ao enviar arquivo. Verifique o console.');
            } finally {
                // Reset input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const removeAttachment = (id: string) => {
        setPendingAttachments(prev => prev.filter(a => a.id !== id));
    };

    const handleSendMessage = async (overrideInput?: string, overrideDisplay?: string, overrideAgentId?: string) => {
        const textToSend = overrideInput || input;
        if (!textToSend.trim() || isGenerating) return;

        let activeChatId = currentChatId;
        let isFirstMessage = false;

        // 1. Create chat if none exists
        if (!activeChatId) {
            const newChat: ChatSession = {
                id: uuidv4(),
                title: (overrideDisplay || textToSend).slice(0, 30) + ((overrideDisplay || textToSend).length > 30 ? '...' : ''),
                modelId: selectedModelId,
                agentId: overrideAgentId || selectedAgentId || undefined, // Tag session
                messages: [],
                updatedAt: Date.now()
            };
            setChats(prev => [newChat, ...prev]);
            activeChatId = newChat.id;
            setCurrentChatId(activeChatId);
            isFirstMessage = true;
            createChat(newChat); // Persist to Supabase
        }

        // 2. Capture State BEFORE clearing inputs
        // 🔒 SECURITY: Hide the prompt if overrideDisplay is present
        // 📄 PDF: Inject extracted text if available
        let finalContent = textToSend;
        const pdfAttachments = pendingAttachments.filter(a => a.mimeType === 'application/pdf' && a.extractedText);

        if (pdfAttachments.length > 0) {
            // Truncate to avoid 500 Errors (Server Limit / Timeout)
            const MAX_CHARS = 150000; // ~35k tokens safe zone

            const pdfContext = pdfAttachments.map(p => {
                let text = p.extractedText || '';
                if (text.length > MAX_CHARS) {
                    text = text.substring(0, MAX_CHARS) + '\n\n... [TEXTO TRUNCADO POR LIMITE DE TAMANHO] ...';
                    console.warn(`⚠️ PDF Truncated: ${p.extractedText?.length} -> ${MAX_CHARS} chars`);
                }
                return `\n\n--- Contexto do Documento (${p.name}) ---\n${text}`;
            }).join('');

            // 🔒 HIDE PDF TEXT FROM UI (Bubble)
            // The UI splits by :::HIDDEN::: and shows the first part.
            // The backend receives the full content via chatService logic.
            finalContent = `${textToSend} :::HIDDEN::: ${pdfContext}`;
        }

        // If overrideDisplay exists, it takes precedence as the visible part, but we still append the hidden content
        const messageContent = overrideDisplay
            ? `${overrideDisplay} :::HIDDEN::: ${finalContent.includes(':::HIDDEN:::') ? finalContent.split(':::HIDDEN:::')[1] : finalContent}`
            : finalContent;
        const messageAttachments = [...pendingAttachments];
        const capturedTools = { ...activeTools };

        const userMessage: Message = {
            id: uuidv4(),
            role: Role.USER,
            content: messageContent,
            displayContent: overrideDisplay, // Keep for optimistic UI
            timestamp: Date.now(),
            attachments: messageAttachments,
            modelId: selectedModelId
        };

        // 3. Clear UI immediately (Optimistic)
        setInput('');
        setPendingAttachments([]);
        setActiveTools({ web: false, image: false, thinking: false });
        setIsGenerating(true);

        // 4. Save User Message
        if (activeChatId) {
            saveMessage(activeChatId, userMessage);
        }

        // 5. Create Placeholder for AI Response
        const tempAiMessageId = uuidv4();
        const aiPlaceholderMessage: Message = {
            id: tempAiMessageId,
            role: Role.MODEL,
            content: '',
            timestamp: Date.now(),
            isStreaming: true,
            modelId: selectedModelId
        };

        // Update UI with User Message + Empty AI Message
        setChats(prev => prev.map(chat => {
            if (chat.id === activeChatId) {
                return {
                    ...chat,
                    title: isFirstMessage ? (messageContent.slice(0, 30) + (messageContent.length > 30 ? '...' : '')) : chat.title,
                    messages: [...chat.messages, userMessage, aiPlaceholderMessage],
                    updatedAt: Date.now()
                };
            }
            return chat;
        }));

        // 6. Logic to switch model if Image is requested
        let targetModelId = selectedModelId;
        const currentModelDef = availableAndHealthyModels.find(m => m.id === selectedModelId);

        // If the *current* model is ALREADY an image model, we force the tool to be active
        if (currentModelDef?.capabilities.imageGeneration) {
            capturedTools.image = true;
        }
        // If the USER clicked the tool button but the model is text, switch to a Visual Model
        else if (capturedTools.image) {
            if (!currentModelDef?.capabilities.imageGeneration) {
                targetModelId = 'google/gemini-2.0-flash-exp:free'; // Fallback to a visual model
            }
        }

        try {
            // Identify API Model ID
            const targetModelDef = availableAndHealthyModels.find(m => m.id === targetModelId);
            const apiModelId = targetModelDef?.modelId || targetModelId;

            // Load User Profile from LocalStorage
            const userProfile = {
                nickname: localStorage.getItem('drgpt_nickname') || undefined,
                specialty: localStorage.getItem('drgpt_specialty') === 'Outra'
                    ? localStorage.getItem('drgpt_other_specialty') || undefined
                    : localStorage.getItem('drgpt_specialty') || undefined,
                goal: localStorage.getItem('drgpt_focus') || undefined,
                customInstructions: localStorage.getItem('drgpt_preference') || undefined
            };

            const currentChatMessages = chats.find(c => c.id === activeChatId)?.messages || [];
            // Filter out the optimistic messages we just added to avoid duplication in history
            const historyForStream = currentChatMessages.filter(m => m.id !== userMessage.id && m.id !== tempAiMessageId);
            const updatedHistory = [...historyForStream, userMessage];

            console.log('📡 API: Chamando endpoint REAL', { model: apiModelId, tools: capturedTools });

            // Detect if we're in scribe-review mode for SOAP refinement
            const isReviewMode = activeMode === 'scribe-review';
            let fullStreamedResponse = '';

            // 7. REAL API CALL (UNCOMMENTED AND FIXED)
            const fullResponse = await streamChatResponse(
                apiModelId,
                updatedHistory,
                messageContent,
                (chunk) => {
                    fullStreamedResponse += chunk;

                    // Check if this is a refinement response with UPDATE_ACTION tag
                    if (isReviewMode && fullStreamedResponse.includes('<UPDATE_ACTION>')) {
                        // Don't update the chat UI during streaming of UPDATE_ACTION content
                        // We'll process it after completion
                        return;
                    } else {
                        // Update UI on every chunk received for normal responses
                        setChats(prev => prev.map(c => c.id === activeChatId ? {
                            ...c,
                            messages: c.messages.map(m => m.id === tempAiMessageId ? { ...m, content: m.content + chunk } : m)
                        } : c));
                    }
                },
                selectedAgentId ? agents.find(a => a.id === selectedAgentId)?.systemPrompt : undefined,
                { webSearch: capturedTools.web, imageGeneration: capturedTools.image },
                activeChatId,
                userProfile,
                isReviewMode,
                isReviewMode ? scribeContent : undefined
            );

            console.log('✅ RESPOSTA: Recebida completa');

            // 8. Handle UPDATE_ACTION Response
            let finalAiContent = fullResponse;
            let finalDisplayContent = undefined;
            let shouldTriggerTypewriter = false;
            let newDocumentContent = '';

            if (isReviewMode && fullResponse.includes('<UPDATE_ACTION>')) {
                try {
                    // Extract the UPDATE_ACTION tag content
                    const regex = /<UPDATE_ACTION>\s*(\{[\s\S]*?\})\s*<\/UPDATE_ACTION>/;
                    const match = fullResponse.match(regex);

                    if (match && match[1]) {
                        const updateData = JSON.parse(match[1]);
                        newDocumentContent = updateData.new_content || '';

                        // Extract conversational response (everything before the tag)
                        const conversationalPart = fullResponse.split('<UPDATE_ACTION>')[0].trim();

                        // Set flag to trigger typewriter animation
                        shouldTriggerTypewriter = true;

                        // SAVE FULL CONTENT, SHOW ONLY CONVERSATIONAL PART
                        finalAiContent = fullResponse; // Save everything for history
                        finalDisplayContent = conversationalPart || '✓ Documento atualizado.';

                        console.log('🔄 SOAP update detected, will trigger typewriter animation');
                    }
                } catch (error) {
                    console.error('Failed to parse UPDATE_ACTION JSON:', error);
                    finalDisplayContent = 'Erro ao processar atualização.';
                }
            }

            // Trigger typewriter animation if needed
            if (shouldTriggerTypewriter && newDocumentContent) {
                setTypewriterTrigger({ content: newDocumentContent, timestamp: Date.now() });
            }

            // 9. Finalize Message (Remove Streaming flag)
            const aiMessage: Message = {
                id: tempAiMessageId,
                role: Role.MODEL,
                content: finalAiContent, // Save FULL content for history restoration
                displayContent: finalDisplayContent, // Show clean UI
                timestamp: Date.now(),
                modelId: selectedModelId,
                isStreaming: false
            };

            setChats(prev => prev.map(c => c.id === activeChatId ? {
                ...c,
                messages: c.messages.map(m => m.id === tempAiMessageId ? aiMessage : m)
            } : c));

            // Save to DB
            if (activeChatId) {
                saveMessage(activeChatId, aiMessage);
            }

            // 9. Persist Chat Update (Updated At)
            if (isFirstMessage) {
                updateChat(activeChatId, { title: aiMessage.content.slice(0, 30) + '...', updatedAt: Date.now() });
            } else {
                updateChat(activeChatId, { updatedAt: Date.now() });
            }

        } catch (error) {
            console.error('Error generating response:', error);
            setChats(prev => prev.map(c => c.id === activeChatId ? {
                ...c,
                messages: c.messages.map(m => m.id === tempAiMessageId ? { ...m, content: "Erro de conexão com o Dr. GPT. Tente novamente.", isStreaming: false } : m)
            } : c));
        } finally {
            setIsGenerating(false);
            setActiveTools({ web: false, image: false, thinking: false });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#050505] text-emerald-500">
                <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    if (!session) {
        return <AuthPage />;
    }

    // Simple client-side routing for Admin
    if (window.location.pathname === '/admin') {
        return <AdminPage />;
    }

    const activeChat = getCurrentChat();

    const handleModelSelect = (newModelId: string) => {
        setSelectedModelId(newModelId);
        setSelectedAgentId(null); // Clear selected agent when manually picking a model (brain)

        // If there's an active chat, update its model preference immediately
        if (currentChatId) {
            setChats(prev => prev.map(chat => {
                if (chat.id === currentChatId) {
                    return { ...chat, modelId: newModelId };
                }
                return chat;
            }));
            // Persist the change
            updateChat(currentChatId, { modelId: newModelId });
        }
    };

    // 🔧 FIX: Handle Mode Change with Cleanup
    const handleModeChange = (newMode: AppMode) => {
        setActiveMode(newMode);

        // If switching to a dashboard mode (Scribe, Anti-Glosa, Justificativa),
        // we MUST clear the current chat so the dashboard view renders instead of the chat view.
        if (newMode === 'scribe' || newMode === 'antiglosa' || newMode === 'justificativa') {
            setCurrentChatId(null);
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
            {activeMode !== 'scribe-review' && (
                <Sidebar
                    chats={chats}
                    folders={folders}
                    currentChatId={currentChatId}
                    onSelectChat={(chatId) => {
                        const chat = chats.find(c => c.id === chatId);
                        setCurrentChatId(chatId);

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
                                // Actually we want the RAW content if it was an update action, 
                                // but for the editor state we want the CLEAN content? 
                                // No, the editor needs the text. The <UPDATE_ACTION> has the JSON. 
                                // If the message IS the UPDATE_ACTION response, the content field has the JSON?
                                // Let's simplify: The AI returns: "Conversational text <UPDATE_ACTION>{json}</UPDATE_ACTION>"
                                // We saved that to DB. 
                                // When restoring, if we find that pattern, we should extract the JSON content.
                                // If standard message, just use content.

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
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative h-full w-full">

                {/* Shared Chat UI Renderer */}
                {(() => {
                    const renderChatUI = () => (
                        <>
                            {/* Background Mesh Gradient Subtle */}
                            {/* Background Mesh Gradient Subtle - Dark Mode Only */}
                            {isDarkMode && (
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-background to-background pointer-events-none z-0" />
                            )}

                            {/* Top Floating Header */}
                            <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 z-10 pointer-events-none">
                                <div className="flex items-center gap-3 pointer-events-auto">
                                    <button
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        className="md:hidden p-2 rounded-xl bg-surface/50 backdrop-blur-md text-textMuted hover:text-textMain border border-borderLight shadow-lg"
                                    >
                                        <IconMenu />
                                    </button>
                                    <div className="relative group shadow-2xl rounded-xl">
                                        {/* Model Selector */}
                                        {/* Model Selector or Clinical Badge */}
                                        {(activeMode === 'scribe' || activeMode === 'scribe-review') ? (
                                            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 backdrop-blur-md shadow-sm ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white border-emerald-100'}`}>
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className={`font-semibold text-xs md:text-sm tracking-wide ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    ⚡ AI Model: Clinical-Pro v1.0
                                                </span>
                                            </div>
                                        ) : (
                                            <ModelSelector
                                                models={availableAndHealthyModels}
                                                selectedModelId={selectedModelId}
                                                onSelect={handleModelSelect}
                                                isDarkMode={isDarkMode}
                                                agents={agents}
                                                onSelectAgent={handleSelectAgent}
                                                selectedAgentId={selectedAgentId} // Pass selected Agent ID
                                            />
                                        )}
                                    </div>
                                </div>
                            </header>

                            {/* Chat Area */}
                            <main className="flex-1 overflow-y-auto scroll-smooth relative flex flex-col items-center custom-scrollbar z-0">
                                {!activeChat || activeChat.messages.length === 0 ? (
                                    // Welcome Screen with 3D Cards
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl w-full animate-in fade-in zoom-in-95 duration-500">


                                        {selectedAgentId && (
                                            <div className="relative w-32 h-32 mb-8 group animate-in fade-in zoom-in-50 duration-500">
                                                {isDarkMode && <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>}
                                                <div className={`relative w-full h-full rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl ${isDarkMode ? 'bg-surfaceHighlight border border-white/10' : 'bg-white border border-gray-200'}`}>
                                                    {agents.find(a => a.id === selectedAgentId)?.avatarUrl ? (
                                                        <img
                                                            src={agents.find(a => a.id === selectedAgentId)?.avatarUrl}
                                                            alt="Agent Avatar"
                                                            className="w-full h-full object-cover"
                                                            style={{ objectPosition: agents.find(a => a.id === selectedAgentId)?.avatarPosition || 'center' }}
                                                        />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${agents.find(a => a.id === selectedAgentId)?.color || 'from-emerald-500 to-teal-500'}`}>
                                                            <IconBrain className="w-12 h-12 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <h1 className="text-4xl md:text-6xl font-extrabold text-textMain mb-6 tracking-tight drop-shadow-2xl">
                                            {selectedAgentId ? (
                                                <>
                                                    <span className={`text-transparent bg-clip-text ${isDarkMode ? 'bg-gradient-to-r from-emerald-400 to-teal-200' : 'bg-gradient-to-r from-emerald-600 to-teal-500'}`}>
                                                        Olá, Doutor.
                                                    </span>
                                                    <br />
                                                    <span className="text-2xl md:text-4xl font-bold text-textMuted mt-2 block">
                                                        Sou o {agents.find(a => a.id === selectedAgentId)?.name}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className={`text-transparent bg-clip-text ${isDarkMode ? 'bg-gradient-to-r from-emerald-400 to-teal-200' : 'bg-gradient-to-r from-emerald-600 to-teal-500'}`}>
                                                        Olá, Doutor.
                                                    </span>
                                                </>
                                            )}
                                        </h1>
                                        <p className="text-lg text-textMuted mb-12 max-w-xl leading-relaxed font-medium">
                                            {selectedAgentId ? agents.find(a => a.id === selectedAgentId)?.description : 'Seu hub de inteligência avançada.'}
                                        </p>


                                    </div>
                                ) : (
                                    // Message List
                                    <div className="w-full flex-1 pb-48 pt-20">
                                        <div className="max-w-3xl mx-auto">
                                            {activeChat.messages.map(msg => {
                                                // Find the agent if the chat is associated with one
                                                const chatAgent = activeChat.agentId ? agents.find(a => a.id === activeChat.agentId) : undefined;
                                                return <MessageItem key={msg.id} message={msg} isDarkMode={isDarkMode} agent={chatAgent} />;
                                            })}
                                        </div>
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </main>

                            {/* Input Area (Floating Glass & Carved Input) */}
                            <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 z-20 pointer-events-none">
                                <div className="max-w-3xl mx-auto pointer-events-auto">
                                    {/* Input Container */}
                                    <div className={`rounded-[32px] p-1.5 relative transition-all duration-300 ${isDarkMode ? 'shadow-2xl glass-panel' : 'bg-white border border-slate-300 shadow-sm'}`}>

                                        {/* Pending Attachments Preview */}
                                        {pendingAttachments.length > 0 && (
                                            <div className="flex gap-3 px-6 pt-4 pb-2 overflow-x-auto">
                                                {pendingAttachments.map(att => (
                                                    <div key={att.id} className={`relative group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 min-w-[200px] hover:shadow-md ${isDarkMode ? 'bg-[#27272a] border-zinc-700' : 'bg-white border-slate-200'}`}>
                                                        {att.type === 'image' ? (
                                                            <div className="relative w-10 h-10 shrink-0">
                                                                <img src={att.url} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                                                            </div>
                                                        ) : (
                                                            <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                <IconFile className="w-5 h-5" />
                                                            </div>
                                                        )}

                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-zinc-200' : 'text-slate-700'}`}>
                                                                {att.name}
                                                            </p>
                                                            <p className="text-[10px] text-textMuted uppercase font-medium">
                                                                {att.mimeType.split('/').pop()} {att.mimeType === 'application/pdf' && att.extractedText ? '• Processado' : ''}
                                                            </p>
                                                        </div>

                                                        <button
                                                            onClick={() => removeAttachment(att.id)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* The "Carved" Input Slot */}
                                        <div className={`relative rounded-[28px] overflow-visible transition-all duration-300 ${isDarkMode ? 'bg-[#18181b] border border-white/10 shadow-[0px_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0px_10px_30px_rgba(16,185,129,0.1)]' : 'bg-surface border border-borderLight shadow-sm hover:border-emerald-400'}`}>
                                            <textarea
                                                ref={textareaRef}
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder={
                                                    activeTools.web ? "Pesquisar na Web..." :
                                                        ((activeTools.image || availableAndHealthyModels.find(m => m.id === selectedModelId)?.capabilities.imageGeneration) && activeMode !== 'scribe' && activeMode !== 'scribe-review') ? "Descreva a imagem que você quer criar..." :
                                                            isGenerating ? "Aguarde a resposta..." : "Pergunte algo ao Dr. GPT..."
                                                }
                                                className={`w-full bg-transparent text-textMain placeholder-textMuted text-[16px] md:text-lg px-6 py-5 max-h-48 overflow-y-auto resize-none outline-none transition-opacity duration-200 ${isGenerating ? 'opacity-60 cursor-wait' : 'opacity-100'}`}
                                                rows={1}
                                                style={{ minHeight: '72px' }}
                                                readOnly={isGenerating}
                                            />

                                            {/* Hidden File Input */}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileSelect}
                                                accept="image/*,application/pdf" // Adjust as needed
                                            />

                                            {/* Toolbar inside the slot */}
                                            <div className="flex items-center justify-between px-4 pb-3 pt-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <AttachmentMenu
                                                            isOpen={isAttachmentMenuOpen}
                                                            onClose={() => setIsAttachmentMenuOpen(false)}
                                                            isDarkMode={isDarkMode}
                                                            triggerRef={attachmentButtonRef}
                                                            isImageMode={activeMode !== 'scribe' && activeMode !== 'scribe-review' && !!availableAndHealthyModels.find(m => m.id === selectedModelId)?.capabilities.imageGeneration}
                                                            isWebActive={activeTools.web}
                                                            onToggleWeb={() => setActiveTools(prev => ({ ...prev, web: !prev.web }))}
                                                            onSelect={(option) => {
                                                                if (option === 'upload') {
                                                                    fileInputRef.current?.click();
                                                                } else if (option === 'photos') {
                                                                    // Handle photos
                                                                    fileInputRef.current?.click();
                                                                } else if (option === 'prompts') {
                                                                    setIsPromptsModalOpen(true);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            ref={attachmentButtonRef}
                                                            onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                                                            className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                                                    ${isAttachmentMenuOpen
                                                                    ? 'bg-zinc-700 text-white'
                                                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                                                }
                                                `}
                                                        >
                                                            <Plus size={24} />
                                                        </button>
                                                    </div>



                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {/* Active Tool Indicators */}
                                                    {activeTools.web && (
                                                        <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-xs">
                                                            <Globe size={12} />
                                                            <span>Web</span>
                                                        </div>
                                                    )}
                                                    {activeTools.image && (
                                                        <div className="flex items-center gap-1 text-purple-500 bg-purple-500/10 px-2 py-1 rounded text-xs">
                                                            <Image size={12} />
                                                            <span>Img</span>
                                                        </div>
                                                    )}

                                                    {/* Reasoning Toggle (Raciocínio) */}
                                                    {availableAndHealthyModels.find(m => m.id === selectedModelId)?.capabilities.reasoning && (
                                                        <button
                                                            onClick={() => setActiveTools(prev => ({ ...prev, thinking: !prev.thinking }))}
                                                            className={`
                                                    flex items-center gap-2 text-sm font-medium transition-colors duration-200
                                                    ${activeTools.thinking ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}
                                                `}
                                                        >
                                                            <span>Raciocínio</span>
                                                            <ChevronDown size={14} className={`transition-transform duration-200 ${activeTools.thinking ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    )}

                                                    {hasMicSupport && (
                                                        <button
                                                            onClick={handleMicClick}
                                                            className={`transition-colors duration-200 ${isListening
                                                                ? 'text-red-500 animate-pulse'
                                                                : 'text-zinc-400 hover:text-zinc-200'
                                                                }`}
                                                            title="Gravar áudio"
                                                        >
                                                            <Mic size={24} />
                                                        </button>
                                                    )}

                                                    {(input.trim() || pendingAttachments.length > 0) && (
                                                        <button
                                                            onClick={() => handleSendMessage()}
                                                            disabled={isGenerating}
                                                            className={`transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-black'}`}
                                                        >
                                                            <IconSend />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>


                                    </div>
                                </div>
                            </div>


                            <PromptsModal
                                isOpen={isPromptsModalOpen}
                                onClose={() => setIsPromptsModalOpen(false)}
                                onSelectPrompt={(content) => setInput(content)}
                                isDarkMode={isDarkMode}
                            />

                        </>
                    );

                    return (
                        activeMode === 'scribe-review' ? (
                            <ScribeReview
                                content={scribeContent}
                                onChange={setScribeContent}
                                isDarkMode={isDarkMode}
                                typewriterTrigger={typewriterTrigger}
                                title={reviewTitle}
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

                                    saveMessage(currentChatId, saveMessageObj);
                                    setChats(prev => prev.map(c => c.id === currentChatId ? {
                                        ...c,
                                        messages: [...c.messages, saveMessageObj]
                                    } : c));

                                    // Update timestamp
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
                                    setCurrentChatId(null);
                                }}
                            >
                                {renderChatUI()}
                            </ScribeReview>
                        ) : (
                            (activeMode === 'chat' || (currentChatId && (activeMode === 'scribe' || activeMode === 'antiglosa'))) && renderChatUI()
                        )
                    )
                })()}

                {activeMode === 'scribe' && !currentChatId && (
                    <ScribeView
                        isDarkMode={isDarkMode}
                        onGenerate={async (consultation, thoughts, patientName, patientGender, audioBlob, scenario = 'evolution') => {
                            // 1. Create a new Chat Session specifically for this Scribe Review
                            const newChatId = uuidv4();
                            // Force GPT-4o Mini for Scribe Mode
                            const scribeModelId = 'openai/gpt-4o-mini';

                            const newChat: ChatSession = {
                                id: newChatId,
                                title: `Prontuário - ${patientName || 'Sem Nome'}`,
                                modelId: scribeModelId, // 🔒 Force Text Model
                                agentId: 'scribe-mode', // 🏷️ FIX: Tag chat for Sidebar filtering
                                messages: [],
                                metadata: {
                                    agentId: 'scribe-mode', // 🛡️ Backup persistence
                                    patient_name: patientName,
                                    patient_gender: patientGender
                                },
                                updatedAt: Date.now()
                            };

                            setChats(prev => [newChat, ...prev]);
                            setCurrentChatId(newChatId);
                            setSelectedModelId(scribeModelId); // 🔒 Update global selection to match
                            createChat(newChat); // Persist

                            // 2. Add System/AI Message to the Char
                            const welcomeMsg: Message = {
                                id: uuidv4(),
                                role: Role.MODEL,
                                content: "Consulta processada. Precisa de algum ajuste ou documento extra (atestado/encaminhamento)?",
                                timestamp: Date.now(),
                                modelId: selectedModelId
                            };
                            saveMessage(newChatId, welcomeMsg);
                            setChats(prev => prev.map(c => c.id === newChatId ? { ...c, messages: [welcomeMsg] } : c));

                            // 3. Switch to Scribe Review Mode
                            setActiveMode('scribe-review');
                            setReviewTitle('Revisão de Prontuário'); // Reset title
                            setScribeContent('Processando dados da consulta...\n\nGerando Documentação...');

                            let audioUrl = "";
                            let finalPrompt = "";

                            // 1. Upload Audio if present (Telemedicine Mode)
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

                            // Map Scenario to Prompt Instructions
                            let scenarioInstruction = "";
                            switch (scenario) {
                                case 'anamnesis':
                                    scenarioInstruction = `System Prompt Interno: 'Você é um assistente de documentação médica avançado. O médico está realizando uma ANAMNESE COMPLETA.

Sua tarefa é estruturar as informações coletadas no seguinte formato ESTRITO:

## 1) ANAMNESE

IDENTIFICAÇÃO DO PACIENTE
- Nome completo
- Idade, sexo, profissão
- Procedência
- Data da consulta

QUEIXA PRINCIPAL (QP)
- Motivo da consulta em palavras do paciente

HISTÓRIA DA DOENÇA ATUAL (HDA)
- Início dos sintomas
- Caracterização (localização, qualidade, intensidade, duração)
- Fatores de melhora e piora
- Sintomas associados
- Evolução temporal
- Tratamentos prévios realizados

REVISÃO DE SISTEMAS
- Sintomas gerais
- Por aparelhos/sistemas

HISTÓRIA PATOLÓGICA PREGRESSA (HPP)
- Doenças prévias
- Cirurgias
- Internações
- Alergias
- Medicações em uso

HISTÓRIA FAMILIAR
- Doenças na família

HISTÓRIA SOCIAL
- Tabagismo, etilismo, drogas
- Atividade física
- Condições de moradia

EXAME FÍSICO
- Sinais vitais
- Exame geral
- Exame específico por sistemas

HIPÓTESES DIAGNÓSTICAS

CONDUTA/PLANO
- Exames solicitados
- Prescrições
- Orientações

Preencha cada tópico com as informações disponíveis no áudio e notas.'`;
                                    break;

                                case 'bedside':
                                    scenarioInstruction = `System Prompt Interno: 'Você é um assistente hospitalar. O contexto é uma VISITA À BEIRA DO LEITO (Round).

Estruture a nota de evolução hospitalar no seguinte formato ESTRITO:

## 4) VISITA À BEIRA DO LEITO

DATA, HORA E LEITO

IDENTIFICAÇÃO
- Nome, idade, diagnóstico principal
- Dia de internação (#DIH)

QUEIXAS/INTERCORRÊNCIAS
- Relato do paciente e equipe
- Eventos nas últimas 24h

DADOS VITAIS E CLÍNICOS
- Sinais vitais atuais
- Balanço hídrico
- Dieta aceita
- Eliminações

EXAME FÍSICO FOCADO
- Estado geral
- Sistemas relevantes ao caso

RESULTADOS DE EXAMES
- Laboratoriais
- Imagem
- Outros

AVALIAÇÃO
- Diagnóstico principal
- Diagnósticos secundários
- Evolução do quadro

PRESCRIÇÕES/AJUSTES
- Medicações
- Dieta
- Cuidados de enfermagem
- Fisioterapia/outros

EXAMES SOLICITADOS

PLANO DE ALTA
- Previsão
- Pendências para alta

OBSERVAÇÕES IMPORTANTES

Garanta que todos os dados numéricos e clínicos citados sejam transcritos com precisão.'`;
                                    break;

                                case 'clinical_meeting':
                                    scenarioInstruction = `System Prompt Interno: 'Você é um secretário clínico. O contexto é uma REUNIÃO CLÍNICA DE EQUIPE (Discusão de Casos).

Gere uma ata estruturada no seguinte formato ESTRITO:

## 3) REUNIÃO CLÍNICA

CABEÇALHO
- Data e hora
- Local
- Participantes presentes
- Tipo de reunião (round, discussão de caso, etc.)

CASOS DISCUTIDOS

(Repita o bloco abaixo para cada paciente discutido):

---
PACIENTE: [Nome]

IDENTIFICAÇÃO
- Nome, leito, idade, diagnóstico principal

RESUMO DO CASO
- Motivo da internação
- Dias de internação
- Histórico relevante

SITUAÇÃO ATUAL
- Estado clínico atual
- Exames pendentes/resultados
- Intercorrências

DISCUSSÃO
- Pontos debatidos pela equipe
- Dúvidas levantadas
- Diferentes opiniões/abordagens

DECISÕES TOMADAS
- Condutas definidas
- Responsáveis por cada ação
- Prazos estabelecidos

PENDÊNCIAS
- O que precisa ser resolvido
- Próximos passos
---

ENCERRAMENTO
- Resumo das decisões principais
- Data da próxima reunião'`;
                                    break;

                                case 'evolution':
                                default:
                                    scenarioInstruction = `System Prompt Interno: 'Você é um assistente de rotina médica. O médico está realizando uma EVOLUÇÃO MÉDICA DIÁRIA.

Estruture a nota no seguinte formato ESTRITO:

## 2) EVOLUÇÃO MÉDICA

DATA E HORA

SUBJETIVO
- Queixas atuais do paciente
- Relato de sintomas nas últimas 24h
- Aceitação de dieta, sono, evacuação, diurese

OBJETIVO
- Sinais vitais (PA, FC, FR, Tax, SatO2)
- Exame físico direcionado
- Resultados de exames recentes

ANÁLISE/AVALIAÇÃO
- Interpretação do quadro clínico atual
- Resposta ao tratamento
- Complicações ou intercorrências

PLANO
- Ajustes terapêuticos
- Novos exames solicitados
- Metas para as próximas 24h
- Previsão de alta ou mudanças no cuidado

ASSINATURA E CARIMBO (Espaço para)

Seja conciso, técnico e direto.'`;
                                    break;
                            }

                            // 2. Construct Prompt with Scenarios
                            const commonInstructions = `TASK: Gere o documento médico baseado no áudio/texto e na NOTA TÉCNICA.\n\n${scenarioInstruction}\n\nREGRA: Gere SEMPRE o documento completo. Receita/Atestado apenas se solicitado no texto.\n\nFORMATO OBRIGATÓRIO: Apenas o conteúdo do documento. NÃO inclua introduções como "Aqui está", NÃO inclua conclusões e NÃO use blocos de código markdown (\`\`\`). O output deve ser apenas o texto pronto para copiar.`;

                            if (audioUrl) {
                                finalPrompt = `[AI SCRIBE ACTION - AUDIO MODE]\nSOURCE 1: AUDIO DA CONSULTA (Telemedicina)\nURL: ${audioUrl}\nSOURCE 2: NOTA TÉCNICA: "${thoughts}"\nCONTEXTO: ${patientContext}\n\n${commonInstructions}`;
                            } else {
                                finalPrompt = `[AI SCRIBE ACTION - TEXT MODE]\nSOURCE 1: TRANSCRIPT: "${consultation}"\nSOURCE 2: NOTA TÉCNICA: "${thoughts}"\nCONTEXTO: ${patientContext}\n\n${commonInstructions}`;
                            }

                            // 3. STREAM GENERATION DIRECTLY TO scribeContent STATE
                            // We use a dummy chat history just for the context of the generation, but output goes to state.
                            try {
                                const response = await streamChatResponse(
                                    scribeModelId, // 🔒 Use local var to ensure correct model immediately
                                    [{ role: Role.USER, content: finalPrompt, id: 'prompt', timestamp: Date.now() }], // One-shot prompt
                                    finalPrompt,
                                    (chunk) => {
                                        setScribeContent(prev => {
                                            if (prev.startsWith('Processando')) return chunk; // Replace placeholder
                                            return prev + chunk;
                                        });
                                    },
                                    undefined,
                                    { webSearch: false, imageGeneration: false },
                                    newChatId, // Associate with the chat for logging
                                    undefined
                                );
                                // Final update ensures sync
                                setScribeContent(response);

                                // 4. SAVE INITIAL DOCUMENT TO HISTORY
                                const docMessage: Message = {
                                    id: uuidv4(),
                                    role: Role.MODEL,
                                    content: response,
                                    displayContent: '📄 Prontuário Gerado',
                                    timestamp: Date.now(),
                                    modelId: selectedModelId
                                };
                                saveMessage(newChatId, docMessage);
                                setChats(prev => prev.map(c => c.id === newChatId ? {
                                    ...c,
                                    messages: [...c.messages, docMessage] // Append doc AFTER welcome msg? No, order matters by timestamp. 
                                    // Actually welcomeMsg was added first. So this comes second. Ideally it should be first?
                                    // Let's just append it.
                                } : c));

                            } catch (e) {
                                setScribeContent('Erro ao gerar prontuário.');
                            }
                        }}
                        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        onOpenSettings={() => {
                            setActiveMode('settings');
                            setSidebarOpen(true);
                        }}
                    />
                )}

                {activeMode === 'antiglosa' && !currentChatId && (
                    <AntiGlosaView
                        isDarkMode={isDarkMode}
                        isLoading={isGenerating}
                        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        onGenerate={async (text, estimatedValue) => {
                            // 1. Create specialized Chat Session
                            const newChatId = uuidv4();
                            // Force GPT-4o-mini for speed/cost efficiency
                            const defenseModelId = 'openai/gpt-4o-mini';

                            const newChat: ChatSession = {
                                id: newChatId,
                                title: `Defesa - ${text.slice(0, 20)}...`,
                                modelId: defenseModelId,
                                agentId: 'antiglosa-mode', // Tag for filtering
                                messages: [],
                                updatedAt: Date.now(),
                                metadata: {
                                    estimated_value: estimatedValue
                                }
                            };

                            setChats(prev => [newChat, ...prev]);
                            setCurrentChatId(newChatId);
                            setSelectedModelId(defenseModelId);
                            createChat(newChat);

                            // 2. Add AI Welcome Message
                            const welcomeMsg: Message = {
                                id: uuidv4(),
                                role: Role.MODEL,
                                content: "Defesa gerada com sucesso. Verifique o texto abaixo e faça ajustes se necessário.",
                                timestamp: Date.now(),
                                modelId: defenseModelId
                            };
                            saveMessage(newChatId, welcomeMsg);
                            setChats(prev => prev.map(c => c.id === newChatId ? { ...c, messages: [welcomeMsg] } : c));

                            // 3. Set UI State
                            setActiveMode('scribe-review');
                            setReviewTitle('Defesa Gerada'); // Customize Header
                            setScribeContent('Aguarde... Consultando Jurisprudência e Rol da ANS...');
                            setIsGenerating(true);

                            // 4. Construct System Prompt
                            const prompt = `ROLE: Você é um Auditor Médico Sênior e Advogado Especialista em Direito à Saúde.
TASK: Escreva um RECURSO DE GLOSA (Carta de Apelação) formal.
INPUT DO USUÁRIO: "${text}"

DIRETRIZES TÉCNICAS (CRÍTICO):
1. Citação de Leis: 
   - Cite o "Código de Defesa do Consumidor" (Súmula 469 STJ se aplicável).
   - Cite a "Lei 9.656/98" (Lei dos Planos de Saúde).
   - Cite o "Rol de Procedimentos e Eventos em Saúde da ANS".
2. Estrutura da Carta:
   - Cabeçalho: "À [Nome da Operadora]" (se não houver, use "À Auditoria Médica").
   - Assunto: "RECURSO ADMINISTRATIVO - REVISÃO DE GLOSA".
   - Identificação do Paciente (Use os dados do input).
   - Justificativa Clínica: Explique a necessidade médica baseada no input.
   - Argumentação Jurídica: Por que a negativa é abusiva.
   - Conclusão: Exija autorização imediata.
   
FORMATO:
Retorne APENAS o texto da carta em Markdown. Sem introduções. Sem bloco de código.`;

                            // 5. Stream Response
                            try {
                                const response = await streamChatResponse(
                                    defenseModelId,
                                    [{ role: Role.USER, content: prompt, id: 'prompt', timestamp: Date.now() }],
                                    prompt,
                                    (chunk) => {
                                        setScribeContent(prev => {
                                            if (prev.startsWith('Aguarde...')) return chunk;
                                            return prev + chunk;
                                        });
                                    },
                                    undefined,
                                    { webSearch: false, imageGeneration: false },
                                    newChatId,
                                    undefined
                                );
                                setScribeContent(response);
                                setIsGenerating(false);

                                // Save generated document to history
                                const docMessage: Message = {
                                    id: uuidv4(),
                                    role: Role.MODEL,
                                    content: response,
                                    displayContent: '📄 Defesa Gerada',
                                    timestamp: Date.now(),
                                    modelId: defenseModelId
                                };
                                saveMessage(newChatId, docMessage);
                                setChats(prev => prev.map(c => c.id === newChatId ? {
                                    ...c,
                                    messages: [...c.messages, docMessage]
                                } : c));

                            } catch (error) {
                                console.error(error);
                                setScribeContent('Erro ao gerar defesa. Tente novamente.');
                                setIsGenerating(false);
                            }
                        }}
                    />
                )}

                {activeMode === 'justificativa' && !currentChatId && (
                    <JustificativaView
                        isDarkMode={isDarkMode}
                        isLoading={isGenerating}
                        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        onGenerate={async (text) => {
                            const newChatId = uuidv4();
                            const justifModelId = 'openai/gpt-4o-mini';

                            const newChat: ChatSession = {
                                id: newChatId,
                                title: `Justificativa - ${text.slice(0, 20)}...`,
                                modelId: justifModelId,
                                agentId: 'justificativa-mode',
                                messages: [],
                                updatedAt: Date.now()
                            };

                            setChats(prev => [newChat, ...prev]);
                            setCurrentChatId(newChatId);
                            setSelectedModelId(justifModelId);
                            createChat(newChat);

                            const welcomeMsg: Message = {
                                id: uuidv4(),
                                role: Role.MODEL,
                                content: "Justificativa gerada com sucesso. Verifique o texto abaixo e faça ajustes se necessário.",
                                timestamp: Date.now(),
                                modelId: justifModelId
                            };
                            saveMessage(newChatId, welcomeMsg);
                            setChats(prev => prev.map(c => c.id === newChatId ? { ...c, messages: [welcomeMsg] } : c));

                            setActiveMode('scribe-review');
                            setReviewTitle('Justificativa Prévia');
                            setScribeContent('Aguarde... Consultando Jurisprudência e Rol da ANS...');
                            setIsGenerating(true);

                            const prompt = `ROLE: Você é um Auditor Médico Sênior e Especialista em Regulação de Saúde (ANS).
TASK: Escreva uma CARTA TÉCNICA solicitando AUTORIZAÇÃO PRÉVIA para cirurgia ou exame.
INPUT DO USUÁRIO: "${text}"

DIRETRIZES TÉCNICAS (CRÍTICO):
1. Objetivo: Demonstrar a necessidade técnica do procedimento para evitar glosa futura.
2. Citação de Leis e Resoluções:
   - Cite o "Rol de Procedimentos e Eventos em Saúde da ANS" (Resolução Normativa vigente).
   - Cite Diretrizes de Utilização (DUT) se aplicável ao procedimento.
   - Cite Medicina Baseada em Evidências para justificar a indicação clínica.
3. Estrutura da Carta:
   - Destinatário: "À Auditoria Médica da [Operadora]".
   - Assunto: "SOLICITAÇÃO DE AUTORIZAÇÃO PRÉVIA - CARÁTER ELETIVO".
   - Identificação do Paciente (Use os dados do input, ou [NOME DO PACIENTE] se não houver).
   - Indicação Clínica Detalhada: Resuma a história clínica, exames anteriores e falha terapêutica.
   - Embasamento Técnico: Por que este procedimento é o indicado?
   - Conclusão: Solicito emissão de senha de autorização.
   
FORMATO:
Retorne APENAS o texto da carta em Markdown. Sem introduções. Sem bloco de código.`;

                            try {
                                const response = await streamChatResponse(
                                    justifModelId,
                                    [{ role: Role.USER, content: prompt, id: 'prompt', timestamp: Date.now() }],
                                    prompt,
                                    (chunk) => {
                                        setScribeContent(prev => {
                                            if (prev.startsWith('Aguarde...')) return chunk;
                                            return prev + chunk;
                                        });
                                    },
                                    undefined,
                                    { webSearch: false, imageGeneration: false },
                                    newChatId,
                                    undefined
                                );
                                setScribeContent(response);
                                setIsGenerating(false);

                                const docMessage: Message = {
                                    id: uuidv4(),
                                    role: Role.MODEL,
                                    content: response,
                                    displayContent: '📄 Justificativa Gerada',
                                    timestamp: Date.now(),
                                    modelId: justifModelId
                                };
                                saveMessage(newChatId, docMessage);
                                setChats(prev => prev.map(c => c.id === newChatId ? {
                                    ...c,
                                    messages: [...c.messages, docMessage]
                                } : c));

                            } catch (error) {
                                console.error(error);
                                setScribeContent('Erro ao gerar justificativa. Tente novamente.');
                                setIsGenerating(false);
                            }
                        }}
                    />
                )}

                {activeMode === 'settings' && (
                    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-8 animate-in fade-in duration-500">

                        {/* Settings Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-2">
                                Configurações
                            </h1>
                            <p className="text-zinc-400">
                                {settingsTab === 'profile' && 'Gerencie seus dados pessoais.'}
                                {settingsTab === 'subscription' && 'Detalhes do seu plano e faturamento.'}
                                {settingsTab === 'appearance' && 'Personalize a aparência do Dr. GPT.'}
                                {settingsTab === 'security' && 'Gerencie a segurança da sua conta.'}
                            </p>
                        </div>

                        {/* SUBSCRIPTION VIEW */}
                        {settingsTab === 'subscription' && (
                            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-4 duration-300">

                                {/* Current Plan Card */}
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                        <IconCreditCard className="w-64 h-64 text-emerald-500" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                                                <IconCreditCard className="w-6 h-6" />
                                            </div>
                                            <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Plano Atual</span>
                                        </div>

                                        <div className="flex items-baseline gap-3 mb-6">
                                            <h2 className="text-5xl font-extrabold text-white">
                                                {user?.plan?.name || 'Plano Gratuito'}
                                            </h2>
                                            <span className="px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider">
                                                Ativo
                                            </span>
                                        </div>

                                        <p className="text-zinc-400 text-lg max-w-xl mb-8 leading-relaxed">
                                            Você tem acesso a inteligência clínica avançada, transcrição de áudio ilimitada e todos os recursos premium do Dr. GPT.
                                        </p>

                                        <button
                                            className="px-6 py-3 bg-white text-emerald-900 font-bold rounded-xl hover:bg-zinc-200 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                            onClick={() => window.open('https://checkout.stripe.com/c/pay/...', '_blank')}
                                        >
                                            <Settings className="w-4 h-4" />
                                            Gerenciar Assinatura na Stripe
                                        </button>
                                    </div>
                                </div>

                                {/* Billing Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Status</span>
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <Check className="w-5 h-5" />
                                            <span className="font-semibold text-lg">Pagamento em dia</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Próxima Cobrança</span>
                                        <div className="flex items-center gap-2 text-zinc-200">
                                            <Activity className="w-5 h-5 text-zinc-500" />
                                            <span className="font-semibold text-lg">
                                                {user?.billing_current_period_end
                                                    ? new Date(user.billing_current_period_end).toLocaleDateString('pt-BR')
                                                    : 'N/A'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Método</span>
                                        <div className="flex items-center gap-2 text-zinc-200">
                                            <CreditCard className="w-5 h-5 text-zinc-500" />
                                            <span className="font-semibold text-lg">Cartão •••• 4242</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PROFILE VIEW */}
                        {settingsTab === 'profile' && (
                            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-[#2A2B32] border border-white/5 rounded-2xl p-8 space-y-8">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Dados Pessoais</h2>
                                            <p className="text-zinc-400 text-sm">Personalize como a IA interage com você.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Field 1: Nickname */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-zinc-200">Como o Dr. GPT deve te chamar?</label>
                                            <input
                                                type="text"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                className="w-full bg-[#343541] border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-600"
                                                placeholder="Ex: Dr. Jack"
                                            />
                                        </div>

                                        {/* Field 2: Specialty */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-zinc-200">Especialidade Médica</label>
                                            <div className="relative">
                                                <select
                                                    value={specialty}
                                                    onChange={(e) => setSpecialty(e.target.value)}
                                                    className="w-full bg-[#343541] border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled>Selecione sua área...</option>
                                                    <option value="Cardiologia">Cardiologia</option>
                                                    <option value="Dermatologia">Dermatologia</option>
                                                    <option value="Clínica Geral">Clínica Geral</option>
                                                    <option value="Pediatria">Pediatria</option>
                                                    <option value="Ortopedia">Ortopedia</option>
                                                    <option value="Neurologia">Neurologia</option>
                                                    <option value="Ginecologia">Ginecologia</option>
                                                    <option value="Psiquiatria">Psiquiatria</option>
                                                    <option value="Outra">Outra Especialidade</option>
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 rotate-90" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conditional Input for 'Outra' */}
                                    {specialty === 'Outra' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-sm font-semibold text-zinc-200">Qual sua especialidade?</label>
                                            <input
                                                type="text"
                                                value={otherSpecialty}
                                                onChange={(e) => setOtherSpecialty(e.target.value)}
                                                className="w-full bg-[#343541] border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-600"
                                                placeholder="Digite sua especialidade..."
                                            />
                                        </div>
                                    )}

                                    {/* Field 3: Professional Focus */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-zinc-200">Qual seu objetivo principal?</label>
                                        <div className="relative">
                                            <select
                                                value={professionalFocus}
                                                onChange={(e) => setProfessionalFocus(e.target.value)}
                                                className="w-full bg-[#343541] border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Selecione o foco...</option>
                                                <option value="Auxílio Clínico & Segunda Opinião">Auxílio Clínico & Segunda Opinião</option>
                                                <option value="Burocracia & Documentação">Burocracia & Documentação (Laudos/Atestados)</option>
                                                <option value="Estudos & Atualização Científica">Estudos & Atualização Científica</option>
                                                <option value="Marketing Médico & Redes Sociais">Marketing Médico & Redes Sociais</option>
                                                <option value="Gestão de Clínica">Gestão de Clínica</option>
                                            </select>
                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 rotate-90" />
                                        </div>
                                    </div>

                                    {/* Field 4: Specific Preference */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-baseline">
                                            <label className="text-sm font-semibold text-zinc-200">Alguma preferência específica?</label>
                                            <span className={`text-xs ${specificPreference.length > 180 ? 'text-red-400' : 'text-zinc-500'}`}>
                                                {specificPreference.length}/200
                                            </span>
                                        </div>
                                        <textarea
                                            value={specificPreference}
                                            onChange={(e) => {
                                                if (e.target.value.length <= 200) {
                                                    setSpecificPreference(e.target.value);
                                                }
                                            }}
                                            className="w-full h-24 bg-[#343541] border border-white/10 rounded-xl p-4 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none placeholder-zinc-600 custom-scrollbar"
                                            placeholder="Ex: Cite sempre fontes da SBC; Prefiro respostas em tópicos..."
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-white/5">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isSettingsSaving}
                                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isSettingsSaving ? (
                                                <>
                                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                                    Salvando...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-5 h-5" />
                                                    Salvar Alterações
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE VIEW */}
                        {settingsTab === 'appearance' && (
                            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-[#2A2B32] border border-white/5 rounded-2xl p-8 space-y-6">
                                    <h2 className="text-xl font-bold text-white mb-6">Aparência e Cores</h2>

                                    <div className="flex items-center justify-between p-4 bg-[#343541] rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-zinc-700/50 rounded-lg flex items-center justify-center">
                                                <Palette className="w-5 h-5 text-zinc-400" />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-zinc-200">Tema da Interface</label>
                                                <p className="text-sm text-zinc-500">Escolha entre modo claro ou escuro.</p>
                                            </div>
                                        </div>
                                        <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                                            <button
                                                onClick={() => {
                                                    setIsDarkMode(false);
                                                    setSettingsState({ ...settingsState, theme: 'light' });
                                                }}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${!isDarkMode ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                                    }`}
                                            >
                                                Claro
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsDarkMode(true);
                                                    setSettingsState({ ...settingsState, theme: 'dark' });
                                                }}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${isDarkMode ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                                    }`}
                                            >
                                                Escuro
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-[#343541] rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-zinc-700/50 rounded-lg flex items-center justify-center">
                                                <Globe className="w-5 h-5 text-zinc-400" />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-zinc-200">Idioma</label>
                                                <p className="text-sm text-zinc-500">Idioma principal do sistema.</p>
                                            </div>
                                        </div>
                                        <select
                                            value={settingsState.language}
                                            onChange={(e) => setSettingsState({ ...settingsState, language: e.target.value })}
                                            className="bg-[#2A2B32] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                        >
                                            <option value="pt-BR">Português (Brasil)</option>
                                            <option value="en-US">English (US)</option>
                                        </select>
                                    </div>

                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-3">
                                        <div className="mt-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-400">Preferência de Tema Salva</h4>
                                            <p className="text-xs text-zinc-500 mt-1">Sua preferência de tema é salva localmente e sincronizada com seu perfil.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECURITY VIEW */}
                        {settingsTab === 'security' && (
                            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-[#2A2B32] border border-white/5 rounded-2xl p-8 space-y-6">
                                    <h2 className="text-xl font-bold text-white mb-6">Segurança da Conta</h2>

                                    <div className="p-4 bg-[#343541] rounded-xl border border-white/5 flex flex-col md:flex-row items-start md:items-center gap-6">
                                        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                                            <Shield className="w-6 h-6 text-red-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white text-lg">Redefinir Senha</h3>
                                            <p className="text-sm text-zinc-400 mt-1">
                                                Para garantir a segurança máxima da sua conta, enviaremos um link seguro para o seu email registrado ({user?.email}) para você criar uma nova senha.
                                            </p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                console.log('Attempting reset for:', user?.email);
                                                if (user?.email) {
                                                    const { error } = await authService.resetPasswordForEmail(user.email);
                                                    console.log('Reset result error:', error);
                                                    if (error) {
                                                        toast.error('Erro ao enviar email: ' + error.message);
                                                    } else {
                                                        toast.success('Email de redefinição enviado com sucesso!');
                                                    }
                                                } else {
                                                    console.error('User email not found');
                                                    toast.error('Email do usuário não encontrado.');
                                                }
                                            }}
                                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-95 whitespace-nowrap"
                                        >
                                            Enviar Link
                                        </button>
                                    </div>

                                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3">
                                        <div className="mt-1">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-400">Método 100% Seguro</h4>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                Não solicitamos sua senha antiga. A confirmação via email garante que apenas o proprietário da conta possa realizar alterações críticas.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div >
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Toaster />
            <AppContent />
        </AuthProvider>
    );
}