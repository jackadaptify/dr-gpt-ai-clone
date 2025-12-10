import React, { useState, useRef, useEffect } from 'react';
import {
    Paperclip,
    Image,
    Plus,
    Globe
} from 'lucide-react';

interface AttachmentMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (option: string) => void;
    isDarkMode: boolean;
    triggerRef: React.RefObject<HTMLButtonElement>;
}

export default function AttachmentMenu({ isOpen, onClose, onSelect, isDarkMode, triggerRef }: AttachmentMenuProps) {
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
        { id: 'upload', label: 'Enviar arquivos', icon: Paperclip },
        { id: 'photos', label: 'Fotos', icon: Image },
    ];

    return (
        <div
            ref={menuRef}
            className={`
                absolute bottom-full left-0 mb-4 w-64 rounded-2xl shadow-2xl border overflow-hidden z-50
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
                            onSelect(item.id);
                            onClose();
                        }}
                        className={`
                            w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                            ${isDarkMode
                                ? 'hover:bg-white/5 hover:text-white'
                                : 'hover:bg-gray-50 hover:text-black'}
                        `}
                    >
                        <item.icon className="w-4 h-4 opacity-70" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
