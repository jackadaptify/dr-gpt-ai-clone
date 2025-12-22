import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Role, AVAILABLE_MODELS, Agent } from '../types';
import { IconBot, IconUser, getProviderIcon, IconStethoscope, IconActivity, IconBaby, IconSkin, IconBrain } from './Icons';

interface MessageItemProps {
  message: Message;
  isDarkMode: boolean;
  agent?: Agent; // Optional agent context
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  'IconStethoscope': IconStethoscope,
  'IconActivity': IconActivity,
  'IconBaby': IconBaby,
  'IconSkin': IconSkin,
  'IconBrain': IconBrain
};

// 🔧 FIX: Memoize to prevent re-renders of unchanged messages
const MessageItem: React.FC<MessageItemProps> = React.memo(({ message, isDarkMode, agent }) => {
  const isUser = message.role === Role.USER;

  // Download image handler
  const handleDownloadImage = (src: string, alt?: string) => {
    if (src.startsWith('data:image')) {
      const link = document.createElement('a');
      link.href = src;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const extension = src.split(';')[0].split('/')[1] || 'png';
      link.download = `dr-gpt-image-${timestamp}.${extension}`;

      // Log quality verification
      const base64Size = src.length;
      console.log('📥 Downloading image:', {
        format: extension,
        base64Size: `${(base64Size / 1024).toFixed(2)} KB`,
        fullSize: `${(base64Size * 0.75 / 1024).toFixed(2)} KB (estimated)`, // Base64 is ~33% larger
        isOriginal: true,
        note: 'Original quality - no compression applied'
      });

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Download Icon Component
  const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  );

  return (
    <div className={`group w-full text-textMain py-2 ${isUser ? '' : (isDarkMode ? 'bg-transparent' : 'bg-transparent')}`}>
      <div className={`m-auto w-full max-w-3xl p-4 md:p-6 flex gap-6 ${isUser ? 'flex-row-reverse' : ''}`}>

        {/* Avatar 3D - Only for AI */}
        {!isUser && (
          <div className="flex-shrink-0 flex flex-col relative">
            <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border-t border-white/10
            ${isDarkMode ? 'bg-gradient-to-br from-surfaceHighlight to-surface shadow-convex' : 'bg-white border border-gray-200'}
          `}>
              <div className="animate-in fade-in zoom-in duration-300 scale-90">
                {/* 1. Custom Agent Avatar URL */}
                {agent?.avatarUrl ? (
                  <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover rounded-xl" />
                ) : agent?.icon && AGENT_ICONS[agent.icon] ? (
                  /* 2. Specific Agent Icon */
                  React.createElement(AGENT_ICONS[agent.icon], { className: `w-6 h-6 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}` })
                ) : message.modelId ? (
                  /* 3. Provider/Model Icon (Fallback) */
                  getProviderIcon(
                    AVAILABLE_MODELS.find(m => m.id === message.modelId)?.provider ||
                    (message.modelId.includes('gpt') ? 'OpenAI' :
                      message.modelId.includes('claude') ? 'Anthropic' :
                        message.modelId.includes('gemini') ? 'Google' : 'DrPro')
                  )
                ) : (
                  <IconBot className="text-emerald-500" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`relative flex-1 overflow-hidden ${isUser ? 'flex justify-end' : 'pt-1.5'}`}>
          <div className={`
            ${isUser
              ? 'bg-surfaceHighlight text-textMain border border-borderLight rounded-3xl rounded-tr-sm px-5 py-2.5 max-w-[85%] shadow-md'
              : ''}
          `}>
            {!isUser && (
              <div className="font-bold text-sm mb-3 flex items-center gap-2">
                <span className={`bg-clip-text text-transparent drop-shadow-sm tracking-wide ${isDarkMode ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
                  {agent ? agent.name : 'Dr. GPT'}
                </span>
                <span className="text-[10px] text-textMuted font-normal ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {message.attachments.map((att, idx) => (
                  <div key={idx} className="relative group overflow-hidden rounded-xl border border-borderLight shadow-sm bg-surface">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[200px] object-cover hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 hover:bg-surfaceHighlight transition-colors">
                        <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </div>
                        <span className="text-sm font-medium text-textMain">{att.name}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={`prose ${isDarkMode ? 'prose-invert text-gray-300' : 'prose-slate text-textMain'} ${isUser ? 'prose-p:my-0' : 'prose-sm ai-response'} leading-relaxed prose-p:leading-relaxed prose-li:leading-relaxed prose-pre:bg-surface prose-pre:shadow-inner-depth prose-pre:border prose-pre:border-borderLight prose-pre:rounded-xl max-w-none font-normal tracking-wide select-text`}>
              {/* Thinking State */}
              {message.isStreaming && !message.content && (
                <div className="flex items-center gap-2 text-textMuted animate-pulse">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                  <span className="text-sm font-medium">Pensando...</span>
                </div>
              )}

              <div className="relative">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // 🔧 FIX: Manual header sizing
                    h1({ children }) {
                      return <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>;
                    },
                    h2({ children }) {
                      return <h2 className="text-lg font-bold mb-3 mt-5">{children}</h2>;
                    },
                    h3({ children }) {
                      return <h3 className="text-base font-bold mb-2 mt-4">{children}</h3>;
                    },
                    // 🔗 FIX: Open links in new tab
                    a({ node, children, ...props }) {
                      return (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-400 hover:underline transition-colors"
                        >
                          {children}
                        </a>
                      );
                    },
                    img({ node, ...props }) {
                      const imgProps = props as any; // 🔧 FIX: Cast to any to avoid TS errors with react-markdown types
                      return (
                        <span className="relative inline-block group/image my-4">
                          <img
                            {...imgProps}
                            loading="lazy" // 🔧 FIX: Native lazy loading
                            decoding="async" // 🔧 FIX: Async decode to prevent blocking
                            className="max-w-full h-auto rounded-lg shadow-md border border-borderLight"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              console.error("Image load error:", imgProps.src);
                            }}
                          />
                          {/* Download button overlay */}
                          {imgProps.src && imgProps.src.startsWith('data:image') && (
                            <button
                              onClick={() => handleDownloadImage(imgProps.src || '', imgProps.alt)}
                              className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-all duration-200 bg-surface/90 backdrop-blur-sm border border-borderLight rounded-lg p-2 shadow-lg hover:bg-surfaceHighlight hover:scale-110 active:scale-95"
                              title="Baixar imagem"
                              aria-label="Baixar imagem"
                            >
                              <DownloadIcon />
                            </button>
                          )}
                        </span>
                      );
                    },
                    // Code Blocks 3D Style
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <div className="rounded-xl bg-surface border border-borderLight my-6 overflow-hidden shadow-2xl relative group/code">
                          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10"></div>
                          <div className="bg-surfaceHighlight px-4 py-2.5 text-xs text-textMuted border-b border-borderLight flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                              </div>
                              <span className="font-mono font-medium ml-2 text-gray-500">{match[1]}</span>
                            </div>
                            <span className="text-[10px] uppercase opacity-50 font-bold tracking-wider">Terminal</span>
                          </div>
                          <pre className="p-5 overflow-x-auto text-sm font-mono leading-relaxed custom-scrollbar bg-black/5 shadow-inner">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      ) : (
                        <code className="bg-surfaceHighlight px-1.5 py-0.5 rounded-md border border-borderLight text-sm font-mono text-emerald-500 shadow-sm" {...props}>
                          {children}
                        </code>
                      )
                    },
                    // Tables 3D
                    table({ children }) {
                      return (
                        <div className="my-6 w-full overflow-hidden rounded-xl border border-borderLight overflow-x-auto shadow-card-3d bg-surface">
                          <table className="min-w-full divide-y divide-borderLight text-sm text-left">
                            {children}
                          </table>
                        </div>
                      );
                    },
                    thead({ children }) {
                      return (
                        <thead className="bg-surfaceHighlight text-textMain font-semibold shadow-sm">
                          {children}
                        </thead>
                      );
                    },
                    tbody({ children }) {
                      return (
                        <tbody className="divide-y divide-borderLight">
                          {children}
                        </tbody>
                      );
                    },
                    tr({ children }) {
                      return (
                        <tr className="transition-colors hover:bg-surfaceHighlight/70">
                          {children}
                        </tr>
                      );
                    },
                    th({ children }) {
                      return (
                        <th className="px-4 py-3 font-semibold text-textMain text-left border-b border-borderLight uppercase tracking-wider text-xs">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return (
                        <td className="px-4 py-3 text-textMain whitespace-normal">
                          {children}
                        </td>
                      );
                    },
                    p({ children }) {
                      const text = String(children);
                      const isMuted = /^(não se aplica|não avaliado|não solicitado|nenhuma|nada consta)/i.test(text) && text.length < 50;
                      return (
                        <p className={`mb-4 leading-relaxed ${isMuted ? 'text-zinc-500 italic opacity-70 text-sm' : ''}`}>
                          {children}
                        </p>
                      );
                    },
                    li({ children }) {
                      const text = String(children);
                      const isMuted = /^(não se aplica|não avaliado|não solicitado|nenhuma|nada consta)/i.test(text) && text.length < 50;
                      return (
                        <li className={`leading-relaxed ${isMuted ? 'text-zinc-500 italic opacity-70 text-sm' : ''}`}>
                          {children}
                        </li>
                      );
                    }
                  }}
                >
                  {(message.displayContent || message.content.split(':::HIDDEN:::')[0].replace(/<UPDATE_ACTION>[\s\S]*?<\/UPDATE_ACTION>/g, '').trim()) + (message.isStreaming ? ' ▍' : '')}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}); // 🔧 FIX: Close React.memo

export default MessageItem;