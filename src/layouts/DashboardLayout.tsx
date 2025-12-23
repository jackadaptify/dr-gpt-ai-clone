import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { projectService } from '../../services/projectService';
import { streamChatResponse, saveMessage, updateChat, createChat } from '../../services/chatService';
import { Folder, AppMode, Message, Role, ChatSession, AVAILABLE_MODELS } from '../../types';
import { Toaster, toast } from 'react-hot-toast';
import SettingsModal from '../../components/SettingsModal';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'; // Added import

export default function DashboardLayout() {
    const { user, signOut } = useAuth();
    const {
        chats,
        currentChatId,
        selectChat,
        createNewChat: contextCreateNewChat,
        updateChatTitle,
        deleteChatSession,
        input,
        setInput
    } = useChat();

    const location = useLocation();
    const navigate = useNavigate();

    // Local UI State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [settingsTab, setSettingsTab] = useState<'profile' | 'subscription' | 'appearance' | 'security'>('profile');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [selectedModelId, setSelectedModelId] = useState<string>(AVAILABLE_MODELS[0].id);

    // Scribe State & Speech
    const [scribeContent, setScribeContent] = useState('');
    const [typewriterTrigger, setTypewriterTrigger] = useState<{ content: string; timestamp: number } | null>(null);
    const [reviewTitle, setReviewTitle] = useState('Revisão de Prontuário');
    const [isScribeReview, setIsScribeReview] = useState(false);

    // Speech Recognition
    const { isListening, transcript, toggleListening, hasSupport: hasMicSupport } = useSpeechRecognition();
    const [textBeforeRecording, setTextBeforeRecording] = useState('');

    useEffect(() => {
        if (isListening) {
            // If input is controlled by context, we update it
            setInput(textBeforeRecording + (textBeforeRecording && transcript ? ' ' : '') + transcript);
        }
    }, [transcript, isListening, textBeforeRecording, setInput]);

    const handleMicClick = () => {
        if (!isListening) {
            setTextBeforeRecording(input);
        }
        toggleListening();
    };

    // Dark Mode Effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    // Projects
    useEffect(() => {
        if (user?.id) {
            projectService.getProjects().then(setFolders);
        }
    }, [user?.id]);

    // Active Mode Logic
    const getActiveMode = (): AppMode => {
        const path = location.pathname;
        if (path.startsWith('/research')) return 'research';
        if (path.startsWith('/transcribe')) return isScribeReview ? 'scribe-review' : 'scribe';
        if (path.startsWith('/settings')) return 'settings';
        if (path.startsWith('/admin')) return 'admin';
        return 'chat'; // /copilot
    };

    const activeMode = getActiveMode();

    // Scribe Generation Logic
    const handleScribeGenerate = async (consultation: string, thoughts: string, patientName: string, patientGender: string, audioBlob: Blob | undefined, scenario = 'evolution') => {
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

        try {
            await createChat(newChat);
            selectChat(newChatId);
            setSelectedModelId(scribeModelId);

            const welcomeMsg: Message = {
                id: uuidv4(),
                role: Role.MODEL,
                content: "Consulta processada. Precisa de algum ajuste ou documento extra (atestado/encaminhamento)?",
                timestamp: Date.now(),
                modelId: scribeModelId
            };
            await saveMessage(newChatId, welcomeMsg);

            setIsScribeReview(true);
            setReviewTitle(scenario === 'anamnesis' ? 'Anamnese Completa' : scenario === 'bedside' ? 'Evolução Beira-Leito' : 'Evolução Clínica');
            setScribeContent('Processando dados da consulta...\n\nGerando Documentação...');
            navigate('/transcribe');

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

            const commonInstructions = `TASK: Gere o documento médico baseado no áudio/texto e na NOTA TÉCNICA.\n\n${scenarioInstruction}\n\nREGRA: Gere SEMPRE o documento completo. Receita/Atestado apenas se solicitado no texto. FORMATO: Texto pronto para copiar.`;
            const finalPrompt = audioUrl
                ? `[AUDIO MODE] URL: ${audioUrl}\nNOTA: "${thoughts}"\nCONTEXTO: ${patientContext}\n${commonInstructions}`
                : `[TEXT MODE] TRANSCRIPT: "${consultation}"\nNOTA: "${thoughts}"\nCONTEXTO: ${patientContext}\n${commonInstructions}`;

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

        } catch (e) {
            setScribeContent('Erro ao gerar prontuário.');
            console.error(e);
        }
    };

    // Save Scribe Note
    const handleScribeSave = async () => {
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
    };

    // Updated Handlers for Navigation
    const handleModeChange = (mode: AppMode) => {
        if (mode !== 'scribe' && mode !== 'scribe-review') {
            setIsScribeReview(false);
        }

        switch (mode) {
            case 'chat': navigate('/copilot'); break;
            case 'research': navigate('/research'); break;
            case 'scribe': navigate('/transcribe'); break;
            case 'settings': navigate('/settings'); break;
            case 'admin': window.open('/admin', '_blank'); break;
            default: navigate('/copilot');
        }
    };

    const handleCreateProject = async (name: string) => {
        const { project, error } = await projectService.createProject(name);
        if (project) {
            setFolders(prev => [...prev, project]);
        } else if (error) {
            console.error('Project creation failed:', error);
            alert(`Falha ao criar projeto: ${error.message}`);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (await projectService.deleteProject(projectId)) {
            setFolders(prev => prev.filter(f => f.id !== projectId));
            toast.success('Projeto excluído com sucesso');
        } else {
            toast.error('Erro ao excluir projeto');
        }
    };

    const handleNewChat = () => {
        if (activeMode === 'chat') {
            contextCreateNewChat(undefined, selectedModelId);
            navigate('/copilot');
        } else if (activeMode === 'scribe') {
            setIsScribeReview(false);
            setScribeContent('');
            navigate('/transcribe');
        }
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    return (
        <div className="flex h-[100dvh] bg-background text-textMain font-sans overflow-hidden selection:bg-emerald-500/30">
            {activeMode !== 'scribe-review' && activeMode !== 'admin' && (
                <Sidebar
                    chats={chats}
                    folders={folders}
                    currentChatId={currentChatId}
                    activeMode={activeMode}
                    onModeChange={handleModeChange}
                    onSelectChat={(id) => {
                        selectChat(id);
                        const chat = chats.find(c => c.id === id);
                        if (chat?.agentId === 'scribe-mode') {
                            setIsScribeReview(true);
                            navigate('/transcribe');

                            // Restoration Logic
                            const lastDocMessage = [...chat.messages]
                                .reverse()
                                .find(m => m.role === Role.MODEL && m.content.length > 50 && !m.content.includes("Precisa de algum ajuste"));

                            if (lastDocMessage) {
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
                                setScribeContent('Carregando prontuário...');
                            }
                        }
                    }}
                    onNewChat={handleNewChat}
                    isOpen={sidebarOpen}
                    setIsOpen={setSidebarOpen}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    onCreateProject={handleCreateProject}
                    onAssignChatToProject={(chatId, pid) => projectService.assignChatToProject(chatId, pid)}
                    onRenameChat={(id, title) => updateChatTitle(id, title)}
                    onDeleteChat={(id) => deleteChatSession(id)}
                    onDeleteProject={handleDeleteProject}
                    settingsTab={settingsTab}
                    onSettingsTabChange={setSettingsTab}
                />
            )}

            <div className="flex-1 flex flex-col relative h-full w-full">
                <Outlet context={{
                    isDarkMode,
                    toggleTheme,
                    settingsTab,
                    setSettingsTab,
                    sidebarOpen,
                    setSidebarOpen,
                    selectedModelId,
                    setSelectedModelId,
                    scribeContent,
                    setScribeContent,
                    typewriterTrigger,
                    setTypewriterTrigger,
                    reviewTitle,
                    setReviewTitle,
                    isScribeReview,
                    setIsScribeReview,
                    handleScribeGenerate,
                    handleScribeSave,
                    navigate,
                    handleNewChat,
                    // Speech properties
                    handleMicClick,
                    isListening,
                    hasMicSupport,
                    user // Pass User!
                }} />

                <SettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                />
            </div>
        </div>
    );
}
