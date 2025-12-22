import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot } from 'lucide-react';

interface ResearchMessageProps {
    role: 'user' | 'model';
    content: string;
    isDarkMode: boolean;
    timestamp: number;
}

const ResearchMessageItem: React.FC<ResearchMessageProps> = ({ role, content, isDarkMode, timestamp }) => {
    const isUser = role === 'user';

    return (
        <div className={`group w-full py-2 ${isUser ? '' : (isDarkMode ? 'bg-transparent' : 'bg-transparent')}`}>
            <div className={`m-auto w-full max-w-3xl p-4 md:p-6 flex gap-6 ${isUser ? 'flex-row-reverse' : ''}`}>

                {/* Avatar */}
                <div className="flex-shrink-0 flex flex-col relative">
                    <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border-t border-white/10
                        ${isUser
                            ? (isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500')
                            : (isDarkMode ? 'bg-gradient-to-br from-surfaceHighlight to-surface shadow-convex' : 'bg-white border border-gray-200')
                        }
                    `}>
                        {isUser ? <User className="text-white w-6 h-6" /> : <Bot className="text-emerald-500 w-6 h-6" />}
                    </div>
                </div>

                {/* Content */}
                <div className={`relative flex-1 overflow-hidden ${isUser ? 'flex justify-end' : 'pt-1.5'}`}>
                    <div className={`
                        ${isUser
                            ? 'bg-indigo-500/10 text-textMain border border-indigo-500/20 rounded-3xl rounded-tr-sm px-5 py-2.5 max-w-[85%] shadow-md'
                            : ''}
                    `}>
                        {!isUser && (
                            <div className="font-bold text-sm mb-3 flex items-center gap-2">
                                <span className={`bg-clip-text text-transparent drop-shadow-sm tracking-wide ${isDarkMode ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
                                    Research Assistant
                                </span>
                                <span className="text-[10px] text-zinc-500 font-normal ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}

                        <div className={`prose ${isDarkMode ? 'prose-invert text-gray-300' : 'prose-slate text-slate-800'} ${isUser ? 'prose-p:my-0' : 'prose-base'} leading-relaxed max-w-none font-normal tracking-wide`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" />,
                                    code: ({ node, className, children, ...props }) => {
                                        const match = /language-(\w+)/.exec(className || '')
                                        return match ? (
                                            <div className="rounded-lg bg-black/50 p-4 my-4 overflow-x-auto">
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            </div>
                                        ) : (
                                            <code className="bg-black/10 px-1 py-0.5 rounded text-sm font-mono text-emerald-500" {...props}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResearchMessageItem;
