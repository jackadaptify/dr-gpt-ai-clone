import React from 'react';
import { MessageCircle, Mic, FileText, Settings, ShieldCheck, User } from 'lucide-react';
import { AppMode } from '../types';

interface RailNavProps {
    activeMode: AppMode;
    onModeChange: (mode: AppMode) => void;
    isDarkMode: boolean;
}

const RailNav: React.FC<RailNavProps> = ({ activeMode, onModeChange, isDarkMode }) => {

    const navItems = [
        { mode: 'chat', icon: MessageCircle, label: 'Chat IA' },
        { mode: 'scribe', icon: Mic, label: 'Scribe' },
        { mode: 'finance', icon: ShieldCheck, label: 'Financeiro' },
        { mode: 'settings', icon: Settings, label: 'Ajustes' },
    ];

    return (
        <div className={`
            w-[70px] flex flex-col items-center py-6 h-full z-50 border-r
            transition-colors duration-300
            ${isDarkMode ? 'bg-zinc-950 border-white/10' : 'bg-white border-gray-200'}
        `}>
            {/* Logo Icon (Optional or Small) */}
            <div className="mb-8 p-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 overflow-hidden flex items-center justify-center">
                    <span className="font-bold text-white text-xs">Dr</span>
                </div>
            </div>

            {/* Nav Items */}
            <div className="flex-1 flex flex-col gap-4 w-full px-2">
                {navItems.map((item) => {
                    const isActive = activeMode === item.mode;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.mode}
                            onClick={() => onModeChange(item.mode as AppMode)}
                            className={`
                                group relative w-full aspect-square rounded-xl flex items-center justify-center
                                transition-all duration-200
                                ${isActive
                                    ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                    : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50')
                                }
                            `}
                            title={item.label}
                        >
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />

                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full" />
                            )}

                            {/* Tooltip on Hover */}
                            <div className={`
                                absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg
                                ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-900 text-white'}
                            `}>
                                {item.label}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Bottom Avatar/User (Optional placeholder in rail) */}
            <div className="mt-auto">
                {/* Could duplicate user avatar here if desired, keeping it clean for now */}
            </div>
        </div>
    );
};

export default RailNav;
