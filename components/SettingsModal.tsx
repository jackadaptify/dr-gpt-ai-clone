import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, CreditCard, Palette, Shield } from 'lucide-react';
import { IconSettings, IconBrain } from './Icons';
import { SettingsContent } from './SettingsContent';
import { useAuth } from '../contexts/AuthContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    initialTab?: 'personalization' | 'subscription' | 'general' | 'data';
}

const SettingsModal = ({ isOpen, onClose, isDarkMode, toggleTheme, initialTab = 'personalization' }: SettingsModalProps) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    const tabs = [
        { id: 'personalization', label: 'Personalização', icon: User },
        { id: 'subscription', label: 'Assinatura', icon: CreditCard },
        { id: 'general', label: 'Geral', icon: IconSettings },
        { id: 'data', label: 'Controle de Dados', icon: IconBrain },
    ];

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className={`
                relative w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden transform transition-all
                ${isDarkMode ? 'bg-surface border border-borderLight' : 'bg-white'}
            `}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 rounded-full hover:bg-black/10 transition-colors"
                >
                    <X size={20} className="text-textMuted hover:text-textMain" />
                </button>

                {/* Sidebar */}
                <div className={`w-64 flex-shrink-0 border-r ${isDarkMode ? 'border-white/10 bg-surfaceHighlight/50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="p-6">
                        <h2 className="text-lg font-bold text-textMain flex items-center gap-2">
                            <IconSettings className="w-5 h-5 text-emerald-500" />
                            Configurações
                        </h2>
                    </div>

                    <nav className="px-3 space-y-1">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                        ${isActive
                                            ? 'bg-emerald-500/10 text-emerald-600'
                                            : 'text-textMuted hover:bg-surfaceHighlight hover:text-textMain'}
                                    `}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User Mini Profile */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-borderLight">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                                {user?.email?.[0].toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-textMain truncate">{user?.full_name || 'Usuário'}</p>
                                <p className="text-xs text-textMuted truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative flex flex-col min-w-0 bg-background">
                    <SettingsContent
                        activeTab={activeTab}
                        isDarkMode={isDarkMode}
                        toggleTheme={toggleTheme}
                    />
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default SettingsModal;
