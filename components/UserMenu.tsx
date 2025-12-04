import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { IconSettings, IconUser, IconBrain } from './Icons';
import SettingsModal from './SettingsModal';

interface UserMenuProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
}

export default function UserMenu({ isDarkMode, toggleTheme }: UserMenuProps) {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
                >
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-emerald-900/20">
                        {user?.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                            {user?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                        </p>
                    </div>
                </button>

                {isOpen && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50">
                        <div className="px-4 py-3 border-b border-white/5">
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            {user?.role === 'admin' && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                                    Admin
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => window.open('/admin', '_blank')}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 ${user?.role === 'admin' ? 'text-emerald-400' : 'text-zinc-400 cursor-not-allowed opacity-50'}`}
                            disabled={user?.role !== 'admin'}
                        >
                            <IconBrain className="w-4 h-4" />
                            Painel Admin
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setShowSettings(true);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 flex items-center gap-2"
                        >
                            <IconSettings className="w-4 h-4" />
                            Configurações
                        </button>

                        <div className="h-px bg-white/5 my-1" />

                        <button
                            onClick={() => signOut()}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            Sair
                        </button>
                    </div>
                )}
            </div>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />
        </>
    );
}
