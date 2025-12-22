import React, { useState, useRef, useEffect } from 'react';
import {
    Paperclip,
    Image,
    Plus,
    Book
} from 'lucide-react';

interface AttachmentMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (option: string) => void;
    isDarkMode: boolean;
    triggerRef: React.RefObject<HTMLButtonElement>;
    isImageMode?: boolean;

}

export default function AttachmentMenu({
    isOpen,
    onClose,
    onSelect,
    isDarkMode,
    triggerRef,
    isImageMode = false,
}: AttachmentMenuProps) {
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

    // Logic:
    // Text Mode: Upload, Photos, Deep Research (Toggle), Prompts
    // Image Mode: Photos (Reference), Prompts

    const menuItems = [
        // Upload (Text only)
        !isImageMode && { id: 'upload', label: 'Enviar arquivos', icon: Paperclip },

        // Photos (Reference in Image mode)
        { id: 'photos', label: isImageMode ? 'Imagem de Referência' : 'Fotos', icon: Image },

        // Prompts (Both)
        { id: 'prompts', label: 'Biblioteca de Prompts', icon: Book },
    ].filter(Boolean) as { id: string; label: string; icon: any }[];

    return (
        <div
            ref={menuRef}
            className={`
                absolute bottom-full left-0 mb-4 w-64 rounded-2xl shadow-2xl border overflow-hidden z-50
                animate-in fade-in zoom-in-95 duration-200 origin-bottom-left
                bg-surface border-borderLight text-textMain
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
                            hover:bg-surfaceHighlight hover:text-textMain
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
