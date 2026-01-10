import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Search, X, MessageSquare, ArrowRight, CornerDownLeft, Clock } from 'lucide-react';
import { ChatSession } from '../types';
import { createPortal } from 'react-dom';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    chats: ChatSession[];
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    isDarkMode: boolean;
}

export default function SearchModal({ isOpen, onClose, chats, onSelectChat, onNewChat, isDarkMode }: SearchModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Auto-focus input when opening
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSearchTerm('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Filter Logic
    const filteredChats = chats.filter(chat =>
        chat.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 50); // Limit results for performance

    // Grouping Logic
    const groupChatsByDate = (chatList: ChatSession[]) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = {
            today: [] as ChatSession[],
            yesterday: [] as ChatSession[],
            previous7Days: [] as ChatSession[],
            older: [] as ChatSession[],
        };

        chatList.forEach(chat => {
            const date = new Date(chat.updatedAt);
            if (date.toDateString() === today.toDateString()) {
                groups.today.push(chat);
            } else if (date.toDateString() === yesterday.toDateString()) {
                groups.yesterday.push(chat);
            } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
                groups.previous7Days.push(chat);
            } else {
                groups.older.push(chat);
            }
        });

        return groups;
    };

    const groupedChats = searchTerm ? { results: filteredChats } : groupChatsByDate(chats);
    const flattenedResults = searchTerm ? filteredChats : [
        { id: 'new-chat-trigger', title: 'Novo chat', isAction: true } as any, // Virtual Item
        ...Object.values(groupedChats).flat()
    ];

    // Navigation Key Logic
    useEffect(() => {
        const handleNavigation = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, flattenedResults.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedItem = flattenedResults[selectedIndex];
                if (selectedItem) {
                    if (selectedItem.isAction) {
                        onNewChat();
                    } else {
                        onSelectChat(selectedItem.id);
                    }
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleNavigation);
        return () => window.removeEventListener('keydown', handleNavigation);
    }, [isOpen, flattenedResults, selectedIndex, onNewChat, onSelectChat, onClose]);

    // Adjust Scroll
    useEffect(() => {
        if (resultsRef.current) {
            const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);


    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 font-sans text-textMain">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`w-full max-w-2xl border rounded-xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[70vh]
                ${isDarkMode ? 'bg-[#1f1f1f] border-white/10' : 'bg-white border-zinc-200 shadow-black/5'}
            `}>

                {/* Header / Input */}
                <div className={`p-3 border-b flex items-center gap-3 ${isDarkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                    <Search className={`w-5 h-5 ml-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar em chats..."
                        className={`flex-1 bg-transparent border-none outline-none text-base h-10 ${isDarkMode ? 'text-white placeholder-zinc-500' : 'text-zinc-800 placeholder-zinc-400'}`}
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                        >
                            <span className={`text-xs mr-1 px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-white/10 border-white/5' : 'bg-zinc-100 border-zinc-200'}`}>ESC</span>
                            <X size={18} className="inline" />
                        </button>
                    </div>
                </div>

                {/* Results List */}
                <div
                    ref={resultsRef}
                    className="flex-1 overflow-y-auto custom-scrollbar p-2"
                >
                    {/* Empty State */}
                    {flattenedResults.length === 0 && (
                        <div className="py-12 text-center text-zinc-500">
                            <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                            <p>Nenhum resultado encontrado.</p>
                        </div>
                    )}

                    {/* New Chat Action (Only if no search or matches search) */}
                    {!searchTerm && (
                        <button
                            onClick={() => { onNewChat(); onClose(); }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg group transition-colors mb-2
                                ${selectedIndex === 0
                                    ? (isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50')
                                    : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-zinc-50')
                                }
                            `}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                ${isDarkMode
                                    ? 'bg-white/10 text-white group-hover:bg-emerald-500'
                                    : 'bg-zinc-100 text-zinc-600 group-hover:bg-emerald-500 group-hover:text-white'
                                }
                            `}>
                                <MessageSquare size={16} />
                            </div>
                            <div className="flex-1 text-left">
                                <div className={`text-sm font-medium ${isDarkMode ? 'text-white group-hover:text-emerald-400' : 'text-zinc-800 group-hover:text-emerald-600'}`}>Novo chat</div>
                            </div>
                            {selectedIndex === 0 && <CornerDownLeft size={16} className="text-emerald-500" />}
                        </button>
                    )}

                    {/* Groups or Clean List */}
                    {flattenedResults.map((item: any, index) => {
                        if (item.isAction) return null;
                        return (
                            <ResultItem
                                key={item.id}
                                chat={item}
                                isSelected={selectedIndex === index}
                                onClick={() => { onSelectChat(item.id); onClose(); }}
                                isDarkMode={isDarkMode}
                            />
                        );
                    })}

                </div>

                {/* Footer Tips */}
                <div className={`p-2 border-t flex justify-between items-center text-[10px] px-4
                    ${isDarkMode ? 'border-white/5 bg-black/20 text-zinc-500' : 'border-zinc-100 bg-zinc-50/50 text-zinc-400'}
                `}>
                    <div className="flex gap-4">
                        <span><strong className={isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}>↑↓</strong> para navegar</span>
                        <span><strong className={isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}>↵</strong> para selecionar</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

function ResultItem({ chat, isSelected, onClick, isDarkMode }: { chat: ChatSession, isSelected: boolean, onClick: () => void, isDarkMode: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg group transition-colors
                ${isSelected
                    ? (isDarkMode ? 'bg-white/10' : 'bg-zinc-100')
                    : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-zinc-50')
                }
            `}
        >
            <div className={`shrink-0 ${isSelected ? 'text-emerald-500' : 'text-zinc-500'}`}>
                <Clock size={16} />
            </div>
            <div className="flex-1 text-left overflow-hidden">
                <div className={`text-sm truncate ${isSelected
                    ? (isDarkMode ? 'text-white font-medium' : 'text-zinc-900 font-medium')
                    : (isDarkMode ? 'text-zinc-300' : 'text-zinc-700')
                    }`}>
                    {chat.title}
                </div>
                <div className={`text-xs truncate ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {new Date(chat.updatedAt).toLocaleDateString()}
                </div>
            </div>
            {isSelected && <CornerDownLeft size={14} className="text-zinc-500" />}
        </button>
    );
}
