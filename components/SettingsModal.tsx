import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, CreditCard, Palette, Shield, ArrowRight, Menu } from 'lucide-react';
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
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
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
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-6">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className={`
                relative w-full max-w-5xl h-[100dvh] md:h-[85vh] md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden transform transition-all
                ${isDarkMode ? 'bg-surface border-t md:border border-borderLight' : 'bg-white'}
            `}>

                {/* --- MOBILE/TABLET HEADER with Menu & Back Button --- */}
                <div className="flex md:hidden items-center justify-between p-4 border-b border-borderLight bg-surface shrink-0 z-50 relative min-h-[60px]">
                    <button
                        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                        className="flex items-center justify-center p-2 -ml-2 text-textMain hover:bg-surfaceHighlight rounded-lg transition-colors"
                        aria-label="Menu"
                    >
                        <Menu size={24} />
                    </button>

                    <span className="font-bold text-textMain text-lg transform -translate-x-4">Configurações</span>

                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 p-2 -mr-2 text-textMuted hover:text-textMain active:text-emerald-500 transition-colors"
                        aria-label="Voltar"
                    >
                        <span className="font-bold text-base">Voltar</span>
                        <ArrowRight className="rotate-180" size={20} />
                    </button>
                </div>

                {/* Desktop Close Button (Only visible on Large Screens) */}
                <button
                    onClick={onClose}
                    className="hidden md:block absolute top-4 right-4 z-50 p-2 rounded-full hover:bg-black/10 transition-colors"
                >
                    <X size={20} className="text-textMuted hover:text-textMain" />
                </button>

                {/* Sidebar (Desktop: Static, Mobile/Tablet: Drawer) */}
                <div className={`
                    absolute md:static inset-y-0 left-0 z-40 w-64 bg-surface transform transition-transform duration-300 ease-in-out border-r border-borderLight
                    ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    flex flex-col h-full
                `}>
                    <div className="p-6">
                        <h2 className="text-lg font-bold text-textMain flex items-center gap-2">
                            <IconSettings className="w-5 h-5 text-emerald-500" />
                            Configurações
                        </h2>
                    </div>

                    <nav className="flex flex-col px-3 space-y-1">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as any);
                                        setShowMobileSidebar(false);
                                    }}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                        ${isActive
                                            ? 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20'
                                            : 'text-textMuted hover:bg-surfaceHighlight hover:text-textMain'}
                                    `}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Desktop User Mini Profile */}
                    <div className="hidden md:block absolute bottom-0 left-0 right-0 p-4 border-t border-borderLight">
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
                <div className="flex-1 relative flex flex-col min-w-0 bg-background overflow-hidden">
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
