import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, FileText, Save, ArrowLeft, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { TranscriptSegment } from '../../hooks/useSpeechRecognition';

interface ScribeReviewProps {
    isDarkMode: boolean;
    content: string;
    onChange: (value: string) => void;
    onSave?: () => void;
    onClose?: () => void; // New Prop
    typewriterTrigger?: { content: string; timestamp: number } | null;
    children: React.ReactNode; // The Chat Component
    title?: string; // Customizable Title
    transcriptSegments?: TranscriptSegment[]; // Transcript with timestamps
}

export default function ScribeReview({ isDarkMode, content, onChange, onSave, onClose, typewriterTrigger, children, title = "Revisão de Prontuário", transcriptSegments }: ScribeReviewProps) {
    const [copied, setCopied] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [mobileTab, setMobileTab] = React.useState<'document' | 'chat' | 'transcript'>('document'); // Mobile Tab State
    const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false); // Desktop collapse state
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
        <div className={`flex flex-col md:flex-row w-full h-full overflow-hidden animate-in fade-in duration-300 ${isDarkMode ? 'bg-[#09090b]' : 'bg-gray-50'}`}>

            {/* Mobile Tabs */}
            <div className={`md:hidden flex border-b ${isDarkMode ? 'border-white/10 bg-[#18181b]' : 'border-gray-200 bg-white'}`}>
                {/* Back Button (Mobile Only in Tab Bar?? No, maybe better in header or above tabs) */}
                {/* Actually, let's put a small back button to the left of tabs if needed, OR just rely on the main header back button which we are about to add */}

                <button
                    onClick={() => setMobileTab('document')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${mobileTab === 'document'
                        ? (isDarkMode ? 'border-emerald-500 text-emerald-500' : 'border-emerald-600 text-emerald-600')
                        : 'border-transparent text-gray-500'
                        }`}
                >
                    Documento
                </button>
                <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${mobileTab === 'chat'
                        ? (isDarkMode ? 'border-emerald-500 text-emerald-500' : 'border-emerald-600 text-emerald-600')
                        : 'border-transparent text-gray-500'
                        }`}
                >
                    Chat e Ajustes
                </button>
                {transcriptSegments && transcriptSegments.length > 0 && (
                    <button
                        onClick={() => setMobileTab('transcript')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${mobileTab === 'transcript'
                            ? (isDarkMode ? 'border-emerald-500 text-emerald-500' : 'border-emerald-600 text-emerald-600')
                            : 'border-transparent text-gray-500'
                            }`}
                    >
                        Transcrição
                    </button>
                )}
            </div>

            {/* Left Column: SOAP Editor (60%) or Mobile 'document' tab */}
            <div className={`
                ${mobileTab === 'document' ? 'flex' : 'hidden'} 
                md:flex w-full md:w-[60%] flex-col border-r h-full relative 
                ${isDarkMode ? 'border-white/10' : 'border-gray-200'}
            `}>

                {/* Header */}
                <div className={`h-16 flex items-center justify-between px-4 md:px-6 border-b shrink-0 ${isDarkMode ? 'bg-[#18181b] border-white/5' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                        {/* Back Button */}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className={`p-2 rounded-lg mr-1 transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                                title="Voltar"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}

                        <div className={`p-1.5 md:p-2 rounded-lg shrink-0 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                            <FileText size={18} />
                        </div>
                        <h2 className={`font-bold text-base md:text-lg truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {title}
                        </h2>
                        {isUpdating && (
                            <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                Atualizando...
                            </span>
                        )}
                    </div>

                    <div className="flex items-center shrink-0">
                        <button
                            onClick={handleCopy}
                            disabled={isUpdating}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all
                                ${copied
                                    ? 'bg-emerald-500 text-white'
                                    : (isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50')
                                }
                                ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isUpdating}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ml-2
                                ${saving
                                    ? 'bg-emerald-500 text-white'
                                    : (isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50')
                                }
                                ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {saving ? <Check size={14} /> : <Save size={14} />}
                            <span className="hidden sm:inline">{saving ? 'Salvo!' : 'Salvar'}</span>
                        </button>
                    </div>

                </div>

                {/* Editor Area */}
                <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        readOnly={isUpdating}
                        className={`
                            w-full flex-1 p-4 md:p-6 text-sm md:text-base leading-relaxed resize-none text-left outline-none rounded-xl border
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

                    {/* Transcript Section (Desktop Only - Collapsible) */}
                    {transcriptSegments && transcriptSegments.length > 0 && (
                        <div className="hidden md:block mt-4">
                            <button
                                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${isDarkMode
                                    ? 'bg-zinc-900/50 border-white/10 hover:bg-zinc-900'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                <span className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                                    📝 Transcrição Original ({transcriptSegments.length} segmentos)
                                </span>
                                <ChevronDown
                                    size={18}
                                    className={`transition-transform ${isTranscriptExpanded ? 'rotate-180' : ''} ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'
                                        }`}
                                />
                            </button>

                            {isTranscriptExpanded && (
                                <div className={`mt-2 rounded-xl p-4 max-h-64 overflow-y-auto border ${isDarkMode ? 'bg-zinc-900/30 border-white/5' : 'bg-gray-50 border-gray-100'
                                    }`}>
                                    <div className="space-y-3">
                                        {transcriptSegments.map((segment, index) => {
                                            const minutes = Math.floor(segment.timestamp / 60);
                                            const seconds = segment.timestamp % 60;
                                            const timeStr = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

                                            return (
                                                <div key={index} className="flex gap-3">
                                                    <span className={`text-xs font-mono shrink-0 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                                        }`}>
                                                        {timeStr}
                                                    </span>
                                                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'
                                                        }`}>
                                                        {segment.text}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column or Mobile Tabs: Chat & Transcript */}
            {mobileTab === 'transcript' && transcriptSegments && transcriptSegments.length > 0 ? (
                <div className="md:hidden w-full h-full flex flex-col p-4">
                    <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        📝 Transcrição Original
                    </h3>
                    <div className={`flex-1 rounded-xl p-4 overflow-y-auto border ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-gray-50 border-gray-100'
                        }`}>
                        <div className="space-y-3">
                            {transcriptSegments.map((segment, index) => {
                                const minutes = Math.floor(segment.timestamp / 60);
                                const seconds = segment.timestamp % 60;
                                const timeStr = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

                                return (
                                    <div key={index} className="flex gap-3">
                                        <span className={`text-xs font-mono shrink-0 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                            }`}>
                                            {timeStr}
                                        </span>
                                        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'
                                            }`}>
                                            {segment.text}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`
                    ${mobileTab === 'chat' ? 'flex' : 'hidden'} 
                    md:flex w-full md:w-[40%] h-full relative flex-col
                `}>
                    {children}
                </div>
            )}
        </div>
    );
}
