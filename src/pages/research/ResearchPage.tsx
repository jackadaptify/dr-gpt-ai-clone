import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, Plus, User, Bot, Search } from 'lucide-react';
import ResearchMessageItem from './ResearchMessageItem';
import ResearchResults from './ResearchResults';
import { streamResearchChat, ResearchMessage as APIResearchMessage } from './services/researchService';

interface ResearchPageProps {
    isDarkMode: boolean;
    user: any;
}

interface ResearchMessage {
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: number;
    results?: any[]; // Allow attaching results to a message
}

export default function ResearchPage({ isDarkMode, user }: ResearchPageProps) {
    const [messages, setMessages] = useState<ResearchMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);



    // ... (inside component)

    const handleSearch = async () => {
        if (!input.trim() || isSearching) return;

        const userContent = input;
        const userMsg: any = { // ID for UI, mapped to ResearchMessage for API
            id: crypto.randomUUID(),
            role: 'user',
            content: userContent,
            timestamp: Date.now()
        };

        // UI Updates
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsSearching(true);

        // Placeholder for AI response
        const aiMsgId = crypto.randomUUID();
        const aiMsgPlaceholder: any = {
            id: aiMsgId,
            role: 'model',
            content: '',
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsgPlaceholder]);

        try {
            // Prepare history for API (strip IDs/timestamps)
            const apiHistory: APIResearchMessage[] = messages.map(m => ({
                role: m.role as 'user' | 'model',
                content: m.content
            }));
            apiHistory.push({ role: 'user', content: userContent });

            let fullContent = '';

            await streamResearchChat(apiHistory, (chunk) => {
                fullContent += chunk;
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId
                        ? { ...msg, content: fullContent }
                        : msg
                ));
            });

        } catch (error) {
            console.error(error);
            setMessages(prev => prev.map(msg =>
                msg.id === aiMsgId
                    ? { ...msg, content: "Erro ao conectar com o serviço de pesquisa. Tente novamente." }
                    : msg
            ));
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Background Mesh (Dark Mode) */}
            {isDarkMode && (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-background to-background pointer-events-none z-0" />
            )}

            {/* Header */}
            <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 z-10 pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 backdrop-blur-md shadow-sm ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-white border-indigo-100'}`}>
                        <Search className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <span className={`font-semibold text-xs md:text-sm tracking-wide ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            Medical Research
                        </span>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto scroll-smooth relative flex flex-col items-center custom-scrollbar z-0 pt-20 pb-40">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-4 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl mb-6">
                            <Search className="text-white w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-bold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            Pesquisa Médica Avançada
                        </h2>
                        <p className={`text-center text-lg max-w-md ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            Busque em bases científicas, guidelines e protocolos clínicos em tempo real.
                        </p>
                    </div>
                ) : (
                    <div className="w-full max-w-3xl px-2 md:px-0 space-y-2">
                        {messages.map((msg) => (
                            <div key={msg.id}>
                                <ResearchMessageItem
                                    role={msg.role}
                                    content={msg.content}
                                    isDarkMode={isDarkMode}
                                    timestamp={msg.timestamp}
                                />
                                {msg.results && (
                                    <div className="pl-16 pr-4 pb-4 max-w-3xl mx-auto">
                                        <ResearchResults results={msg.results} isDarkMode={isDarkMode} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isSearching && (
                            <div className="flex justify-start w-full max-w-3xl mx-auto px-4 py-2">
                                <div className="flex items-center gap-2 text-indigo-500 animate-pulse bg-indigo-500/10 px-4 py-2 rounded-xl">
                                    <Search className="w-4 h-4 animate-spin" />
                                    <span className="text-xs font-medium">Pesquisando nas bases de dados...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </main>

            {/* Input Area */}
            <footer className="absolute bottom-0 left-0 right-0 p-4 z-20 pointer-events-none flex justify-center">
                <div className={`
                    w-full max-w-3xl pointer-events-auto transition-all duration-300
                    flex items-end gap-2 p-2 rounded-[2rem] border shadow-2xl relative
                    ${isDarkMode ? 'bg-surface/90 border-white/10 shadow-black/50' : 'bg-white/90 border-slate-200 shadow-xl'}
                    backdrop-blur-xl
                `}>
                    <button className={`
                        p-3 rounded-full transition-all duration-200 hover:rotate-90 
                        ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}
                    `}>
                        <Plus size={20} />
                    </button>

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Pesquise por condições, tratamentos ou protocolos..."
                        className={`
                            flex-1 max-h-48 min-h-[50px] py-3.5 px-4 rounded-xl resize-none outline-none text-base leading-relaxed
                            font-sans placeholder-textMuted bg-transparent
                            ${isDarkMode ? 'text-white' : 'text-slate-900'}
                            custom-scrollbar
                        `}
                        rows={1}
                    />

                    <button
                        onClick={handleSearch}
                        disabled={isSearching || !input.trim()}
                        className={`
                            p-3 rounded-full transition-all duration-200
                            ${(input.trim() && !isSearching)
                                ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-500'
                                : isDarkMode ? 'bg-zinc-800 text-zinc-600' : 'bg-slate-100 text-slate-300'}
                        `}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </footer>
        </div>
    );
}
