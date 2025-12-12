import React, { useEffect, useRef } from 'react';
import { Copy, Check, FileText, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScribeReviewProps {
    isDarkMode: boolean;
    content: string;
    onChange: (value: string) => void;
    onSave?: () => void;
    typewriterTrigger?: { content: string; timestamp: number } | null;
    children: React.ReactNode; // The Chat Component
    title?: string; // Customizable Title
}

export default function ScribeReview({ isDarkMode, content, onChange, onSave, typewriterTrigger, children, title = "Revisão de Prontuário" }: ScribeReviewProps) {
    const [copied, setCopied] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);
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
        <div className={`flex w-full h-full overflow-hidden animate-in fade-in duration-300 ${isDarkMode ? 'bg-[#09090b]' : 'bg-gray-50'}`}>

            {/* Left Column: SOAP Editor (60%) */}
            <div className={`w-[60%] flex flex-col border-r h-full relative ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>

                {/* Header */}
                <div className={`h-16 flex items-center justify-between px-6 border-b ${isDarkMode ? 'bg-[#18181b] border-white/5' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                            <FileText size={20} />
                        </div>
                        <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {title}
                        </h2>
                        {isUpdating && (
                            <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                Atualizando...
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleCopy}
                        disabled={isUpdating}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                            ${copied
                                ? 'bg-emerald-500 text-white'
                                : (isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50')
                            }
                            ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copiado!' : 'Copiar Prontuário'}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isUpdating}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ml-2
                            ${saving
                                ? 'bg-emerald-500 text-white'
                                : (isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50')
                            }
                            ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {saving ? <Check size={16} /> : <Save size={16} />}
                        {saving ? 'Salvo!' : 'Salvar'}
                    </button>

                </div>

                {/* Editor Area */}
                <div className="flex-1 p-6 overflow-hidden">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        readOnly={isUpdating}
                        className={`
                            w-full h-full p-6 text-base leading-normal resize-none text-left outline-none rounded-xl border
                            font-mono
                            ${isDarkMode
                                ? 'bg-[#121215] border-white/5 text-zinc-300 placeholder-zinc-700 focus:border-emerald-500/50'
                                : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-emerald-500'
                            }
                            ${isUpdating ? 'cursor-wait opacity-90' : ''}
                            transition-all scrollbar-thin
                        `}
                        placeholder="O prontuário gerado aparecerá aqui..."
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Right Column: Chat (40%) */}
            <div className="w-[40%] h-full relative flex flex-col">
                {children}
            </div>
        </div>
    );
}
