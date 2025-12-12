import React, { useState, useRef, useEffect } from 'react';
import {
    FileText,
    Globe,
    Image,
    Sparkles,
    Share2,
    Search
} from 'lucide-react';

interface ToolsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (option: string) => void;
    isDarkMode: boolean;
    triggerRef: React.RefObject<HTMLButtonElement>;
}

export default function ToolsMenu({ isOpen, onClose, onSelect, isDarkMode, triggerRef }: ToolsMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    const menuItems = [
        {
            id: 'summary_pdf',
            label: 'Resumir PDF/Artigo',
            icon: FileText,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10'
        },


        {
            id: 'improve_prompt',
            label: 'Melhorar Prompt',
            icon: Sparkles,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10'
        },
        {
            id: 'create_content',
            label: 'Criar Post/Email',
            icon: Share2,
            color: 'text-pink-500',
            bgColor: 'bg-pink-500/10'
        }
    ];

    return (
        <div
            ref={menuRef}
            className={`
                absolute bottom-full left-0 mb-4 w-72 rounded-2xl shadow-2xl border overflow-hidden z-50
                animate-in fade-in zoom-in-95 duration-200 origin-bottom-left
                ${isDarkMode
                    ? 'bg-[#18181b] border-white/10 text-zinc-200'
                    : 'bg-white border-gray-200 text-gray-700'}
            `}
        >
            <div className="p-2 space-y-1">
                <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Ferramentas de Texto
                </div>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            onSelect(item.id);
                            onClose();
                        }}
                        className={`
                            w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                            ${isDarkMode
                                ? 'hover:bg-white/5 hover:text-white'
                                : 'hover:bg-gray-50 hover:text-black'}
                        `}
                    >
                        <div className={`
                            p-2 rounded-lg shrink-0
                            ${isDarkMode ? item.bgColor : 'bg-gray-100'}
                        `}>
                            <item.icon className={`w-4 h-4 ${isDarkMode ? item.color : 'text-gray-600'}`} />
                        </div>
                        <div className="flex flex-col items-start text-left min-w-0">
                            <span className="truncate w-full">{item.label}</span>

                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
