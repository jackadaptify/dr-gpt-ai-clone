import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { IconUser, IconMessage, IconBrain } from '../Icons';

export default function Dashboard() {
    const [stats, setStats] = useState({ usersCount: 0, chatsCount: 0, totalTokens: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await adminService.getStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats', error);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        { label: 'Usuários Totais', value: stats.usersCount, icon: IconUser, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
        { label: 'Chats Ativos', value: stats.chatsCount, icon: IconMessage, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
        { label: 'Tokens Processados', value: stats.totalTokens.toLocaleString(), icon: IconBrain, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
    ];

    if (loading) return <div className="text-zinc-500">Carregando dados...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
                <p className="text-zinc-400">Visão geral do sistema em tempo real.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, idx) => (
                    <div key={idx} className={`p-6 rounded-2xl border ${card.border} ${card.bg} backdrop-blur-sm`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl bg-[#050505]/50 ${card.color}`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full bg-[#050505]/30 ${card.color}`}>
                                +12% essa semana
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{card.value}</h3>
                        <p className="text-sm text-zinc-400 font-medium">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Placeholder for Chart */}
            <div className="p-8 rounded-3xl border border-white/5 bg-[#0a0a0a] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <h3 className="text-lg font-bold mb-6">Atividade de Uso (Tokens)</h3>
                <div className="h-64 flex items-end gap-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 transition-colors rounded-t-lg relative group" style={{ height: `${h}%` }}>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {h * 1000} tokens
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-4 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                    <span>Jan</span>
                    <span>Fev</span>
                    <span>Mar</span>
                    <span>Abr</span>
                    <span>Mai</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Ago</span>
                    <span>Set</span>
                    <span>Out</span>
                    <span>Nov</span>
                    <span>Dez</span>
                </div>
            </div>
        </div>
    );
}
