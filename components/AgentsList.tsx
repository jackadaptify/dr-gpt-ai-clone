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

const AgentItem = ({ agent, onSelectAgent, isDarkMode }: { agent: Agent, onSelectAgent: (agent: Agent) => void, isDarkMode: boolean }) => (
    <button
        onClick={() => onSelectAgent(agent)}
        className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all text-left group border border-transparent
        ${isDarkMode
                ? 'hover:bg-white/5 hover:border-borderLight text-textMuted hover:text-textMain'
                : 'hover:bg-black/5 text-gray-600 hover:text-gray-900'}
        `}
    >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${agent.color || 'from-gray-500 to-gray-700'} text-white shadow-sm group-hover:scale-105 transition-transform overflow-hidden`}>
            {agent.avatarUrl ? (
                <img
                    src={agent.avatarUrl}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: agent.avatarPosition || 'center' }}
                />
            ) : (
                getIcon(agent.icon)
            )}
        </div>
        <div className="flex-1 min-w-0">
            <div className={`text-sm font-semibold whitespace-normal leading-tight ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {agent.name}
            </div>
            <div className="text-[10px] truncate opacity-60">
                {agent.role || 'Assistant'}
            </div>
        </div>
    </button>
);

const AgentsList: React.FC<AgentsListProps> = ({ onSelectAgent, isDarkMode, agents }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const firstAgent = agents[0];
    const restAgents = agents.slice(1);

    return (
        <div className="px-3 py-2">
            <div
                className="flex items-center justify-between mb-3 px-2 cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Agentes Especialistas
                </h3>
                <div className={`transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : ''} ${isDarkMode ? 'text-gray-500 group-hover:text-gray-300' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </div>
            </div>

            <div className="flex flex-col">
                {firstAgent && (
                    <AgentItem
                        agent={firstAgent}
                        onSelectAgent={onSelectAgent}
                        isDarkMode={isDarkMode}
                    />
                )}

                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        <div className="space-y-1 pt-1">
                            {restAgents.map((agent) => (
                                <AgentItem
                                    key={agent.id}
                                    agent={agent}
                                    onSelectAgent={onSelectAgent}
                                    isDarkMode={isDarkMode}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentsList;
