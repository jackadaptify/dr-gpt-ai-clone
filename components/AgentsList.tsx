import React from 'react';
import { AVAILABLE_AGENTS, Agent } from '../types';
import { IconDiamond, IconCalculator, IconStethoscope, IconVideo, IconRobot } from './Icons';
import { agentService } from '../services/agentService';

interface AgentsListProps {
    onSelectAgent: (agent: Agent) => void;
    isDarkMode: boolean;
    agents: Agent[];
}

const getIcon = (iconName: string) => {
    switch (iconName) {
        case 'IconDiamond': return <IconDiamond />;
        case 'IconCalculator': return <IconCalculator />;
        case 'IconStethoscope': return <IconStethoscope />;
        case 'IconVideo': return <IconVideo />;
        case 'IconRobot': return <IconRobot />;
        default: return <IconDiamond />;
    }
};

const AgentsList: React.FC<AgentsListProps> = ({ onSelectAgent, isDarkMode, agents }) => {
    return (
        <div className="px-3 py-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Agentes Especialistas
            </h3>
            <div className="space-y-1">
                {agents.map((agent) => (
                    <button
                        key={agent.id}
                        onClick={() => onSelectAgent(agent)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group border border-transparent
                        ${isDarkMode
                                ? 'hover:bg-white/5 hover:border-borderLight text-textMuted hover:text-textMain'
                                : 'hover:bg-black/5 text-gray-600 hover:text-gray-900'}
                        `}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${agent.color || 'from-gray-500 to-gray-700'} text-white shadow-sm group-hover:scale-105 transition-transform overflow-hidden`}>
                            {agent.avatarUrl ? (
                                <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
                            ) : (
                                getIcon(agent.icon)
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                {agent.name}
                            </div>
                            <div className="text-[10px] truncate opacity-60">
                                {agent.role || 'Assistant'}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AgentsList;
