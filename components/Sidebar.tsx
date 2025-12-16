import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Folder, Agent, AppMode } from '../types';
import { IconMessage, IconSearch, IconBrain } from './Icons';
import { User, CreditCard, Palette, LogOut, Shield, MoreHorizontal, FolderInput, X, Share, Users, Edit2, Archive, Trash2, ChevronRight, CornerUpLeft, Plus, Folder as LucideFolder, ShieldAlert, ClipboardCheck, SquarePen } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import SettingsModal from './SettingsModal';

interface SidebarProps {
  chats: ChatSession[];
  folders: Folder[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;

  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;

  activeMode: AppMode;
  onCreateProject: (name: string) => void;
  onAssignChatToProject: (chatId: string, projectId: string | null) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onDeleteChat: (chatId: string) => void;
  onModeChange: (mode: AppMode) => void;

  settingsTab: 'profile' | 'subscription' | 'appearance' | 'security';
  onSettingsTabChange: (tab: 'profile' | 'subscription' | 'appearance' | 'security') => void;
}

export default function Sidebar({
  chats,
  folders,
  currentChatId,
  onSelectChat,
  onNewChat,

  isOpen,
  setIsOpen,
  isDarkMode,
  toggleTheme,

  activeMode,
  onCreateProject,
  onAssignChatToProject,
  onRenameChat,
  onDeleteChat,
  onModeChange,
  settingsTab,
  onSettingsTabChange
}: SidebarProps) {
  const { user, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Context Menu State
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter chats based on search and selected folder AND active mode
  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolderId ? chat.folderId === selectedFolderId : true;

    // Mode-Specific Filtering (History Isolation)
    if (activeMode === 'scribe') {
      return matchesSearch && matchesFolder && chat.agentId === 'scribe-mode';
    }
    if (activeMode === 'antiglosa') {
      return matchesSearch && matchesFolder && chat.agentId === 'antiglosa-mode';
    }
    if (activeMode === 'justificativa') {
      return matchesSearch && matchesFolder && chat.agentId === 'justificativa-mode';
    }
    // Chat Mode: Exclude special modes
    // Note: We might want to include 'normal' chats AND agent chats here, but exclude scribe/antiglosa
    return matchesSearch && matchesFolder && chat.agentId !== 'scribe-mode' && chat.agentId !== 'antiglosa-mode' && chat.agentId !== 'justificativa-mode';
  });

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateProject(newFolderName);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuChatId(null);
        setShowMoveSubmenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 5, left: rect.left });
    setOpenMenuChatId(openMenuChatId === chatId ? null : chatId);
    setShowMoveSubmenu(false);
  };

  // Reusable Chat List Component
  const renderChatList = (title: string, emptyMessage: string, icon: any) => (
    <div className="px-3 mt-6">
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
        {title}
      </h3>
      {filteredChats.length === 0 ? (
        <div className={`text-xs p-4 rounded-lg border border-dashed text-center flex flex-col items-center gap-2 ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50 text-zinc-500' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
          {icon}
          <span>{emptyMessage}</span>
        </div>
      ) : (
        <div className="space-y-1 pb-20">
          {filteredChats.map(chat => {
            const isActive = chat.id === currentChatId;
            const isMenuOpen = openMenuChatId === chat.id;

            return (
              <div key={chat.id} className="relative group">
                <button
                  onClick={() => {
                    onSelectChat(chat.id);
                    if (window.innerWidth < 768) setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-all text-left truncate relative group/item
                    ${isActive
                      ? (isDarkMode ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-l-2 border-emerald-500 text-textMain shadow-inner' : 'bg-slate-200 text-slate-900 font-semibold')
                      : 'text-textMuted hover:bg-black/5 hover:text-textMain border-l-2 border-transparent'}
                  `}
                >
                  <span className={`shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-textMuted'}`}><IconMessage /></span>
                  <span className="truncate pr-8">{chat.title}</span>
                </button>

                {/* Trigger Button */}
                <button
                  onClick={(e) => handleMenuClick(e, chat.id)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isMenuOpen ? 'opacity-100 bg-white/10 text-white' : 'text-textMuted hover:bg-white/10 hover:text-white'}`}
                >
                  <MoreHorizontal size={16} />
                </button>

                {/* Context Menu */}
                {isMenuOpen && (
                  <div
                    ref={menuRef}
                    className={`fixed w-64 rounded-xl shadow-2xl border z-50 overflow-hidden backdrop-blur-xl ${isDarkMode ? 'bg-[#18181b]/95 border-zinc-800' : 'bg-white/95 border-slate-200'}`}
                    style={{
                      top: menuPosition?.top || 0,
                      left: menuPosition?.left || 0,
                      transform: 'translateX(10px)' // Little offset
                    }}
                  >
                    <div className="p-1.5 space-y-0.5">
                      <button className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                        <Share size={15} />
                        Compartilhar
                      </button>
                      <button className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                        <Users size={15} />
                        Iniciar um chat em grupo
                      </button>
                      <button
                        onClick={() => {
                          const newName = prompt('Novo nome:', chat.title);
                          if (newName) onRenameChat(chat.id, newName);
                          setOpenMenuChatId(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        <Edit2 size={15} />
                        Renomear
                      </button>

                      {/* Move to Project Submenu Trigger */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMoveSubmenu(!showMoveSubmenu);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'} ${showMoveSubmenu ? 'bg-zinc-800 text-white' : ''}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderInput size={15} />
                            Mover para o projeto
                          </div>
                          <ChevronRight size={14} className={`transition-transform ${showMoveSubmenu ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Nested Submenu */}
                        {showMoveSubmenu && (
                          <div className={`mt-1 ml-2 pl-2 border-l ${isDarkMode ? 'border-zinc-700' : 'border-gray-200'} space-y-0.5 animate-in slide-in-from-left-2 duration-200`}>
                            <button
                              onClick={() => {
                                onAssignChatToProject(chat.id, null);
                                setOpenMenuChatId(null);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                              <CornerUpLeft size={12} />
                              Remover do Projeto
                            </button>
                            {folders.map(f => (
                              <button
                                key={f.id}
                                onClick={() => {
                                  onAssignChatToProject(chat.id, f.id);
                                  setOpenMenuChatId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {f.name}
                              </button>
                            ))}
                            {folders.length === 0 && (
                              <div className="px-3 py-1.5 text-xs text-zinc-500 italic">Sem projetos criados</div>
                            )}
                          </div>
                        )}
                      </div>

                      <button className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${isDarkMode ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                        <Archive size={15} />
                        Arquivar
                      </button>

                      <div className={`h-px my-1 ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'}`} />

                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este chat?')) {
                            onDeleteChat(chat.id);
                            setOpenMenuChatId(null);
                          }
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-red-500 hover:bg-red-500/10`}
                      >
                        <Trash2 size={15} />
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Mode-Specific Content
  const renderContent = () => {
    switch (activeMode) {
      case 'chat':
        return (
          <>


            {/* Folders Section */}
            <div className="px-3 mt-6">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Projetos</h3>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="p-1 hover:bg-emerald-500/10 rounded text-emerald-500 transition-colors"
                  title="Novo Projeto"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Create Folder Input */}
              {isCreatingFolder && (
                <form onSubmit={handleCreateFolder} className="px-2 mb-2">
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nome do projeto..."
                      className={`w-full text-xs px-2 py-1.5 rounded bg-transparent border ${isDarkMode ? 'border-emerald-500/50 text-white' : 'border-emerald-500 text-black'} outline-none`}
                      onBlur={() => !newFolderName && setIsCreatingFolder(false)}
                    />
                  </div>
                </form>
              )}

              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${!selectedFolderId ? (isDarkMode ? 'text-emerald-400 bg-white/5' : 'text-emerald-600 bg-black/5') : (isDarkMode ? 'text-textMuted hover:text-textMain hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5')}`}
                >
                  <span className={!selectedFolderId ? 'text-emerald-500' : 'text-slate-400'}><LucideFolder size={16} /></span>
                  Todos os Chats
                </button>

                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${selectedFolderId === folder.id ? (isDarkMode ? 'text-emerald-400 bg-white/5' : 'text-emerald-600 bg-black/5') : (isDarkMode ? 'text-textMuted hover:text-textMain hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5')}`}
                  >
                    <span className={`${selectedFolderId === folder.id ? 'text-emerald-500' : 'text-emerald-500/80 group-hover:text-emerald-500'} transition-colors`}><LucideFolder size={16} /></span>
                    {folder.name}
                  </button>
                ))}
              </div>
            </div>

            {renderChatList(selectedFolderId ? `Em: ${folders.find(f => f.id === selectedFolderId)?.name}` : 'Histórico', 'Nenhuma conversa encontrada.', <IconMessage />)}
          </>
        );

      case 'scribe':
        return (
          <>
            <div className="px-4 text-center mt-6 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-500">
                <Edit2 />
              </div>
              <p className="text-sm font-medium text-emerald-500">AI Scribe</p>
              <p className="text-xs text-textMuted">Suas consultas gravadas.</p>
            </div>
            {renderChatList('Consultas Recentes', 'Nenhuma consulta gravada ainda.', <Edit2 size={16} />)}
          </>
        );

      case 'antiglosa':
        return (
          <>
            <div className="px-4 text-center mt-6 mb-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-500">
                <Shield size={24} />
              </div>
              <p className="text-sm font-medium text-amber-500">Anti-Glosa</p>
              <p className="text-xs text-textMuted">Suas defesas geradas.</p>
            </div>
            {renderChatList('Defesas Recentes', 'Nenhuma defesa gerada ainda.', <ShieldAlert size={16} />)}
          </>
        );

      case 'settings':
        return (
          <div className="px-3 mt-4 space-y-6">

            {/* User Profile Summary */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-emerald-900/20 mb-3">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
              <h3 className="font-semibold text-white">{user?.full_name || 'Usuário Dr. GPT'}</h3>
              <p className="text-xs text-zinc-400">{user?.email}</p>
              {user?.role === 'admin' && (
                <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
                  Administrador
                </span>
              )}
            </div>

            {/* Menu Options */}
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Conta</h3>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    onModeChange('settings');
                    onSettingsTabChange('profile');
                    if (window.innerWidth < 768) setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeMode === 'settings' && settingsTab === 'profile' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : (isDarkMode ? 'text-textMain hover:bg-white/5' : 'text-gray-800 hover:bg-black/5')}`}
                >
                  <User size={18} className="text-zinc-500" />
                  <span>Dados Pessoais</span>
                </button>

                <button
                  onClick={() => {
                    onModeChange('settings');
                    onSettingsTabChange('subscription');
                    if (window.innerWidth < 768) setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeMode === 'settings' && settingsTab === 'subscription' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : (isDarkMode ? 'text-textMain hover:bg-white/5' : 'text-gray-800 hover:bg-black/5')}`}
                >
                  <CreditCard size={18} className="text-zinc-500" />
                  <span>Assinatura</span>
                </button>

                <button
                  onClick={() => {
                    onModeChange('settings');
                    onSettingsTabChange('appearance');
                    if (window.innerWidth < 768) setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeMode === 'settings' && settingsTab === 'appearance' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : (isDarkMode ? 'text-textMain hover:bg-white/5' : 'text-gray-800 hover:bg-black/5')}`}
                >
                  <Palette size={18} className="text-zinc-500" />
                  <span>Aparência e Cores</span>
                </button>

                <button
                  onClick={() => {
                    onModeChange('settings');
                    onSettingsTabChange('security');
                    if (window.innerWidth < 768) setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeMode === 'settings' && settingsTab === 'security' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : (isDarkMode ? 'text-textMain hover:bg-white/5' : 'text-gray-800 hover:bg-black/5')}`}
                >
                  <Shield size={18} className="text-zinc-500" />
                  <span>Segurança</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Sistema</h3>
              <div className="space-y-1">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => window.open('/admin', '_blank')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isDarkMode ? 'text-textMain hover:bg-white/5' : 'text-gray-800 hover:bg-black/5'}`}
                  >
                    <IconBrain className="w-4 h-4 text-emerald-500" />
                    <span>Painel Admin</span>
                  </button>
                )}

                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-red-400 hover:bg-red-500/10"
                >
                  <LogOut size={18} />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'justificativa':
        return (
          <>
            <div className="px-4 text-center mt-6 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-500">
                <ClipboardCheck size={24} />
              </div>
              <p className="text-sm font-medium text-blue-500">Justificativa Prévia</p>
              <p className="text-xs text-textMuted">Suas autorizações geradas.</p>
            </div>
            {renderChatList('Histórico de Justificativas', 'Nenhuma justificativa gerada ainda.', <ClipboardCheck size={16} />)}
          </>
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-[280px] text-textMain flex flex-col transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        bg-sidebar backdrop-blur-xl border-r border-borderLight
      `}>
        {/* Header */}
        <div className="p-4 space-y-4">
          {/* Header Title - Removed in favor of clearer nav items, or kept small? 
              User wants "everything in sidebar". Let's put the App Modes here.
          */}

          {/* Mobile Navigation Mode Switcher (Visible only on mobile/tablet or if RailNav is hidden) */}
          <div className="block md:hidden space-y-2">
            <div className="flex items-center gap-2 px-2 pb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 overflow-hidden flex items-center justify-center">
                <span className="font-bold text-white text-xs">Dr</span>
              </div>
              <span className="font-bold text-lg">Dr. GPT</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onModeChange('chat'); if (window.innerWidth < 768) setIsOpen(false); }}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${activeMode === 'chat' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-transparent border-transparent hover:bg-white/5 text-textMuted'}`}
              >
                <IconMessage />
                <span className="text-sm font-medium">Chat</span>
              </button>
              <button
                onClick={() => { onModeChange('scribe'); if (window.innerWidth < 768) setIsOpen(false); }}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${activeMode === 'scribe' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-transparent border-transparent hover:bg-white/5 text-textMuted'}`}
              >
                <Edit2 size={18} />
                <span className="text-sm font-medium">Scribe</span>
              </button>
              <button
                onClick={() => { onModeChange('antiglosa'); if (window.innerWidth < 768) setIsOpen(false); }}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${activeMode === 'antiglosa' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-transparent border-transparent hover:bg-white/5 text-textMuted'}`}
              >
                <ShieldAlert size={18} />
                <span className="text-sm font-medium">Glosa</span>
              </button>
              <button
                onClick={() => { onModeChange('justificativa'); if (window.innerWidth < 768) setIsOpen(false); }}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${activeMode === 'justificativa' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-transparent border-transparent hover:bg-white/5 text-textMuted'}`}
              >
                <ClipboardCheck size={18} />
                <span className="text-sm font-medium">Justif.</span>
              </button>
            </div>
            <div className={`h-px w-full my-2 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
          </div>


          {/* Search & New Chat Row */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className={`relative group flex-1`}>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-emerald-500 transition-colors">
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm transition-all outline-none border border-transparent focus:border-emerald-500/50 ${isDarkMode ? 'bg-white/5 focus:bg-white/10 placeholder-textMuted/50' : 'bg-slate-100 focus:bg-white border-slate-200 placeholder-slate-500 text-slate-900'}`}
              />
            </div>

            {/* New Chat Button */}
            <button
              onClick={onNewChat}
              className={`p-2 rounded-lg transition-colors border border-transparent ${isDarkMode ? 'hover:bg-white/10 text-textMuted hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-black'}`}
              title="Novo Chat"
            >
              <SquarePen size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 py-2">
          {renderContent()}
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />
      </aside>
    </>
  );
}