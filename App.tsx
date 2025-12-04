import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MessageItem from './components/MessageItem';
import { ChatSession, Message, Role, AVAILABLE_MODELS, Folder, Agent, AVAILABLE_AGENTS, Attachment, AIModel } from './types';
import { streamChatResponse, saveMessage, loadChatHistory, createChat, updateChat } from './services/chatService';
import { fetchOpenRouterModels, OpenRouterModel } from './services/openRouterService';
import { agentService } from './services/agentService';
import { IconMenu, IconSend, IconAttachment, IconGlobe, IconImage, IconBrain } from './components/Icons';
import { v4 as uuidv4 } from 'uuid';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
// import { chatStorage } from './services/chatStorage'; // Removed for Supabase
import AdminPage from './components/Admin/AdminPage';
import { modelHealthService, ModelHealth } from './services/modelHealthService';
import { supabase } from './lib/supabase';
import ModelSelector from './components/ModelSelector';

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

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        // STRICT CURATION: Only show models that are in the enabledModels list
        // If enabledModels is empty (first run), we might want to show defaults or nothing.
        // Let's assume if it's empty, we show nothing or a default set.
        // But the requirement is "Whitelist". So if it's not in the list, it's out.

        const isEnabled = enabledModels.includes(m.id);
        if (!isEnabled) return false;

        const health = modelHealth.find(h => h.id === m.id || h.id === m.modelId);
        const isHealthy = health ? health.status !== 'offline' : true;
        return isHealthy;
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
        if (session?.user) {
            loadChatHistory(session.user.id).then(loadedChats => {
                setChats(loadedChats);
                if (loadedChats.length > 0) {
                    // Optional: Select first chat or none
                }
            });

            // Load active agents
            agentService.getActiveAgents().then(setAgents).catch(console.error);
        }
    }, [session]);

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

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
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

        // Create chat if none exists
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

        // Capture input and attachments before clearing
        const messageContent = input;
        const messageAttachments = [...pendingAttachments];

        const userMessage: Message = {
            id: uuidv4(),
            role: Role.USER,
            content: messageContent,
            timestamp: Date.now(),
            attachments: messageAttachments,
            modelId: selectedModelId // Track model
        };

        // CRITICAL: Clear input, attachments, and activeTools IMMEDIATELY
        setInput('');
        setPendingAttachments([]);
        setActiveTools({ web: false, image: false, thinking: false }); // Reset tools NOW
        setIsGenerating(true);

        // Save User Message to Supabase
        if (activeChatId) {
            saveMessage(activeChatId, userMessage);
        }

        const tempAiMessageId = uuidv4();
        const aiPlaceholderMessage: Message = {
            id: tempAiMessageId,
            role: Role.MODEL,
            content: '',
            timestamp: Date.now(),
            isStreaming: true,
            modelId: selectedModelId // Track model
        };

        // Optimistic update
        setChats(prev => prev.map(chat => {
            if (chat.id === activeChatId) {
                return {
                    ...chat,
                    title: isFirstMessage ? (input.slice(0, 30) + (input.length > 30 ? '...' : '')) : chat.title,
                    messages: [...chat.messages, userMessage, aiPlaceholderMessage],
                    updatedAt: Date.now()
                };
            }
            return chat;
        }));

        // Determine Model ID based on Active Tools
        let targetModelId = selectedModelId;
        if (activeTools.image) {
            // Check if current model supports image generation
            const currentModelCaps = availableAndHealthyModels.find(m => m.id === selectedModelId)?.capabilities;
            if (!currentModelCaps?.imageGeneration) {
                // Fallback to a valid image generation model
                targetModelId = 'google/gemini-2.0-flash-exp:free'; // Gemini 2.0 Flash supports image generation
            }
        }

        try {
            const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId);
            const provider = currentModel?.provider || 'Google';

            // Resolve Internal ID to API Model ID
            // For dynamic models, selectedModelId is already the API ID (e.g. google/gemini...)
            // For static models, we might need to look it up, but our new logic sets id = modelId for dynamic ones.
            // However, let's keep the lookup for safety if we fallback to static.
            const targetModelDef = availableAndHealthyModels.find(m => m.id === targetModelId);
            const apiModelId = targetModelDef?.modelId || targetModelId;

            // Generate AI response
            // Read User Settings from LocalStorage (Frontend Source of Truth)
            const userProfile = {
                nickname: localStorage.getItem('drgpt_nickname') || undefined,
                specialty: localStorage.getItem('drgpt_specialty') === 'Outra'
                    ? localStorage.getItem('drgpt_other_specialty') || undefined
                    : localStorage.getItem('drgpt_specialty') || undefined,
                goal: localStorage.getItem('drgpt_focus') || undefined,
                customInstructions: localStorage.getItem('drgpt_preference') || undefined
            };

            const currentChatMessages = chats.find(c => c.id === activeChatId)?.messages || [];
            const updatedHistory = [...currentChatMessages, userMessage];

            const fullResponse = await streamChatResponse(
                apiModelId,
                updatedHistory,
                messageContent, // ✅ Use captured content, not cleared input!
                (chunk) => {
                    setChats(prev => prev.map(c => c.id === activeChatId ? {
                        ...c,
                        messages: c.messages.map(m => m.id === tempAiMessageId ? { ...m, content: m.content + chunk } : m)
                    } : c));
                },
                selectedAgentId ? agents.find(a => a.id === selectedAgentId)?.systemPrompt : undefined,
                { webSearch: activeTools.web, imageGeneration: activeTools.image },
                activeChatId,
                userProfile // Pass the profile data
            );

            // Save AI message
            const aiMessage: Message = {
                id: tempAiMessageId,
                role: Role.MODEL,
                content: fullResponse,
                timestamp: Date.now(),
                modelId: selectedModelId
            };

            // Final update to remove streaming flag and ensure content is correct
            setChats(prev => prev.map(c => c.id === activeChatId ? {
                ...c,
                messages: c.messages.map(m => m.id === tempAiMessageId ? { ...aiMessage, isStreaming: false } : m)
            } : c));

            // Persist chat
            const updatedChat = chats.find(c => c.id === activeChatId);
            if (updatedChat) {
                // Manually construct the updated chat object to ensure we save the latest state
                const chatToSave = {
                    ...updatedChat,
                    messages: [...updatedChat.messages, userMessage, { ...aiPlaceholderMessage, content: fullResponse, isStreaming: false }]
                };
                // Messages are saved individually via saveMessage and streamChatResponse
                // We only need to update the title if it changed (which happens on first message)
                if (isFirstMessage) {
                    updateChat(activeChatId, { title: chatToSave.title, updatedAt: Date.now() });
                } else {
                    updateChat(activeChatId, { updatedAt: Date.now() });
                }
            }

        } catch (error) {
            console.error('Error generating response:', error);
            setChats(prev => prev.map(c => c.id === activeChatId ? {
                ...c,
                messages: c.messages.map(m => m.id === tempAiMessageId ? { ...m, content: "Desculpe, ocorreu um erro ao processar sua solicitação.", isStreaming: false } : m)
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
                            <div className="relative w-24 h-24 mb-8 group cursor-default">
                                {/* 3D Logo Effect - Dark Mode Only */}
                                {isDarkMode && <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>}
                                <div className={`relative w-full h-full rounded-3xl flex items-center justify-center ${isDarkMode ? 'bg-surfaceHighlight shadow-card-3d border-t border-borderLight' : 'bg-surfaceHighlight'}`}>
                                    {isDarkMode && <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>}
                                    {/* Show Agent Icon if selected, else Dr. GPT Logo */}
                                    {selectedAgentId ? (
                                        agents.find(a => a.id === selectedAgentId)?.avatarUrl ? (
                                            <img
                                                src={agents.find(a => a.id === selectedAgentId)?.avatarUrl}
                                                alt="Agent Avatar"
                                                className="w-full h-full rounded-3xl object-cover"
                                            />
                                        ) : (
                                            <div className={`w-full h-full rounded-3xl flex items-center justify-center bg-gradient-to-br ${agents.find(a => a.id === selectedAgentId)?.color || 'from-emerald-500 to-teal-500'}`}>
                                                <IconBrain className="w-12 h-12 text-white" />
                                            </div>
                                        )
                                    ) : (
                                        <span className={`text-5xl font-black bg-clip-text text-transparent drop-shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-textMain to-textMuted' : 'bg-textMain'}`}>D</span>
                                    )}
                                </div>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-bold text-textMain mb-6 tracking-tight drop-shadow-2xl">
                                {selectedAgentId ? agents.find(a => a.id === selectedAgentId)?.name : 'DR'} <span className={`text-transparent bg-clip-text ${isDarkMode ? 'bg-gradient-to-r from-emerald-400 to-teal-200' : 'bg-textMain'}`}>{!selectedAgentId && 'GPT'}</span>
                            </h2>
                            <p className="text-lg text-textMuted mb-12 max-w-xl leading-relaxed font-medium">
                                {selectedAgentId ? agents.find(a => a.id === selectedAgentId)?.description : 'Seu hub de inteligência avançada.'}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
                                {(selectedAgentId
                                    ? (agents.find(a => a.id === selectedAgentId)?.iceBreakers || [])
                                    : [
                                        "Resuma este documento para mim",
                                        "Crie um roadmap de produto SaaS",
                                        "Escreva um post para LinkedIn sobre IA",
                                        "Me dê 10 ideias de nomes para um app"
                                    ]
                                ).map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(item)}
                                        className={`relative p-6 rounded-2xl text-left group transition-all duration-300 transform hover:-translate-y-1
                                ${isDarkMode
                                                ? 'bg-surface border border-borderLight shadow-card-3d hover:shadow-card-3d-hover'
                                                : 'bg-surface border border-borderLight hover:border-gray-300 hover:shadow-sm'}
                                `}
                                    >
                                        {isDarkMode && <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>}
                                        <h3 className={`font-bold mb-1.5 text-base transition-colors ${isDarkMode ? 'text-textMain group-hover:text-emerald-400 drop-shadow-md' : 'text-textMain'}`}>{item}</h3>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Message List
                        <div className="w-full flex-1 pb-48 pt-20">
                            {activeChat.messages.map(msg => (
                                <MessageItem key={msg.id} message={msg} isDarkMode={isDarkMode} />
                            ))}
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
                            <div className={`relative rounded-[28px] overflow-hidden ${isDarkMode ? 'bg-surfaceHighlight shadow-inner-depth border border-borderLight' : 'bg-surface border border-borderLight shadow-sm'}`}>
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isGenerating ? "Aguarde a resposta..." : "Pergunte algo ao Dr. GPT..."}
                                    className={`w-full bg-transparent text-textMain placeholder-textMuted text-[15px] md:text-base px-6 py-4 max-h-48 overflow-y-auto resize-none outline-none transition-opacity duration-200 ${isGenerating ? 'opacity-60 cursor-wait' : 'opacity-100'}`}
                                    rows={1}
                                    style={{ minHeight: '60px' }}
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
                                        {(() => {
                                            const currentModel = availableAndHealthyModels.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];
                                            if (currentModel.capabilities.vision || currentModel.capabilities.upload) {
                                                return (
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="p-2 text-textMuted hover:text-textMain transition-colors"
                                                    >
                                                        <IconAttachment />
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })()}
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