import { MessageCircle, Mic, Search, Settings, Shield, ClipboardCheck, User, LogOut, Edit2, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AppMode } from '../types';

interface RailNavProps {
    activeMode: AppMode;
    onModeChange: (mode: AppMode) => void;
    isDarkMode: boolean;
}

const RailNav: React.FC<RailNavProps> = ({ activeMode, onModeChange, isDarkMode }) => {

    const { user } = useAuth();

    const navItems = [
        { mode: 'chat', icon: MessageCircle, label: 'Discussão Clínica' },
        { mode: 'research', icon: BookOpen, label: 'Pesquisa Médica' },
        { mode: 'scribe', icon: Edit2, label: 'Transcribe' }
    ];

    if (user?.role === 'admin') {
        navItems.push({ mode: 'admin', icon: Shield, label: 'Painel Admin' });
    }

    return (
        <div className={`
            w-[70px] flex flex-col items-center py-6 h-full z-50 border-r
            transition-colors duration-300
            ${isDarkMode ? 'bg-zinc-950 border-white/10' : 'bg-white border-slate-200'}
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
                    const Icon = item.icon;
                    // Highlight if activeMode strictly matches the item's mode
                    const isActive = activeMode === item.mode;

                    return (
                        <button
                            key={item.mode}
                            onClick={() => onModeChange(item.mode as AppMode)}
                            className={`
                                group relative w-full aspect-square rounded-xl flex items-center justify-center
                                transition-all duration-200
                                ${isActive
                                    ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                    : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
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
                })
                }
            </div>

            {/* Bottom User Avatar - Acts as Settings Button */}
            <div className="mt-auto mb-6">
                <button
                    onClick={() => onModeChange('settings')}
                    className={`
                        group relative w-10 h-10 rounded-full overflow-hidden transition-all duration-200
                        ${activeMode === 'settings'
                            ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950'
                            : 'hover:ring-2 hover:ring-zinc-700 hover:ring-offset-2 hover:ring-offset-zinc-950 opacity-80 hover:opacity-100'
                        }
                    `}
                    title="Configurações e Perfil"
                >
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt="User"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                            {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                    )}

                    {/* Active Indicator for User/Settings */}
                    {activeMode === 'settings' && (
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default RailNav;
