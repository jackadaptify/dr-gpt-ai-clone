import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, FileText, Save, ArrowLeft, MessageSquare, Edit2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScribeReviewProps {
    isDarkMode: boolean;
    content: string;
    onChange: (value: string) => void;
    onSave?: () => void;
    onClose?: () => void;
    typewriterTrigger?: { content: string; timestamp: number } | null;
    children: React.ReactNode;
    title?: string;
}

export default function ScribeReview({
    isDarkMode,
    content,
    onChange,
    onSave,
    onClose,
    typewriterTrigger,
    children,
    title = "Revisão de Prontuário"
}: ScribeReviewProps) {
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [mobileTab, setMobileTab] = useState<'document' | 'chat'>('document');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        toast.success("Copiado com sucesso!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        if (onSave) {
            setSaving(true);
            await onSave();
            setTimeout(() => setSaving(false), 2000);
        }
    };

    // Typewriter animation effect
    useEffect(() => {
        if (!typewriterTrigger) return;
        const { content: newContent } = typewriterTrigger;

        setIsUpdating(true);
        onChange('');

        let currentIndex = 0;
        const speed = 5;

        const typewriterInterval = setInterval(() => {
            if (currentIndex < newContent.length) {
                onChange(newContent.substring(0, currentIndex + 1));
                currentIndex++;
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                }
            } else {
                clearInterval(typewriterInterval);
                setIsUpdating(false);
                toast.success('Documento atualizado', {
                    position: 'bottom-center',
                    style: {
                        background: isDarkMode ? '#18181b' : '#fff',
                        color: isDarkMode ? '#10b981' : '#059669',
                        border: isDarkMode ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(5, 150, 105, 0.2)',
                    },
                });
            }
        }, speed);

        return () => clearInterval(typewriterInterval);
    }, [typewriterTrigger]);

    return (
        <div className="flex flex-col h-full w-full max-w-[98%] xl:max-w-[1600px] mx-auto gap-4 p-2 md:p-6 animate-in fade-in duration-500 overflow-hidden text-textMain">

            {/* --- TOP HEADER --- */}
            <div className="w-full flex items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-3 flex-1">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl bg-surface hover:bg-surfaceHighlight text-textMuted hover:text-textMain border border-borderLight transition-all active:scale-95"
                            title="Voltar"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-textMain leading-tight">{title}</h2>
                            <p className="text-xs text-textMuted hidden md:block">Revise e edite o documento gerado</p>
                        </div>
                    </div>
                </div>

                {/* Status Badge & Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Status Badge */}
                    {isUpdating && (
                        <div className="hidden md:flex px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-500">Gerando...</span>
                        </div>
                    )}

                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        disabled={isUpdating}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 border active:scale-95
                            ${copied
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-surface hover:bg-surfaceHighlight border-borderLight text-textMain'
                            }
                            ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        title="Copiar Texto"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        <span className="hidden md:inline">{copied ? "Copiado!" : "Copiar"}</span>
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={isUpdating}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 border active:scale-95
                            ${saving
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-emerald-600 border-emerald-500/30 text-white hover:bg-emerald-500 hover:border-emerald-500 shadow-lg shadow-emerald-900/20'
                            }
                            ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        title="Salvar Prontuário"
                    >
                        {saving ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        <span className="hidden md:inline">{saving ? "Salvo!" : "Salvar"}</span>
                    </button>
                </div>
            </div>

            {/* --- MOBILE TAB SWITCHER --- */}
            <div className="md:hidden flex p-1.5 bg-black/20 border border-white/5 rounded-xl shrink-0 backdrop-blur-sm mx-2 mb-1">
                <button
                    onClick={() => setMobileTab('document')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 border active:scale-[0.98] ${mobileTab === 'document'
                        ? 'bg-[#1A1A1A] text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'border-transparent text-textMuted/60 hover:text-textMain hover:bg-white/5'}`}
                >
                    Documento
                </button>
                <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 border active:scale-[0.98] ${mobileTab === 'chat'
                        ? 'bg-[#1A1A1A] text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'border-transparent text-textMuted/60 hover:text-textMain hover:bg-white/5'}`}
                >
                    Chat e Ajustes
                </button>
            </div>

            {/* --- MAIN CONTENT (Two Columns) --- */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4 md:gap-6 relative z-10">

                {/* --- LEFT PANEL: DOCUMENT EDITOR (60%) --- */}
                <div className={`
                    flex flex-col w-full md:w-[60%] h-full bg-[#141414] rounded-2xl md:rounded-3xl shadow-none overflow-hidden relative border border-white/[0.06]
                    ${mobileTab === 'document' ? 'flex' : 'hidden md:flex'}
                `}>
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-3 md:px-5 py-2 md:py-3 bg-white/[0.02] shrink-0 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-xs md:text-sm">Editor de Prontuário</span>
                        </div>
                    </div>

                    {/* Textarea Area */}
                    <div className={`flex-1 relative transition-all duration-500 ${isUpdating ? 'bg-emerald-500/5 ring-1 ring-emerald-500/20' : 'bg-transparent'}`}>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => onChange(e.target.value)}
                            readOnly={isUpdating}
                            placeholder="O prontuário gerado aparecerá aqui..."
                            className="w-full h-full resize-none bg-transparent p-6 md:p-8 outline-none text-textMain text-sm md:text-base leading-relaxed md:leading-8 font-mono placeholder-textMuted/30 custom-scrollbar"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* --- RIGHT PANEL: CHAT / CONTEXT (40%) --- */}
                <div className={`
                    flex flex-col w-full md:w-[40%] h-full bg-[#121212] rounded-2xl md:rounded-3xl shadow-2xl shadow-black/40 overflow-hidden relative border border-white/[0.06]
                    ${mobileTab === 'chat' ? 'flex' : 'hidden md:flex'}
                `}>
                    {/* Panel Header */}
                    <div className="px-5 py-4 bg-white/[0.02] border-b border-white/[0.06] flex items-center gap-2 backdrop-blur-md shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        <span className="text-xs font-bold text-textMuted uppercase tracking-wider">Chat & Ajustes</span>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 overflow-hidden relative">
                        {children}
                    </div>
                </div>

            </div>

            {/* --- FOOTER REMOVED --- */}
            {/* The action buttons are now in the header for better UX and more space */}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
}
