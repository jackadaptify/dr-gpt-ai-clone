import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MessageItem from './components/MessageItem';
import { ChatSession, Message, Role, AVAILABLE_MODELS, Folder, Agent, AVAILABLE_AGENTS, Attachment, AIModel } from './types';
import { streamChatResponse, saveMessage, loadChatHistory, createChat, updateChat, loadMessagesForChat } from './services/chatService';
import { fetchOpenRouterModels, OpenRouterModel } from './services/openRouterService';
import { agentService } from './services/agentService';
import { IconMenu, IconSend, IconAttachment, IconGlobe, IconImage, IconBrain, IconPlus } from './components/Icons';
import { v4 as uuidv4 } from 'uuid';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
// import { chatStorage } from './services/chatStorage'; // Removed for Supabase
import AdminPage from './components/Admin/AdminPage';
import { modelHealthService, ModelHealth } from './services/modelHealthService';
import { supabase } from './lib/supabase';
import ModelSelector from './components/ModelSelector';
import AttachmentMenu from './components/AttachmentMenu';
import PromptsModal from './components/PromptsModal';
import { Activity, ShieldAlert, FileText, Siren, ClipboardList, Instagram, MessageCircle, Star, Brain, Mail } from 'lucide-react';

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

const INITIAL_FOLDERS: Folder[] = [
    { id: '1', name: 'Pessoais' },
    { id: '2', name: 'Empresa' },
    { id: '3', name: 'Trabalho' },
    { id: '4', name: 'Dr. GPT' },
];

