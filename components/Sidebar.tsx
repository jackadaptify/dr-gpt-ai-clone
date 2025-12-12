import React, { useState } from 'react';
import { ChatSession, Folder, Agent, AppMode } from '../types';
import { IconPlus, IconMessage, IconFolder, IconSearch, IconSettings, IconSun, IconMoon, IconTrash, IconEdit, IconCheck } from './Icons';
import AgentsList from './AgentsList';
import UserMenu from './UserMenu';

interface SidebarProps {
  chats: ChatSession[];
  folders: Folder[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onSelectAgent: (agent: Agent) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  agents: Agent[];
  activeMode: AppMode;
}

export default function Sidebar({
  chats,
  folders,
  currentChatId,
  onSelectChat,
  onNewChat,
  onSelectAgent,
  isOpen,
  setIsOpen,
  isDarkMode,
  toggleTheme,
  agents,
  activeMode
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Mode-Specific Content
  const renderContent = () => {
    switch (activeMode) {
      case 'chat':
        return (
          <>
            {/* Agents List */}
            <AgentsList onSelectAgent={onSelectAgent} isDarkMode={isDarkMode} agents={agents} />

            {/* Folders (Mock) */}
            <div className="px-3 mt-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Pastas</h3>
              <div className="space-y-1">
                {folders.map(folder => (
                  <button key={folder.id} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${isDarkMode ? 'text-textMuted hover:text-textMain hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'}`}>
                    <span className="text-emerald-500/80 group-hover:text-emerald-500 transition-colors"><IconFolder /></span>
                    {folder.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Chats */}
            <div className="px-3 mt-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Histórico</h3>
              <div className="space-y-1">
                {chats.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(chat => {
                  const isActive = chat.id === currentChatId;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => {
                        onSelectChat(chat.id);
                        if (window.innerWidth < 768) setIsOpen(false);
                      }}
                      className={`
                                    w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-all text-left truncate relative
                                    ${isActive
                          ? (isDarkMode ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-l-2 border-emerald-500 text-textMain shadow-inner' : 'bg-gray-200 text-textMain font-semibold')
                          : 'text-textMuted hover:bg-black/5 hover:text-textMain border-l-2 border-transparent'}
                                    `}
                    >
                      <span className={`shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-textMuted'}`}><IconMessage /></span>
                      <span className="truncate">{chat.title}</span>
                      {isActive && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        );

      case 'scribe':
        return (
          <div className="px-4 text-center mt-10">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
              <IconEdit />
            </div>
            <p className="text-sm text-textMuted mb-2">Histórico de Scribe</p>
            {/* Placeholder for future Scribe History */}
            <div className={`text-xs p-3 rounded-lg border border-dashed ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'}`}>
              Seus arquivos de áudio e transcrições aparecerão aqui.
            </div>
          </div>
        );

      case 'finance':
        return (
          <div className="px-4 text-center mt-10">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
              <IconCheck />
            </div>
            <p className="text-sm text-textMuted mb-2">Histórico Financeiro</p>
            {/* Placeholder for future Finance History */}
            <div className={`text-xs p-3 rounded-lg border border-dashed ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'}`}>
              Defesas e justificativas geradas aparecerão aqui.
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="px-3 mt-4">
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Configurações</h3>

            <div className="space-y-1">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isDarkMode ? 'text-textMain hover:bg-white/5' : 'text-gray-800 hover:bg-black/5'}`}>
                <span>👤</span> Perfil
              </button>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isDarkMode ? 'text-textMain hover:bg-white/5' : 'text-gray-800 hover:bg-black/5'}`}>
                <span>💳</span> Assinatura
              </button>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isDarkMode ? 'text-textMain hover:bg-white/5' : 'text-gray-800 hover:bg-black/5'}`}>
                <span>🎨</span> Aparência
              </button>
            </div>
          </div>
        );

      default:
        return <div>Selecione um modo</div>;
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-[280px] text-textMain flex flex-col transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        bg-sidebar backdrop-blur-xl border-r border-borderLight
      `}>
        {/* Header */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-1 py-4 select-none px-2">
            <span className="text-2xl font-black tracking-wide text-white">
              {activeMode === 'chat' ? 'CHAT' : activeMode === 'scribe' ? 'SCRIBE' : activeMode === 'finance' ? 'FINANÇAS' : 'AJUSTES'}
            </span>
          </div>

          <button
            onClick={onNewChat}
            className={`group relative w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3.5 rounded-xl transition-all duration-200 border border-borderLight active:translate-y-[1px] ${isDarkMode ? 'bg-surface hover:bg-surfaceHighlight shadow-card-3d active:shadow-inner' : 'bg-white hover:bg-gray-50 shadow-sm'}`}
          >
            <div className="bg-emerald-500/20 p-1 rounded-full group-hover:bg-emerald-500/30 transition-colors">
              <IconPlus />
            </div>
            <span className="bg-gradient-to-r from-textMain to-textMuted bg-clip-text text-transparent group-hover:text-textMain transition-colors">
              Novo Chat
            </span>
          </button>

          <div className={`relative group ${isDarkMode ? '' : ''}`}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-emerald-500 transition-colors">
              <IconSearch />
            </div>
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none border border-transparent focus:border-emerald-500/50 ${isDarkMode ? 'bg-black/20 focus:bg-black/40 placeholder-textMuted/50' : 'bg-gray-100 focus:bg-white border-gray-200'}`}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 py-2">
          {renderContent()}
        </div>

        {/* Footer / User Profile */}
        <div className="p-4 border-t border-white/5">
          <UserMenu isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        </div>
      </aside>
    </>
  );
}