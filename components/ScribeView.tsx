import React, { useState, useEffect } from 'react';
import { Mic, Square, FileText, Settings, Loader2, Pencil } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ScribeViewProps {
    isDarkMode: boolean;
    onGenerate: (text: string) => void;
}

export default function ScribeView({ isDarkMode, onGenerate }: ScribeViewProps) {
    const { isListening, transcript, toggleListening } = useSpeechRecognition();
    const [localTranscript, setLocalTranscript] = useState('');

    // Sync local transcript with hook transcript
    useEffect(() => {
        if (transcript) {
            setLocalTranscript(transcript);
        }
    }, [transcript]);

    const handleGenerate = () => {
        if (localTranscript.trim()) {
            onGenerate(localTranscript);
        }
    };

    return (
        <div className={`flex flex-col h-full w-full max-w-4xl mx-auto p-6 animate-in fade-in duration-500`}>
            {/* Header */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl mb-4 bg-emerald-500/10 text-emerald-500">
                    <Mic size={32} />
                </div>
                <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    AI Scribe
                </h1>
                <p className={`text-lg ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Documentação clínica automática em tempo real.
                </p>
            </div>

            {/* Main Card */}
            <div className={`
                flex-1 flex flex-col rounded-3xl shadow-xl overflow-hidden mb-6 relative
                ${isDarkMode ? 'bg-[#18181b] border border-white/10' : 'bg-white border border-gray-200'}
            `}>

                {/* Visualizer Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 min-h-[300px]">

                    {/* Status Text */}
                    <div className={`text-center transition-opacity duration-300 ${isListening ? 'opacity-100' : 'opacity-70'}`}>
                        <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {isListening ? "Ouvindo consulta..." : "Pronto para iniciar"}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                            {isListening ? "Pode falar naturalmente." : "Toque no microfone para começar."}
                        </p>
                    </div>

                    {/* Main Button */}
                    <button
                        onClick={toggleListening}
                        className={`
                            relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl group
                            ${isListening
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}
                        `}
                    >
                        {isListening && (
                            <span className="absolute inset-0 rounded-full border-4 border-red-400/30 animate-ping" />
                        )}

                        {isListening ? (
                            <Square size={40} className="text-white fill-current" />
                        ) : (
                            <Mic size={48} className="text-white" />
                        )}
                    </button>

                    {/* Waveform Visualization (Mock) */}
                    <div className="h-16 flex items-center justify-center gap-1.5 w-full max-w-md overflow-hidden">
                        {isListening ? (
                            Array.from({ length: 20 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 bg-emerald-500 rounded-full animate-sound-wave opacity-50`}
                                    style={{
                                        animationDuration: `${0.4 + Math.random() * 0.4}s`,
                                        height: `${20 + Math.random() * 80}%`
                                    }}
                                />
                            ))
                        ) : (
                            <div className={`h-1 w-full rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`} />
                        )}
                    </div>

                </div>

                {/* Transcript Preview & Edit */}
                <div className={`
                    border-t p-0 transition-all duration-500
                    ${localTranscript || isListening ? 'h-48' : 'h-0 overflow-hidden border-none'}
                    ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'}
                 `}>
                    <div className="p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <div className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                <Pencil size={12} />
                                <span>Transcrição</span>
                            </div>
                        </div>
                        <textarea
                            value={localTranscript}
                            onChange={(e) => setLocalTranscript(e.target.value)}
                            placeholder="A transcrição aparecerá aqui..."
                            className={`
                                flex-1 w-full bg-transparent resize-none outline-none text-sm leading-relaxed
                                ${isDarkMode ? 'text-zinc-300 placeholder-zinc-700' : 'text-gray-600 placeholder-gray-400'}
                            `}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <button
                onClick={handleGenerate}
                disabled={!localTranscript}
                className={`
                    w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all
                    ${localTranscript
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5'
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}
                `}
            >
                <div className="p-1 bg-white/20 rounded-lg">
                    <FileText size={20} />
                </div>
                Gerar Documentação Clínica
            </button>

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
