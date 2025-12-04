import React, { useState, useEffect, useRef } from 'react';
import { Agent, AVAILABLE_MODELS, Message, Role } from '../../types';
import * as Icons from '../Icons';
import { streamChatResponse } from '../../services/chatService';
import MessageItem from '../MessageItem';
import { v4 as uuidv4 } from 'uuid';

interface AgentBuilderProps {
    initialAgent?: Partial<Agent>;
    onSave: (agent: Partial<Agent>) => Promise<void>;
    onCancel: () => void;
}

export const AgentBuilder: React.FC<AgentBuilderProps> = ({ initialAgent, onSave, onCancel }) => {
    const [agent, setAgent] = useState<Partial<Agent>>({
        name: '',
        description: '',
        systemPrompt: '',
        modelId: AVAILABLE_MODELS[0].id,
        iceBreakers: [],
        capabilities: [],
        knowledgeFiles: [],
        avatarUrl: '',
        is_active: true,
        ...initialAgent
    });

    const [activeTab, setActiveTab] = useState<'create' | 'configure'>('create');
    const [previewMessages, setPreviewMessages] = useState<Message[]>([]);
    const [previewInput, setPreviewInput] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom of preview
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [previewMessages, isPreviewLoading]);

    const handlePreviewSend = async () => {
        if (!previewInput.trim() || isPreviewLoading) return;

        const userMsg: Message = {
            id: uuidv4(),
            role: Role.USER,
            content: previewInput,
            timestamp: Date.now()
        };

        setPreviewMessages(prev => [...prev, userMsg]);
        setPreviewInput('');
        setIsPreviewLoading(true);

        // Add placeholder for AI response
        const aiMsgId = uuidv4();
        setPreviewMessages(prev => [...prev, {
            id: aiMsgId,
            role: Role.MODEL,
            content: '',
            timestamp: Date.now(),
            isStreaming: true
        }]);

        try {
            const modelConfig = AVAILABLE_MODELS.find(m => m.id === agent.modelId) || AVAILABLE_MODELS[0];

            await streamChatResponse(
                modelConfig.modelId,
                [...previewMessages, userMsg], // History
                userMsg.content, // Current message
                (text) => {
                    setPreviewMessages(prev => prev.map(m =>
                        m.id === aiMsgId ? { ...m, content: text } : m
                    ));
                },
                agent.systemPrompt // Use current system prompt
            );

            setPreviewMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, isStreaming: false } : m
            ));

        } catch (error) {
            console.error("Preview Error:", error);
            setPreviewMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: "Error generating preview response.", isStreaming: false } : m
            ));
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const addIceBreaker = () => {
        setAgent(prev => ({
            ...prev,
            iceBreakers: [...(prev.iceBreakers || []), '']
        }));
    };

    const updateIceBreaker = (index: number, value: string) => {
        const newBreakers = [...(agent.iceBreakers || [])];
        newBreakers[index] = value;
        setAgent(prev => ({ ...prev, iceBreakers: newBreakers }));
    };

    const removeIceBreaker = (index: number) => {
        const newBreakers = [...(agent.iceBreakers || [])];
        newBreakers.splice(index, 1);
        setAgent(prev => ({ ...prev, iceBreakers: newBreakers }));
    };

    const toggleCapability = (cap: string) => {
        const currentCaps = agent.capabilities || [];
        if (currentCaps.includes(cap)) {
            setAgent(prev => ({ ...prev, capabilities: currentCaps.filter(c => c !== cap) }));
        } else {
            setAgent(prev => ({ ...prev, capabilities: [...currentCaps, cap] }));
        }
    };

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col md:flex-row overflow-hidden">
            {/* Left Panel - Configuration */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-borderLight bg-surface">
                <div className="p-4 border-b border-borderLight flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <Icons.IconArrowLeft className="w-5 h-5 text-textMuted" />
                        </button>
                        <h2 className="text-lg font-bold text-textMain">
                            {initialAgent ? 'Edit Agent' : 'New Agent'}
                        </h2>
                    </div>
                    <button
                        onClick={() => onSave(agent)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Save
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Identity Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${agent.color || 'from-gray-500 to-gray-700'} shadow-lg overflow-hidden relative group`}>
                                {agent.avatarUrl ? (
                                    <img src={agent.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <Icons.IconRobot className="w-8 h-8 text-white" />
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => {
                                    const url = prompt("Enter Avatar URL:");
                                    if (url) setAgent({ ...agent, avatarUrl: url });
                                }}>
                                    <Icons.IconEdit className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-1">Name</label>
                                <input
                                    type="text"
                                    value={agent.name}
                                    onChange={e => setAgent({ ...agent, name: e.target.value })}
                                    className="w-full bg-transparent text-xl font-bold text-textMain placeholder-textMuted/50 outline-none border-b border-transparent focus:border-emerald-500 transition-colors"
                                    placeholder="Name your GPT"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-1">Description</label>
                            <input
                                type="text"
                                value={agent.description}
                                onChange={e => setAgent({ ...agent, description: e.target.value })}
                                className="w-full bg-surfaceHighlight border border-borderLight rounded-lg px-4 py-2 text-textMain outline-none focus:border-emerald-500 transition-colors"
                                placeholder="Add a short description about what this GPT does"
                            />
                        </div>
                    </section>

                    <hr className="border-borderLight" />

                    {/* Instructions Section */}
                    <section className="space-y-4">
                        <label className="block text-xs font-bold text-textMuted uppercase tracking-wider">Instructions</label>
                        <textarea
                            value={agent.systemPrompt}
                            onChange={e => setAgent({ ...agent, systemPrompt: e.target.value })}
                            className="w-full h-48 bg-surfaceHighlight border border-borderLight rounded-xl p-4 text-textMain outline-none focus:border-emerald-500 transition-colors font-mono text-sm resize-none"
                            placeholder="What does this GPT do? How does it behave? What should it avoid doing?"
                        />
                    </section>

                    {/* Model Selection */}
                    <section className="space-y-4">
                        <label className="block text-xs font-bold text-textMuted uppercase tracking-wider">Model</label>
                        <div className="relative">
                            <select
                                value={agent.modelId}
                                onChange={e => setAgent({ ...agent, modelId: e.target.value })}
                                className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-textMain outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                            >
                                {AVAILABLE_MODELS.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.name} ({model.provider})
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-textMuted">
                                <Icons.IconArrowDown className="w-4 h-4" />
                            </div>
                        </div>
                    </section>

                    {/* Ice Breakers */}
                    <section className="space-y-4">
                        <label className="block text-xs font-bold text-textMuted uppercase tracking-wider">Conversation Starters</label>
                        <div className="space-y-2">
                            {agent.iceBreakers?.map((breaker, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={breaker}
                                        onChange={e => updateIceBreaker(idx, e.target.value)}
                                        className="flex-1 bg-surfaceHighlight border border-borderLight rounded-lg px-4 py-2 text-textMain outline-none focus:border-emerald-500"
                                        placeholder="e.g., Help me write a blog post"
                                    />
                                    <button onClick={() => removeIceBreaker(idx)} className="p-2 hover:bg-red-500/10 text-textMuted hover:text-red-500 rounded-lg transition-colors">
                                        <Icons.IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button onClick={addIceBreaker} className="text-sm text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1">
                                <Icons.IconPlus className="w-4 h-4" /> Add Starter
                            </button>
                        </div>
                    </section>

                    {/* Knowledge */}
                    <section className="space-y-4">
                        <label className="block text-xs font-bold text-textMuted uppercase tracking-wider">Knowledge</label>
                        <div className="bg-surfaceHighlight border border-borderLight border-dashed rounded-xl p-6 text-center hover:bg-surfaceHighlight/80 transition-colors cursor-pointer group">
                            <div className="w-12 h-12 rounded-full bg-surface border border-borderLight flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <Icons.IconUpload className="w-5 h-5 text-textMuted group-hover:text-emerald-500" />
                            </div>
                            <p className="text-sm text-textMain font-medium">Upload files</p>
                            <p className="text-xs text-textMuted mt-1">PDFs, Docs, CSVs (Mock UI)</p>
                        </div>
                        {agent.knowledgeFiles && agent.knowledgeFiles.length > 0 && (
                            <div className="space-y-2">
                                {agent.knowledgeFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-surface border border-borderLight rounded-lg p-3">
                                        <div className="flex items-center gap-3">
                                            <Icons.IconFile className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm text-textMain">{file.name}</span>
                                        </div>
                                        <button className="text-textMuted hover:text-red-500">
                                            <Icons.IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Capabilities */}
                    <section className="space-y-4">
                        <label className="block text-xs font-bold text-textMuted uppercase tracking-wider">Capabilities</label>
                        <div className="space-y-3">
                            {[
                                { id: 'web_search', label: 'Web Browsing', desc: 'Allows the agent to search the internet' },
                                { id: 'image_generation', label: 'DALL-E / Imagen', desc: 'Allows the agent to generate images' },
                                { id: 'code_interpreter', label: 'Code Interpreter', desc: 'Allows the agent to run code and analyze data' }
                            ].map(cap => (
                                <div key={cap.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-surfaceHighlight transition-colors cursor-pointer" onClick={() => toggleCapability(cap.id)}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-colors ${agent.capabilities?.includes(cap.id) ? 'bg-emerald-500 border-emerald-500' : 'border-textMuted'}`}>
                                        {agent.capabilities?.includes(cap.id) && <Icons.IconCheck className="w-3 h-3 text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-textMain">{cap.label}</p>
                                        <p className="text-xs text-textMuted">{cap.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="w-full md:w-1/2 flex flex-col bg-background relative">
                <div className="absolute top-4 right-4 z-10 bg-surface/80 backdrop-blur-md border border-borderLight rounded-lg px-3 py-1.5 text-xs font-medium text-textMuted shadow-sm">
                    Preview Mode
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar">
                    {previewMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                            <div className="w-16 h-16 rounded-2xl bg-surfaceHighlight flex items-center justify-center mb-4">
                                <Icons.IconRobot className="w-8 h-8 text-textMuted" />
                            </div>
                            <h3 className="text-lg font-bold text-textMain mb-2">{agent.name || 'Untitled Agent'}</h3>
                            <p className="text-sm text-textMuted max-w-xs">{agent.description || 'Add a description to see it here'}</p>

                            {agent.iceBreakers && agent.iceBreakers.length > 0 && (
                                <div className="mt-8 grid gap-2 w-full max-w-sm">
                                    {agent.iceBreakers.map((breaker, idx) => (
                                        breaker && (
                                            <button
                                                key={idx}
                                                onClick={() => setPreviewInput(breaker)}
                                                className="p-3 bg-surface border border-borderLight rounded-xl text-sm text-textMain hover:bg-surfaceHighlight transition-colors text-left"
                                            >
                                                {breaker}
                                            </button>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full max-w-2xl space-y-6">
                            {previewMessages.map(msg => (
                                <MessageItem key={msg.id} message={msg} isDarkMode={true} />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                <div className="p-4 md:p-6 bg-background border-t border-borderLight">
                    <div className="max-w-2xl mx-auto relative">
                        <input
                            type="text"
                            value={previewInput}
                            onChange={e => setPreviewInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handlePreviewSend()}
                            placeholder={`Message ${agent.name || 'Agent'}...`}
                            className="w-full bg-surfaceHighlight border border-borderLight rounded-full px-6 py-4 pr-12 text-textMain outline-none focus:border-emerald-500 shadow-sm"
                        />
                        <button
                            onClick={handlePreviewSend}
                            disabled={!previewInput.trim() || isPreviewLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.IconSend className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
