import React, { useState, useEffect } from 'react';
import { X, Mic, Square, Shield, Pencil } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface AntiGlosaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (text: string) => void;
    isDarkMode: boolean;
}

export default function AntiGlosaModal({ isOpen, onClose, onGenerate, isDarkMode }: AntiGlosaModalProps) {
    const { isListening, transcript, toggleListening } = useSpeechRecognition();
    const [localText, setLocalText] = useState('');
    const [textBeforeRecording, setTextBeforeRecording] = useState('');

    // Handle toggle listening wrapper to save state
    const handleToggleListening = () => {
        if (!isListening) {
            setTextBeforeRecording(localText);
        }
        toggleListening();
    };

    // Sync local text with hook transcript if recording
    useEffect(() => {
        if (isListening && transcript) {
            setLocalText((textBeforeRecording ? textBeforeRecording + ' ' : '') + transcript);
        }
    }, [transcript, isListening, textBeforeRecording]);

    if (!isOpen) return null;

    const handleGenerate = () => {
        if (localText.trim()) {
            onGenerate(localText);
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
                            <Shield size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-textMain">
                            Defesa de Procedimento
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
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-textMain">
                            Descreva o caso e a negativa
                        </h3>
                        <p className="text-sm text-textMuted">
                            Eu crio a carta técnica baseada na ANS.
                        </p>
                    </div>

                    {/* Text Input Area (Primary) */}
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-2 px-1 text-textMuted">
                            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                                <Pencil size={12} />
                                <span>Detalhes do Caso</span>
                            </div>
                        </div>
                        <textarea
                            value={localText}
                            onChange={(e) => setLocalText(e.target.value)}
                            placeholder="Ex: Paciente João Silva, 45 anos. Convênio negou Cirurgia Bariátrica alegando falta de tratamento clínico prévio. Paciente tem IMC 40, hipertensão e tentou dieta por 2 anos sem sucesso. Preciso de uma justificativa técnica citando a resolução da ANS."
                            className="w-full p-4 rounded-xl text-left h-48 text-sm resize-none outline-none border transition-all bg-surfaceHighlight text-textMain border-borderLight focus:border-emerald-500/50 focus:bg-surface"
                        />
                    </div>

                    {/* Audio Input (Secondary) */}
                    <div className="flex items-center gap-4 w-full justify-center pt-2">
                        <div className="text-xs font-medium uppercase tracking-wider text-textMuted">
                            Ou dite o caso:
                        </div>
                        <button
                            onClick={handleToggleListening}
                            className={`
                                relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg group
                                ${isListening
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                    : 'bg-surfaceHighlight hover:bg-surface border border-borderLight'}
                            `}
                            title="Gravar áudio"
                        >
                            {isListening && (
                                <span className="absolute inset-0 rounded-full border-2 border-red-400/30 animate-ping" />
                            )}

                            {isListening ? (
                                <Square size={16} className="text-white fill-current" />
                            ) : (
                                <Mic size={20} className="text-textMuted group-hover:text-textMain" />
                            )}
                        </button>

                        {isListening && (
                            <div className="h-8 flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1 bg-emerald-500 rounded-full animate-sound-wave`}
                                        style={{
                                            animationDuration: `${0.4 + Math.random() * 0.4}s`,
                                            height: `${20 + Math.random() * 80}%`
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-borderLight bg-surface/50">
                    <button
                        onClick={handleGenerate}
                        disabled={!localText.trim()}
                        className={`
                            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                            ${localText.trim()
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5'
                                : 'bg-surfaceHighlight text-textMuted cursor-not-allowed'}
                        `}
                    >
                        <Shield size={20} />
                        Gerar Defesa Técnica
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
