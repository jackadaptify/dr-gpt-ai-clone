import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { IconBrain, IconSettings, IconUser, IconGlobe } from '../Icons';
import { Ticket } from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function AdminLayout({ children, activeTab, onTabChange }: AdminLayoutProps) {
    const { user, signOut } = useAuth();

    if (user?.role !== 'admin') {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-textMain">
                <div className="text-center max-w-lg">
                    <h1 className="text-3xl font-bold mb-4 text-red-500">Acesso Negado</h1>
                    <p className="text-textMuted">Você não tem permissão para acessar esta área.</p>
                    <button onClick={() => window.location.href = '/'} className="mt-6 px-6 py-2 bg-surface rounded-lg hover:bg-surfaceHighlight transition-colors">
                        Voltar para Home
                    </button>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: IconGlobe },
        { id: 'users', label: 'Usuários', icon: IconUser },
        { id: 'agents', label: 'Agentes', icon: IconBrain }, // Reusing IconBrain or similar
        { id: 'models', label: 'Modelos IA', icon: IconBrain },
        { id: 'invites', label: 'Convites', icon: Ticket },
        { id: 'settings', label: 'Configurações', icon: IconSettings },
    ];

    return (
        <div className="flex h-full bg-background text-textMain font-sans selection:bg-emerald-500/30">
            {/* Sidebar */}
            <aside className="w-64 border-r border-borderLight bg-surface flex flex-col">
                <div className="p-6 border-b border-borderLight">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <IconSettings className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Admin Panel</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'text-textMuted hover:bg-surfaceHighlight hover:text-textMain'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-borderLight">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center text-xs font-bold">
                            {user.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.full_name || 'Admin'}</p>
                            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={signOut}
                        className="mt-2 w-full text-xs text-textMuted hover:text-red-500 transition-colors text-left px-4"
                    >
                        Sair do sistema
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-background relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/10 via-background to-background pointer-events-none" />
                <div className="relative z-10 p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
