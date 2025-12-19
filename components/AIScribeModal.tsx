import React, { useState, useEffect } from 'react';
import { X, Mic, Square, FileText, CheckCircle, Loader2, Pencil } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface AIScribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (text: string) => void;
    isDarkMode: boolean;
}

export default function AIScribeModal({ isOpen, onClose, onGenerate, isDarkMode }: AIScribeModalProps) {
    const { isListening, transcript, toggleListening, hasSupport } = useSpeechRecognition();
    const [localTranscript, setLocalTranscript] = useState('');

    // Sync local transcript with hook transcript
    useEffect(() => {
        if (transcript) {
            setLocalTranscript(transcript);
        }
    }, [transcript]);

    if (!isOpen) return null;

    const handleGenerate = () => {
        if (localTranscript.trim()) {
            onGenerate(localTranscript);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden transform transition-all bg-surface border border-borderLight">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-borderLight">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Mic size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-textMain">
                            AI Scribe
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors hover:bg-surfaceHighlight text-textMuted hover:text-textMain"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-8">

                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-textMain">
                            Resumo da Consulta
                        </h3>
                        <p className="text-sm text-textMuted">
                            Dite o que aconteceu. Eu gero o SOAP, Receita e Atestado.
                        </p>
                    </div>

                    {/* Visualizer / Status */}
                    <div className="h-24 flex items-center justify-center gap-1.5">
                        {isListening ? (
                            // Animated Bars
                            Array.from({ length: 12 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 bg-emerald-500 rounded-full animate-sound-wave`}
                                    style={{
                                        animationDuration: `${0.4 + Math.random() * 0.4}s`,
                                        height: `${20 + Math.random() * 80}%`
                                    }}
                                />
                            ))
                        ) : (
                            // Idle State
                            <div className="text-sm font-medium text-textMuted">
                                {localTranscript ? "Pronto para gerar." : "Toque para começar"}
                            </div>
                        )}
                    </div>

                    {/* Main Action Button */}
                    <button
                        onClick={toggleListening}
                        className={`
                            relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg group
                            ${isListening
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}
                        `}
                    >
                        {isListening && (
                            <span className="absolute inset-0 rounded-full border-4 border-red-400/30 animate-ping" />
                        )}

                        {isListening ? (
                            <Square size={32} className="text-white fill-current" />
                        ) : (
                            <Mic size={36} className="text-white" />
                        )}
                    </button>

                    {/* Transcript Preview (Editable) */}
                    {(localTranscript || isListening) && (
                        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-2 px-1 text-textMuted">
                                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                                    <Pencil size={12} />
                                    <span>Transcrição (Toque para corrigir)</span>
                                </div>
                                <span className="text-[10px] opacity-70">Edite antes de gerar</span>
                            </div>
                            <textarea
                                value={localTranscript}
                                onChange={(e) => setLocalTranscript(e.target.value)}
                                placeholder="A transcrição aparecerá aqui..."
                                className="w-full p-4 rounded-xl text-left h-32 text-sm resize-none outline-none border transition-all bg-surfaceHighlight text-textMain border-borderLight focus:border-emerald-500/50 focus:bg-surface"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-borderLight bg-surface/50">
                    <button
                        onClick={handleGenerate}
                        disabled={!localTranscript}
                        className={`
                            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                            ${localTranscript
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5'
                                : 'bg-surfaceHighlight text-textMuted cursor-not-allowed'}
                        `}
                    >
                        <FileText size={20} />
                        Gerar Documentos
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes sound-wave {
                    0%, 100% { height: 20%; opacity: 0.5; }
                    50% { height: 100%; opacity: 1; }
                }
                .animate-sound-wave {
                    animation: sound-wave 0.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
