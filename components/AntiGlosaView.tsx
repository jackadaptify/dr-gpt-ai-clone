import React, { useState, useEffect } from 'react';
import { Mic, Square, Shield, Pencil, Send, Menu } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface AntiGlosaViewProps {
    isDarkMode: boolean;
    onGenerate: (text: string, estimatedValue?: number) => void;
    isLoading?: boolean;
    toggleSidebar: () => void;
}

export default function AntiGlosaView({ isDarkMode, onGenerate, isLoading = false, toggleSidebar }: AntiGlosaViewProps) {
    const { isListening, transcript, toggleListening } = useSpeechRecognition();
    const [localText, setLocalText] = useState('');
    const [textBeforeRecording, setTextBeforeRecording] = useState('');

    const [estimatedValue, setEstimatedValue] = useState('');

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

    // Format currency input
    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        const numberValue = Number(value) / 100;
        setEstimatedValue(numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    };

    const handleGenerate = () => {
        if (localText.trim()) {
            // Extract numeric value from string
            const numericValue = Number(estimatedValue.replace(/[^0-9,-]+/g, "").replace(",", "."));
            onGenerate(localText, numericValue);
        }
    };

    return (
        <div className={`flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-500 relative`}>
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm rounded-3xl">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
                    <h3 className="text-xl font-bold text-textMain mb-2">Consultando Jurisprudência...</h3>
                    <p className="text-textMuted">Analisando Rol da ANS e Leis vigentes.</p>
                </div>
            )}

            {/* Header */}
            <div className="mb-8 text-center relative">
                <button
                    onClick={toggleSidebar}
                    className="absolute top-0 left-0 p-2 rounded-xl transition-colors md:hidden hover:bg-surfaceHighlight text-textMuted hover:text-textMain"
                    title="Menu"
                >
                    <Menu size={24} />
                </button>
                <div className="inline-flex items-center justify-center p-3 rounded-2xl mb-4 bg-emerald-500/10 text-emerald-500">
                    <Shield size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-2 text-textMain">
                    Defesa de Procedimento
                </h1>
                <p className="text-lg text-textMuted">
                    Anti-Glosa Inteligente
                </p>
            </div>

            {/* Main Input Card */}
            <div className={`
                flex-1 flex flex-col rounded-3xl shadow-xl overflow-hidden mb-6 transition-opacity duration-300
                bg-surface border border-borderLight
                ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}
            `}>
                <div className="p-6 md:p-8 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-textMuted">
                            <Pencil size={14} />
                            Descreva o caso e a negativa
                        </label>
                    </div>

                    <textarea
                        value={localText}
                        onChange={(e) => setLocalText(e.target.value)}
                        placeholder="Ex: Paciente João Silva, 45 anos. Convênio negou Cirurgia Bariátrica alegando falta de tratamento clínico prévio. Paciente tem IMC 40, hipertensão e tentou dieta por 2 anos sem sucesso. Preciso de uma justificativa técnica citando a resolução da ANS."
                        className="flex-1 w-full p-4 rounded-xl text-lg resize-none outline-none border transition-all mb-4 bg-surfaceHighlight text-textMain border-borderLight focus:border-emerald-500/50 focus:bg-surface"
                    />

                    {/* Value Input */}
                    <div className="relative w-full md:w-1/3">
                        <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-2 text-textMuted">
                            Valor Estimado (R$)
                        </label>
                        <input
                            type="text"
                            value={estimatedValue}
                            onChange={handleValueChange}
                            placeholder="R$ 0,00"
                            className="w-full p-3 rounded-xl text-lg outline-none border transition-all bg-surfaceHighlight text-emerald-500 border-borderLight focus:border-emerald-500/50 focus:bg-surface placeholder-textMuted"
                        />
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-t flex items-center justify-between border-borderLight bg-surfaceHighlight/50">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium hidden md:block text-textMuted">
                            Pode ditar os detalhes:
                        </span>
                        <button
                            onClick={handleToggleListening}
                            className={`
                                relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm group
                                ${isListening
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                    : 'bg-surface hover:bg-surfaceHighlight border border-borderLight'}
                            `}
                            title="Gravar áudio"
                        >
                            {isListening ? (
                                <Square size={16} className="text-white fill-current" />
                            ) : (
                                <Mic size={20} className={isListening ? 'text-white' : "text-textMuted group-hover:text-textMain"} />
                            )}
                        </button>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={!localText.trim() || isLoading}
                        className={`
                            px-8 py-3 rounded-xl font-bold text-base flex items-center gap-2 transition-all
                            ${localText.trim() && !isLoading
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5'
                                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}
                        `}
                    >
                        <Shield size={18} />
                        {isLoading ? 'Gerando...' : 'Gerar Defesa'}
                    </button>
                </div>
            </div>

            {/* Hint / History Placeholder */}
            <div className="text-center text-sm text-textMuted">
                Histórico de defesas geradas aparecerá aqui.
            </div>
        </div>
    );
}
