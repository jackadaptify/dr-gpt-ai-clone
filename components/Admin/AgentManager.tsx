import React, { useState, useEffect } from 'react';
import { agentService } from '../../services/agentService';
import { Agent, AVAILABLE_MODELS } from '../../types';
import * as Icons from '../Icons';

import { AgentBuilder } from './AgentBuilder';

export const AgentManager: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAgent, setCurrentAgent] = useState<Partial<Agent>>({});
    const [error, setError] = useState('');

    useEffect(() => {
        loadAgents();
    }, []);

    const loadAgents = async () => {
        try {
            const data = await agentService.getAllAgents();
            setAgents(data);
        } catch (err) {
            console.error('Error loading agents:', err);
            setError('Failed to load agents');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!currentAgent.name || !currentAgent.systemPrompt || !currentAgent.modelId) {
                alert('Please fill in Name, System Prompt and Model');
                return;
            }

            const agentData = {
                name: currentAgent.name,
                description: currentAgent.description || '',
                role: currentAgent.role || 'Assistant',
                systemPrompt: currentAgent.systemPrompt,
                modelId: currentAgent.modelId,
                icon: currentAgent.icon || 'IconRobot',
                color: currentAgent.color || 'from-gray-500 to-gray-700',
                is_active: currentAgent.is_active !== undefined ? currentAgent.is_active : true
            };

            if (currentAgent.id) {
                await agentService.updateAgent(currentAgent.id, agentData);
            } else {
                await agentService.createAgent(agentData as Agent);
            }

            setIsEditing(false);
            setCurrentAgent({});
            loadAgents();
        } catch (err) {
            console.error('Error saving agent:', err);
            alert(`Failed to save agent: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this agent?')) return;
        try {
            await agentService.deleteAgent(id);
            loadAgents();
        } catch (err) {
            console.error('Error deleting agent:', err);
            alert('Failed to delete agent');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading Agents...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Agent Manager</h2>
                <button
                    onClick={() => { setCurrentAgent({}); setIsEditing(true); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <Icons.IconPlus className="w-5 h-5" />
                    New Agent
                </button>
            </div>

            {isEditing && (
                <AgentBuilder
                    initialAgent={currentAgent}
                    onSave={async (agent) => {
                        // Merge with currentAgent to keep ID if editing
                        const agentToSave = { ...currentAgent, ...agent };

                        // Validation
                        if (!agentToSave.name || !agentToSave.systemPrompt || !agentToSave.modelId) {
                            alert('Please fill in Name, System Prompt and Model');
                            return;
                        }

                        const agentData = {
                            name: agentToSave.name,
                            description: agentToSave.description || '',
                            role: agentToSave.role || 'Assistant',
                            systemPrompt: agentToSave.systemPrompt,
                            modelId: agentToSave.modelId,
                            icon: agentToSave.icon || 'IconRobot',
                            color: agentToSave.color || 'from-gray-500 to-gray-700',
                            is_active: agentToSave.is_active !== undefined ? agentToSave.is_active : true,
                            iceBreakers: agentToSave.iceBreakers,
                            capabilities: agentToSave.capabilities,
                            knowledgeFiles: agentToSave.knowledgeFiles,
                            avatarUrl: agentToSave.avatarUrl
                        };

                        try {
                            if (agentToSave.id) {
                                await agentService.updateAgent(agentToSave.id, agentData);
                            } else {
                                await agentService.createAgent(agentData as Agent);
                            }
                            setIsEditing(false);
                            setCurrentAgent({});
                            loadAgents();
                        } catch (err) {
                            console.error('Error saving agent:', err);
                            alert(`Failed to save agent: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
                        }
                    }}
                    onCancel={() => { setIsEditing(false); setCurrentAgent({}); }}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map(agent => (
                    <div key={agent.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-lg bg-gradient-to-br ${agent.color} bg-opacity-10`}>
                                {/* Dynamic Icon rendering would go here, for now using generic */}
                                <Icons.IconRobot className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => { setCurrentAgent(agent); setIsEditing(true); }}
                                    className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                                >
                                    <Icons.IconEdit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(agent.id)}
                                    className="p-2 hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-400"
                                >
                                    <Icons.IconTrash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">{agent.name}</h3>
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{agent.description}</p>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`}></span>
                            {agent.is_active ? 'Active' : 'Inactive'}
                            <span className="mx-1">•</span>
                            {agent.modelId}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
