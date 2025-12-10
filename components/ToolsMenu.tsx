import React, { useState, useRef, useEffect } from 'react';
import {
    Mic,
    FileText,
    Stethoscope,
    Shield
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
            id: 'ai_scribe',
            label: 'Gerar Prontuário',
            icon: Mic,
            highlight: true
        },
        {
            id: 'anti_glosa',
            label: 'Justificar Procedimento',
            subtitle: 'Anti-Glosa',
            icon: Shield,
            badge: 'NOVO'
        },
        // Placeholder for future tools
        // { id: 'calculator', label: 'Calculadora Médica', icon: Calculator },
    ];

    return (
        <div
            ref={menuRef}
            className={`
                absolute bottom-full left-0 mb-4 w-80 rounded-2xl shadow-2xl border overflow-hidden z-50
                animate-in fade-in zoom-in-95 duration-200 origin-bottom-left
                ${isDarkMode
                    ? 'bg-[#18181b] border-white/10 text-zinc-200'
                    : 'bg-white border-gray-200 text-gray-700'}
            `}
        >
            <div className="p-2 space-y-1">
                <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Ferramentas Clínicas
                </div>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            onSelect(item.id);
                            onClose();
                        }}
                        className={`
                            w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all
                            ${isDarkMode
                                ? 'hover:bg-white/5 hover:text-white'
                                : 'hover:bg-gray-50 hover:text-black'}
                            ${item.highlight ? (isDarkMode ? 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100') : ''}
                        `}
                    >
                        <div className={`
                            p-2 rounded-lg shrink-0
                            ${item.highlight
                                ? (isDarkMode ? 'bg-emerald-400/20' : 'bg-emerald-100')
                                : (isDarkMode ? 'bg-zinc-800' : 'bg-gray-100')}
                        `}>
                            <item.icon className={`w-4 h-4 ${item.highlight ? 'text-emerald-500' : 'opacity-70'}`} />
                        </div>
                        <div className="flex flex-col items-start text-left min-w-0">
                            <span className={`truncate w-full ${item.highlight ? 'font-semibold' : ''}`}>{item.label}</span>
                            {item.subtitle && (
                                <span className={`text-xs truncate w-full ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'} font-normal`}>
                                    {item.subtitle}
                                </span>
                            )}
                        </div>

                        {item.highlight && !item.badge && (
                            <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        )}

                        {item.badge && (
                            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 shrink-0">
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
