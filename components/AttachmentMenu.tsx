import React, { useState, useRef, useEffect } from 'react';
import {
    IconFile,
    IconLink,
    IconLightbulb,
    IconBrackets,
    IconPlus,
    IconGlobe,
    IconArrowDown // We can rotate this for right arrow
} from './Icons';

interface AttachmentMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (option: string) => void;
    isDarkMode: boolean;
    triggerRef: React.RefObject<HTMLButtonElement>;
}

export default function AttachmentMenu({ isOpen, onClose, onSelect, isDarkMode, triggerRef }: AttachmentMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);

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
        { id: 'upload', label: 'Upload de fotos & arquivos', icon: IconFile },
        { id: 'url', label: 'Da URL', icon: IconLink },
        { id: 'knowledge', label: 'Conhecimento', icon: IconLightbulb, hasSubmenu: true },
        { id: 'prompts', label: 'Prompts', icon: IconBrackets },
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
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.hasSubmenu) {
                                // Toggle submenu or handle it
                                console.log('Submenu clicked');
                            } else {
                                onSelect(item.id);
                                onClose();
                            }
                        }}
                        className={`
                            w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                            ${isDarkMode
                                ? 'hover:bg-white/5 hover:text-white'
                                : 'hover:bg-gray-50 hover:text-black'}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon className="w-4 h-4 opacity-70" />
                            <span>{item.label}</span>
                        </div>
                        {item.hasSubmenu && (
                            <IconArrowDown className="w-4 h-4 -rotate-90 opacity-50" />
                        )}
                    </button>
                ))}
            </div>

            <div className={`p-2 grid grid-cols-2 gap-2 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                <button
                    onClick={() => {
                        onSelect('add_more');
                        onClose();
                    }}
                    className={`
                        flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors
                        ${isDarkMode
                            ? 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black'}
                    `}
                >
                    <IconPlus className="w-3.5 h-3.5" />
                    Adicionar
                </button>
                <button
                    onClick={() => {
                        onSelect('web_search');
                        onClose();
                    }}
                    className={`
                        flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors
                        ${isDarkMode
                            ? 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black'}
                    `}
                >
                    <IconGlobe className="w-3.5 h-3.5" />
                    Pesquisa Web
                </button>
            </div>
        </div>
    );
}
