import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Role, AVAILABLE_MODELS } from '../types';
import { IconBot, IconUser, getProviderIcon } from './Icons';

interface MessageItemProps {
  message: Message;
  isDarkMode: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isDarkMode }) => {
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
      <div className="m-auto w-full max-w-3xl p-4 md:p-6 flex gap-6">

        {/* Avatar 3D */}
        <div className="flex-shrink-0 flex flex-col relative">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border-t border-white/10
            ${isUser
              ? (isDarkMode ? 'bg-gradient-to-br from-surfaceHighlight to-surface shadow-convex' : 'bg-gray-100')
              : (isDarkMode ? 'bg-gradient-to-br from-surfaceHighlight to-surface shadow-convex' : 'bg-white border border-gray-200')}
          `}>
            {isUser ? (
              <div className="text-textMuted scale-90">
                <IconUser />
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in duration-300 scale-90">
                {/* Dynamic Icon based on Model ID */}
                {message.modelId ? (
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
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden pt-1.5">
          <div className="font-bold text-sm mb-3 flex items-center gap-2">
            {isUser ? (
              <span className="text-textMuted">Você</span>
            ) : (
              <span className={`bg-clip-text text-transparent drop-shadow-sm tracking-wide ${isDarkMode ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>Dr. GPT</span>
            )}
            <span className="text-[10px] text-textMuted font-normal ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

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

          <div className="prose dark:prose-invert prose-p:leading-7 prose-pre:bg-surface prose-pre:shadow-inner-depth prose-pre:border prose-pre:border-borderLight prose-pre:rounded-xl max-w-none text-[15px] text-textMain font-normal tracking-wide">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={(value) => value} // Allow all URLs including data:
              components={{
                img({ node, ...props }) {
                  return (
                    <div className="relative inline-block group/image my-4">
                      <img
                        {...props}
                        className="max-w-full h-auto rounded-lg shadow-md border border-borderLight"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          console.error("Image load error:", props.src);
                        }}
                      />
                      {/* Download button overlay */}
                      {props.src && props.src.startsWith('data:image') && (
                        <button
                          onClick={() => handleDownloadImage(props.src || '', props.alt)}
                          className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-all duration-200 bg-surface/90 backdrop-blur-sm border border-borderLight rounded-lg p-2 shadow-lg hover:bg-surfaceHighlight hover:scale-110 active:scale-95"
                          title="Baixar imagem"
                          aria-label="Baixar imagem"
                        >
                          <DownloadIcon />
                        </button>
                      )}
                    </div>
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
                    <thead className="bg-surfaceHighlight text-textMain font-bold shadow-sm">
                      {children}
                    </thead>
                  );
                },
                tr({ children }) {
                  return (
                    <tr className="transition-colors hover:bg-surfaceHighlight/50">
                      {children}
                    </tr>
                  );
                },
                p({ children }) {
                  return <p className="mb-4 last:mb-0 text-textMain/90">{children}</p>
                },
                strong({ children }) {
                  return <strong className="font-bold text-textMain">{children}</strong>
                },
                ul({ children }) {
                  return <ul className="list-disc pl-4 space-y-2 mb-4 marker:text-emerald-500">{children}</ul>
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-4 space-y-2 mb-4 marker:text-emerald-500">{children}</ol>
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <div className="flex items-center gap-1 mt-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;