function AppContent() {
    const { session, loading } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedModelId, setSelectedModelId] = useState<string>(AVAILABLE_MODELS[0].id);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);

    // Rotating Suggestions Logic
    const [suggestions, setSuggestions] = useState(() => [...ALL_SUGGESTIONS].sort(() => 0.5 - Math.random()).slice(0, 4));

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentButtonRef = useRef<HTMLButtonElement>(null);
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
    const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);
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

    // Utility to clean model names
    const cleanModelName = (name: string, id: string) => {
        // Remove provider prefixes
        let clean = name.replace(/^(google\/|openai\/|anthropic\/|deepseek\/|meta-llama\/)/i, '');

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

            // Merge with local definitions to get capabilities
            const mergedModels: AIModel[] = fetched.map(fm => {
                // Try to find a matching static definition
                const staticDef = AVAILABLE_MODELS.find(am => am.modelId === fm.id);

                if (staticDef) {
                    return {
                        ...staticDef,
                        name: cleanModelName(fm.name, fm.id) // Use cleaned name
                    };
                }

                // Infer capabilities for new models
                const isVision = fm.id.includes('vision') || fm.id.includes('gemini') || fm.id.includes('claude-3') || fm.id.includes('gpt-4o');
                const isReasoning = fm.id.includes('reasoning') || fm.id.includes('o1') || fm.id.includes('deepseek-r1');

                return {
                    id: fm.id, // Use OpenRouter ID as internal ID for dynamic ones
                    name: cleanModelName(fm.name, fm.id),
                    description: 'Modelo disponível via OpenRouter',
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

            // If we fetched models, use them. Otherwise fallback to static.
            if (mergedModels.length > 0) {
                setDynamicModels(mergedModels);
            } else {
                setDynamicModels(AVAILABLE_MODELS);
            }
        };

        loadModels();
    }, []);

    // Circuit Breaker: Filter out offline models
    // Use dynamicModels instead of AVAILABLE_MODELS
    const activeModelList = dynamicModels.length > 0 ? dynamicModels : AVAILABLE_MODELS;

    const availableAndHealthyModels = activeModelList.filter(m => {
        // 🔧 FIX: Disable strict filtering to ensure models appear on Vercel
        // The previous logic was hiding models that:
        // 1. Weren't in the initial whitelist (enabledModels)
        // 2. Failed the health check (e.g. 429 on free models)

        // We want to show everything for now.
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
                    name: file.name
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

    const handleSendMessage = async () => {
        if (!input.trim() || isGenerating) return;

        let activeChatId = currentChatId;
        let isFirstMessage = false;

        // 1. Create chat if none exists
        if (!activeChatId) {
            const newChat: ChatSession = {
                id: uuidv4(),
                title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
                modelId: selectedModelId,
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
        const messageContent = input;
        const messageAttachments = [...pendingAttachments];
        const capturedTools = { ...activeTools };

        const userMessage: Message = {
            id: uuidv4(),
            role: Role.USER,
            content: messageContent,
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
        if (capturedTools.image) {
            const currentModelCaps = availableAndHealthyModels.find(m => m.id === selectedModelId)?.capabilities;
            if (!currentModelCaps?.imageGeneration) {
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

            // 7. REAL API CALL (UNCOMMENTED AND FIXED)
            const fullResponse = await streamChatResponse(
                apiModelId,
                updatedHistory,
                messageContent,
                (chunk) => {
                    // Update UI on every chunk received
                    setChats(prev => prev.map(c => c.id === activeChatId ? {
                        ...c,
                        messages: c.messages.map(m => m.id === tempAiMessageId ? { ...m, content: m.content + chunk } : m)
                    } : c));
                },
                selectedAgentId ? agents.find(a => a.id === selectedAgentId)?.systemPrompt : undefined,
                { webSearch: capturedTools.web, imageGeneration: capturedTools.image },
                activeChatId,
                userProfile
            );

            console.log('✅ RESPOSTA: Recebida completa');

            // 8. Finalize Message (Remove Streaming flag)
            const aiMessage: Message = {
                id: tempAiMessageId,
                role: Role.MODEL,
                content: fullResponse, // Ensure we use the full response returned
                timestamp: Date.now(),
                modelId: selectedModelId,
                isStreaming: false
            };

            setChats(prev => prev.map(c => c.id === activeChatId ? {
                ...c,
                messages: c.messages.map(m => m.id === tempAiMessageId ? aiMessage : m)
            } : c));

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

    return (
        <div className="flex h-screen bg-background text-textMain font-sans overflow-hidden selection:bg-emerald-500/30">

            {/* Sidebar */}
            <Sidebar
                chats={chats}
                folders={INITIAL_FOLDERS}
                currentChatId={currentChatId}
                onSelectChat={setCurrentChatId}
                onNewChat={handleNewChat}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                onSelectAgent={handleSelectAgent}
                agents={agents}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative h-full w-full">
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
                            <ModelSelector
                                models={availableAndHealthyModels}
                                selectedModelId={selectedModelId}
                                onSelect={handleModelSelect}
                                isDarkMode={isDarkMode}
                            />
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
                                {(selectedAgentId
                                    ? (agents.find(a => a.id === selectedAgentId)?.iceBreakers || []).map(item => ({ title: item, text: '', icon: 'Brain' })) // Adapter for simple strings
                                    : suggestions
                                ).map((item: any, i: number) => {
                                    const IconComponent = ICON_MAP[item.icon] || Brain;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setInput(item.text || item.title)}
                                            className={`relative p-4 rounded-2xl text-left group transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-4 h-full
                                ${isDarkMode
                                                    ? 'bg-[#18181b] hover:bg-[#27272a] shadow-lg hover:shadow-emerald-500/10'
                                                    : 'bg-white border border-gray-100 hover:border-emerald-400 hover:shadow-md'}
                                `}
                                        >
                                            {isDarkMode && <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>}

                                            <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-surfaceHighlight text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                                <IconComponent size={24} />
                                            </div>
                                            <h3 className={`font-bold text-base md:text-lg transition-colors ${isDarkMode ? 'text-textMain group-hover:text-emerald-400' : 'text-textMain'}`}>
                                                {item.title}
                                            </h3>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // Message List
                        <div className="w-full flex-1 pb-48 pt-20">
                            <div className="max-w-3xl mx-auto">
                                {activeChat.messages.map(msg => (
                                    <MessageItem key={msg.id} message={msg} isDarkMode={isDarkMode} />
                                ))}
                            </div>
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </main>

                {/* Input Area (Floating Glass & Carved Input) */}
                <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 z-20 pointer-events-none">
                    <div className="max-w-3xl mx-auto pointer-events-auto">
                        {/* Input Container */}
                        <div className={`rounded-[32px] p-1.5 relative transition-all duration-300 ${isDarkMode ? 'shadow-2xl glass-panel' : ''}`}>

                            {/* Pending Attachments Preview */}
                            {pendingAttachments.length > 0 && (
                                <div className="flex gap-2 px-6 pt-4 pb-2 overflow-x-auto">
                                    {pendingAttachments.map(att => (
                                        <div key={att.id} className="relative group">
                                            {att.type === 'image' ? (
                                                <img src={att.url} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-borderLight" />
                                            ) : (
                                                <div className="h-16 w-16 flex items-center justify-center bg-surfaceHighlight rounded-lg border border-borderLight text-xs text-center p-1">
                                                    {att.name}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => removeAttachment(att.id)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
                                    placeholder={isGenerating ? "Aguarde a resposta..." : "Pergunte algo ao Dr. GPT..."}
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
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <AttachmentMenu
                                                isOpen={isAttachmentMenuOpen}
                                                onClose={() => setIsAttachmentMenuOpen(false)}
                                                isDarkMode={isDarkMode}
                                                triggerRef={attachmentButtonRef}
                                                onSelect={(option) => {
                                                    if (option === 'upload') {
                                                        fileInputRef.current?.click();
                                                    } else if (option === 'web_search') {
                                                        setActiveTools(prev => ({ ...prev, web: !prev.web }));
                                                    } else if (option === 'prompts') {
                                                        setIsPromptsModalOpen(true);
                                                    } else {
                                                        console.log('Selected option:', option);
                                                    }
                                                }}
                                            />
                                            <button
                                                ref={attachmentButtonRef}
                                                onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                                                className={`
                                                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
                                                    ${isAttachmentMenuOpen
                                                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-glow'
                                                        : isDarkMode
                                                            ? 'bg-surface hover:bg-surfaceHighlight text-textMuted hover:text-emerald-400 border-borderLight shadow-convex active:shadow-concave'
                                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent'
                                                    }
                                                `}
                                            >
                                                <IconPlus className="w-3.5 h-3.5" />
                                                <span>Adicionar</span>
                                            </button>
                                        </div>

                                        {(() => {
                                            const currentModel = availableAndHealthyModels.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];
                                            const tools = [
                                                {
                                                    id: 'thinking',
                                                    icon: IconBrain,
                                                    label: 'Pensar',
                                                    show: currentModel.capabilities.reasoning,
                                                    active: activeTools.thinking,
                                                    onClick: () => setActiveTools(prev => ({ ...prev, thinking: !prev.thinking }))
                                                },
                                                {
                                                    id: 'web',
                                                    icon: IconGlobe,
                                                    label: 'Web',
                                                    show: currentModel.capabilities.webSearch,
                                                    active: activeTools.web,
                                                    onClick: () => setActiveTools(prev => ({ ...prev, web: !prev.web }))
                                                },
                                                {
                                                    id: 'image',
                                                    icon: IconImage,
                                                    label: 'Imagem',
                                                    show: currentModel.capabilities.imageGeneration,
                                                    active: activeTools.image,
                                                    onClick: () => setActiveTools(prev => ({ ...prev, image: !prev.image }))
                                                }
                                            ];

                                            return tools.filter(t => t.show).map((tool, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={tool.onClick}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${tool.active
                                                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-glow'
                                                        : isDarkMode
                                                            ? 'bg-surface hover:bg-surfaceHighlight text-textMuted hover:text-emerald-400 border-borderLight shadow-convex active:shadow-concave'
                                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent'
                                                        }`}
                                                >
                                                    <tool.icon />
                                                    <span className="hidden sm:inline">{tool.label}</span>
                                                </button>
                                            ));
                                        })()}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={(!input.trim() && pendingAttachments.length === 0) || isGenerating}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${input.trim() && !isGenerating
                                                ? (isDarkMode ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-glow' : 'bg-black text-white')
                                                : (isDarkMode ? 'bg-surfaceHighlight text-textMuted border border-borderLight' : 'bg-gray-200 text-gray-400')
                                                }`}
                                        >
                                            <IconSend />
                                        </button>
                                    </div>
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
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}