import React, { useEffect, useRef } from 'react';
import { Copy, Check, FileText, Save, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScribeReviewProps {
    isDarkMode: boolean;
    content: string;
    onChange: (value: string) => void;
    onSave?: () => void;
    onClose?: () => void; // New Prop
    typewriterTrigger?: { content: string; timestamp: number } | null;
    children: React.ReactNode; // The Chat Component
    title?: string; // Customizable Title
}

export default function ScribeReview({ isDarkMode, content, onChange, onSave, onClose, typewriterTrigger, children, title = "Revisão de Prontuário" }: ScribeReviewProps) {
    const [copied, setCopied] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [mobileTab, setMobileTab] = React.useState<'document' | 'chat'>('document'); // Mobile Tab State
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
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

        const { content: newContent, timestamp } = typewriterTrigger;

        // Trigger the animation
        setIsUpdating(true);

        // Clear current content
        onChange('');

        // Start typewriter animation
        let currentIndex = 0;
        const speed = 8; // milliseconds per character (5-10ms range)

        const typewriterInterval = setInterval(() => {
            if (currentIndex < newContent.length) {
                onChange(newContent.substring(0, currentIndex + 1));
                currentIndex++;

                // Auto-scroll textarea to bottom during typing
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                }
            } else {
                // Animation complete
                clearInterval(typewriterInterval);
                setIsUpdating(false);

                // Show toast notification
                toast.success('Documento atualizado', {
                    duration: 2000,
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
    }, [typewriterTrigger]); // Only trigger when typewriterTrigger changes

    return (
        <div className="flex flex-col md:flex-row w-full h-full overflow-hidden animate-in fade-in duration-300 bg-background">

            {/* Mobile Tabs */}
            <div className="md:hidden flex p-1.5 bg-black/20 border-b border-white/5 shrink-0 backdrop-blur-sm z-20">
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
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 border active:scale-[0.98] ml-2 ${mobileTab === 'chat'
                        ? 'bg-[#1A1A1A] text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'border-transparent text-textMuted/60 hover:text-textMain hover:bg-white/5'}`}
                >
                    Chat e Ajustes
                </button>
            </div>

            {/* Left Column: SOAP Editor (60%) or Mobile 'document' tab */}
            <div className={`
                ${mobileTab === 'document' ? 'flex' : 'hidden'} 
                md:flex w-full md:w-[60%] flex-col border-r border-white/5 h-full relative bg-[#09090b]
            `}>

                {/* Header */}
                <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5 shrink-0 bg-white/[0.02] backdrop-blur-md">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {/* Back Button */}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl transition-all duration-200 hover:bg-white/10 text-textMuted hover:text-white border border-transparent hover:border-white/10 active:scale-95"
                                title="Voltar"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}

                        <div className="p-2 rounded-xl shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
                            <FileText size={18} />
                        </div>
                        <h2 className="font-bold text-base md:text-lg truncate text-textMain tracking-tight">
                            {title}
                        </h2>
                        {isUpdating && (
                            <span className="text-[10px] md:text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse font-medium">
                                Gerando...
                            </span>
                        )}
                    </div>

                    <div className="flex items-center shrink-0 gap-2">
                        <button
                            onClick={handleCopy}
                            disabled={isUpdating}
                            className={`
                                flex items-center gap-2 px-3 py-2 md:px-4 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 active:scale-95 border
                                ${copied
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                    : 'bg-white/5 text-textMuted hover:text-white border-white/5 hover:bg-white/10'
                                }
                                ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isUpdating}
                            className={`
                                flex items-center gap-2 px-3 py-2 md:px-4 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 active:scale-95 border
                                ${saving
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                    : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
                                }
                                ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {saving ? <Check size={16} /> : <Save size={16} />}
                            <span className="hidden sm:inline">{saving ? 'Salvo!' : 'Salvar'}</span>
                        </button>
                    </div>

                </div>

                {/* Editor Area */}
                <div className="flex-1 p-4 md:p-6 overflow-hidden">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        readOnly={isUpdating}
                        className={`
                            w-full h-full p-6 md:p-8 text-sm md:text-base leading-relaxed resize-none text-left outline-none rounded-2xl border
                            font-mono bg-[#141414] border-white/5 text-slate-200 placeholder-textMuted focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 shadow-inner
                            ${isUpdating ? 'cursor-wait opacity-90' : ''}
                            transition-all scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                        `}
                        placeholder="O prontuário gerado aparecerá aqui..."
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Right Column: Chat (40%) or Mobile 'chat' tab */}
            <div className={`
                ${mobileTab === 'chat' ? 'flex' : 'hidden'} 
                md:flex w-full md:w-[40%] h-full relative flex-col
            `}>
                {children}
            </div>
        </div>
    );
}
