import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChatSession, Message, Role, AIModel, PendingAttachment, Agent, AppMode } from '../../types';
import MessageItem from '../../components/MessageItem';
import ModelSelector from '../../components/ModelSelector';
import AttachmentMenu from '../../components/AttachmentMenu';
import PromptsModal from '../../components/PromptsModal';
import { useChat } from '../contexts/ChatContext';
import {
    IconMenu, IconSend, IconAttachment, IconGlobe, IconImage, IconBrain, IconPlus, IconCreditCard, IconFile, IconCheck, IconAlertTriangle
} from '../../components/Icons';
import { Menu, Check, Mic, Plus, Globe, Image, Send, Edit, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ChatPageProps {
    isDarkMode: boolean;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    activeMode: AppMode;

    user: any;



    // Mic Props
    handleMicClick: () => void;
    isListening: boolean;
    hasMicSupport: boolean;
}

export default function ChatPage({
    isDarkMode,
    sidebarOpen,
    setSidebarOpen,
    activeMode,

    user,

    handleMicClick,
    isListening,
    hasMicSupport
}: ChatPageProps) {
    const {
        activeChat,
        isGenerating,
        input,
        setInput,
        sendMessage,
        pendingAttachments,
        setPendingAttachments,
        removeAttachment,
        addPendingAttachment,
        activeTools,
        toggleTool,
        textareaRef
    } = useChat();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentButtonRef = useRef<HTMLButtonElement>(null);

    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
    const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Handlers moved from App.tsx
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = () => {
        if (input.trim() || pendingAttachments.length > 0) {
            sendMessage(input, 'medpilot-1');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                processFile(file);
            });
            // Reset input
            e.target.value = '';
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.clipboardData.files.length > 0) {
            e.preventDefault();
            Array.from(e.clipboardData.files).forEach(file => {
                processFile(file);
            });
        }
    };

    const processFile = (file: File) => {
        // Validate type if needed
        const isImage = file.type.startsWith('image/');
        const previewUrl = URL.createObjectURL(file);

        addPendingAttachment({
            id: crypto.randomUUID(),
            type: isImage ? 'image' : 'file',
            url: previewUrl, // Temporary blob URL
            previewUrl: previewUrl,
            mimeType: file.type,
            name: file.name,
            file: file
        });
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(file => {
                processFile(file);
            });
        }
    }, []);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    // Derived State
    const messages = activeChat ? activeChat.messages : [];


    // Helper to render icons for suggestions


    return (
        <>
            {/* Background Mesh Gradient Subtle - Dark Mode Only */}
            {isDarkMode && (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-background to-background pointer-events-none z-0" />
            )}

            {/* Top Floating Header - Minimalist & Glass */}
            <header className="absolute top-0 left-0 right-0 h-16 md:h-20 flex items-center justify-between px-4 md:px-8 z-10 pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto w-full justify-between max-w-5xl mx-auto">
                    {/* Mobile Menu */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="md:hidden p-2.5 rounded-xl bg-surface/50 backdrop-blur-xl text-textMuted hover:text-textMain border border-white/10 shadow-lg active:scale-95 transition-all"
                    >
                        <IconMenu className="w-5 h-5" />
                    </button>

                    {/* Model Badge - Reverted to Original Style */}
                    <div className="pointer-events-auto">
                        <div className={`relative group shadow-2xl rounded-xl`}>
                            {(activeMode === 'scribe' || activeMode === 'scribe-review') ? (
                                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 backdrop-blur-md shadow-sm ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white border-emerald-100'}`}>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className={`font-semibold text-xs md:text-sm tracking-wide ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        Clinical-Pro v1.0
                                    </span>
                                </div>
                            ) : (
                                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 backdrop-blur-md shadow-sm ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-white border-indigo-100'}`}>
                                    <span className="relative flex h-2 w-2">
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                    <span className={`font-semibold text-xs md:text-sm tracking-wide ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                        Medpilot 1
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto scroll-smooth relative flex flex-col items-center custom-scrollbar z-0">
                {/* TRIAL BANNER - ACTIVE */}
                {user?.trial_status === 'active' && user?.trial_ends_at && new Date(user.trial_ends_at) > new Date() && (
                    <div className="absolute top-20 left-0 right-0 z-10 px-4 pointer-events-none">
                        <div className="max-w-2xl mx-auto bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md p-3 rounded-xl flex items-center justify-between pointer-events-auto shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500">
                                    <IconCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                        Conta de Teste Ativa
                                    </p>
                                    <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                        Expira em {Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => window.open('https://checkout.stripe.com/c/pay/...', '_blank')}
                                className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                            >
                                Assinar Agora
                            </button>
                        </div>
                    </div>
                )}

                {!activeChat || activeChat.messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-6 mt-10 md:mt-0 relative">
                        {/* Background Decor */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-700 relative z-0">
                            <div className={`
                                mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl rotate-3 transition-transform hover:rotate-6
                                ${isDarkMode ? 'bg-gradient-to-br from-zinc-800 to-black border border-white/5' : 'bg-white border border-slate-100'}
                            `}>
                                <IconBrain className={`w-10 h-10 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                                    <span className={`bg-clip-text text-transparent ${isDarkMode ? 'bg-gradient-to-b from-white to-white/60' : 'bg-gradient-to-b from-slate-900 to-slate-600'}`}>
                                        Olá, Doutor(a)
                                    </span>
                                </h2>
                                <p className={`max-w-lg mx-auto text-lg md:text-xl font-light leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                    Estou pronto para auxiliar com casos clínicos, pesquisas e transcrições hoje.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-3xl px-2 md:px-0 pt-24 pb-48 space-y-6">
                        {messages.map((message) => (
                            <MessageItem
                                key={message.id}
                                message={message}
                                isDarkMode={isDarkMode}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                        {isGenerating && messages.length > 0 && messages[messages.length - 1].role === Role.USER && (
                            <div className="w-full animate-in fade-in duration-500">
                                <div className="m-auto w-full max-w-3xl px-4">
                                    <div className="flex items-center gap-1 py-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </main>

            {/* Bottom Input Area - Floating Capsule */}
            <footer className="absolute bottom-0 left-0 right-0 px-4 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-20 pointer-events-none flex justify-center">
                <div className={`
                    w-full max-w-3xl pointer-events-auto transition-all duration-300
                    flex flex-col gap-2 p-1.5 rounded-[28px] border relative shadow-2xl
                    ${isDragging ? 'border-emerald-500 bg-emerald-500/10 scale-105' :
                        isDarkMode ? 'bg-black/60 border-white/10 shadow-black/80 backdrop-blur-xl' :
                            'bg-white/80 border-white/40 shadow-xl backdrop-blur-xl'}
                `}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                            // File drop logic would go here
                        }
                    }}
                >
                    {/* Pending Attachments */}
                    {pendingAttachments.length > 0 && (
                        <div className="flex gap-2 px-3 py-2 overflow-x-auto custom-scrollbar border-b border-white/5 mx-2 mb-1">
                            {pendingAttachments.map((att) => (
                                <div key={att.id} className="relative group shrink-0 animate-in zoom-in duration-200">
                                    <div className="w-14 h-14 rounded-xl border border-white/10 bg-black/20 overflow-hidden relative">
                                        {att.type === 'image' ? (
                                            <img src={att.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-xs text-textMuted">
                                                <IconFile className="w-5 h-5 mb-1 opacity-50" />
                                                <span className="uppercase text-[9px] truncate w-10 text-center">{att.file.name.split('.').pop()}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => removeAttachment(pendingAttachments.findIndex(p => p.id === att.id))}
                                            className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end gap-2 pl-2 pr-2 min-h-[52px]">
                        {/* Attach Button */}
                        <div className="relative pb-1.5">
                            <button
                                ref={attachmentButtonRef}
                                onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                                className={`
                                    flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 
                                    ${isAttachmentMenuOpen ? 'rotate-45 bg-emerald-500 text-white' :
                                        isDarkMode ? 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white' :
                                            'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}
                                `}
                            >
                                <Plus size={22} className="stroke-[2.5]" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                multiple
                            />
                            <AttachmentMenu
                                isOpen={isAttachmentMenuOpen}
                                onClose={() => setIsAttachmentMenuOpen(false)}
                                triggerRef={attachmentButtonRef}
                                onSelect={(type) => {
                                    setIsAttachmentMenuOpen(false);
                                    if (type === 'document' || type === 'image') {
                                        fileInputRef.current?.click();
                                    } else if (type === 'camera') {
                                        toast('Câmera em breve!', { icon: '📷' });
                                    }
                                }}
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* Text Area */}
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={isListening ? "Ouvindo..." : activeMode === 'scribe' ? "Modo Transcrição..." : "Digite uma mensagem..."}
                            className={`
                                flex-1 max-h-40 min-h-[44px] py-3.5 px-2 rounded-xl resize-none outline-none text-[15px] leading-relaxed
                                font-medium placeholder-textMuted/60 bg-transparent
                                ${isDarkMode ? 'text-white' : 'text-slate-800'}
                                custom-scrollbar
                            `}
                            rows={1}
                            style={{ height: 'auto' }}
                        />

                        {/* Right Actions - Mic or Send */}
                        <div className="flex items-center gap-2 pb-1.5">
                            {!input.trim() && pendingAttachments.length === 0 ? (
                                <button
                                    onClick={handleMicClick}
                                    className={`
                                        flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                                        ${isListening
                                            ? 'bg-red-500 text-white animate-pulse scale-110 shadow-glow-red'
                                            : isDarkMode ? 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                                    `}
                                    title="Gravar áudio"
                                >
                                    {isListening ? (
                                        <div className="w-4 h-4 rounded-sm bg-white animate-spin" />
                                    ) : (
                                        <Mic size={20} className="stroke-[2.5]" />
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSend()}
                                    disabled={isGenerating}
                                    className={`
                                        flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
                                        bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/20 hover:scale-105 active:scale-95
                                    `}
                                >
                                    <IconSend className="w-5 h-5 ml-0.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <PromptsModal
                    isOpen={isPromptsModalOpen}
                    onClose={() => setIsPromptsModalOpen(false)}
                    onSelectPrompt={(content) => setInput(content)}
                    isDarkMode={isDarkMode}
                />
            </footer>
        </>
    );
}
