import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, FileText, ArrowRight, MonitorPlay, Lock, Menu, Users, Edit2, ChevronDown } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ScribeViewProps {
    isDarkMode: boolean;
    onGenerate: (consultation: string, thoughts: string, patientName: string, patientGender: string, audioBlob?: Blob, scenario?: string) => void;
    toggleSidebar: () => void;
    onOpenSettings: () => void;
}

type Step = 'consultation' | 'thought';
type Mode = 'presential' | 'telemedicine';
type Gender = 'M' | 'F';
type Scenario = 'evolution' | 'anamnesis' | 'bedside' | 'clinical_meeting';

export default function ScribeView({ isDarkMode, onGenerate, toggleSidebar, onOpenSettings }: ScribeViewProps) {
    const { isListening: isMicListening, transcript, toggleListening: toggleMic, resetTranscript } = useSpeechRecognition();

    // State for the two steps
    const [step, setStep] = useState<Step>('consultation');
    const [mode, setMode] = useState<Mode>('presential');

    // Medical Context Scenario
    const [selectedScenario, setSelectedScenario] = useState<Scenario>('evolution');

    // Patient Metadata
    const [patientName, setPatientName] = useState('');
    // Gender hardcoded default for now as selector is removed, but we keep the state if needed for API
    const [patientGender] = useState<Gender>('M');

    // Transcripts for each step
    const [consultationTranscript, setConsultationTranscript] = useState('');
    const [thoughtTranscript, setThoughtTranscript] = useState('');

    // Telemedicine specific state
    const [isSysListening, setIsSysListening] = useState(false);

    // Audio Mixing Refs and State
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [consultationBlob, setConsultationBlob] = useState<Blob | null>(null);

    // Sync current recording with the correct state (Mic Only)
    useEffect(() => {
        if (transcript && mode === 'presential') {
            if (step === 'consultation') {
                setConsultationTranscript(transcript);
            } else {
                setThoughtTranscript(transcript);
            }
        }
    }, [transcript, step, mode]);

    // --- FUNÇÃO CORE: TELEMEDICINA MIXER ---
    const startTelemedicineRecording = async () => {
        try {
            // 1. Captura o Microfone do Médico (Input Local)
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // 2. Captura o Áudio do Sistema (Paciente na Aba)
            const sysStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            if (sysStream.getAudioTracks().length === 0) {
                alert("⚠️ ERRO CRÍTICO: Você não marcou a caixinha 'Compartilhar áudio da guia'. O áudio do paciente não será gravado. Tente novamente.");
                micStream.getTracks().forEach(track => track.stop());
                sysStream.getTracks().forEach(track => track.stop());
                return;
            }

            // 3. A MÁGICA: WEB AUDIO API (MIXER)
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;

            const micSource = audioContext.createMediaStreamSource(micStream);
            const sysSource = audioContext.createMediaStreamSource(sysStream);
            const destination = audioContext.createMediaStreamDestination();

            micSource.connect(destination);
            sysSource.connect(destination);

            // 4. Inicia o Gravador com o Stream Misto
            const combinedStream = destination.stream;
            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const finalBlob = new Blob(chunks, { type: 'audio/webm' });
                setConsultationBlob(finalBlob);

                micStream.getTracks().forEach(t => t.stop());
                sysStream.getTracks().forEach(t => t.stop());
                audioContext.close();

                setIsSysListening(false);
            };

            mediaRecorder.start(1000);
            setIsSysListening(true);
            mediaStreamRef.current = sysStream;

            sysStream.getVideoTracks()[0].onended = () => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            };

        } catch (error) {
            console.error("Erro na Telemedicina:", error);
            setIsSysListening(false);
            alert("Não foi possível iniciar. Verifique as permissões de microfone e tela.");
        }
    };

    const stopTelemedicineRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const toggleTelemed = () => {
        if (isSysListening) {
            stopTelemedicineRecording();
        } else {
            startTelemedicineRecording();
        }
    };

    // Unified Toggle
    const handleToggleRecording = () => {
        if (mode === 'presential') {
            toggleMic();
        } else {
            toggleTelemed();
        }
    };

    const isRecording = mode === 'presential' ? isMicListening : isSysListening;

    const handleGenerate = () => {
        if (isRecording) handleToggleRecording();

        // Pass generic defaults or captured name
        // We use the captured patientName or 'Sem Título'
        const finalName = patientName.trim() || "Paciente";

        if (mode === 'telemedicine' && consultationBlob) {
            onGenerate("Arquivo de Áudio Telemedicina", "", finalName, patientGender, consultationBlob, selectedScenario);
        } else {
            onGenerate(consultationTranscript, "", finalName, patientGender, undefined, selectedScenario);
        }
    };

    return (
        <div className={`flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-500 overflow-hidden`}>

            {/* Header Area with Patient Name and Menu */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-xl transition-colors hover:bg-surfaceHighlight text-textMuted hover:text-textMain"
                >
                    <Menu size={24} />
                </button>

                {/* Editable Patient Name (Centered Title) */}
                <div className="flex-1 max-w-md mx-auto relative group">
                    <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Nome do Paciente"
                        className={`
                            w-full text-center bg-transparent border-none outline-none text-xl md:text-2xl font-semibold placeholder-opacity-50 transition-all
                            text-textMain placeholder-textMuted
                            focus:placeholder-opacity-30
                        `}
                        title="Digite o nome do paciente"
                    />
                    <Edit2
                        className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-textMuted"
                    />
                </div>

                <div className="w-10" />
            </div>

            {/* Medical Context Selector */}
            <div className="flex justify-center mb-6 w-full">
                <div className="relative w-11/12 md:w-4/5 lg:w-3/4">
                    <select
                        value={selectedScenario}
                        onChange={(e) => setSelectedScenario(e.target.value as Scenario)}
                        className={`
                            w-full appearance-none rounded-xl px-4 py-3 pl-12 text-center font-medium cursor-pointer transition-all
                            bg-surfaceHighlight text-textMain border-borderLight hover:bg-surface
                            border shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                        `}
                    >
                        <option value="evolution">📝 Evolução Médica</option>
                        <option value="anamnesis">🩺 Anamnese / Primeira Consulta</option>
                        <option value="bedside">🏥 Visita Beira Leito</option>
                        <option value="clinical_meeting">👥 Reunião Clínica</option>
                    </select>
                    {/* Custom Arrow Icon */}
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                </div>
            </div>

            {/* Mode Switcher - Distinct Tabs */}
            <div className="flex justify-center mb-8">
                <div className="flex p-1 rounded-xl bg-surface border border-borderLight shadow-sm">
                    <button
                        onClick={() => !isRecording && setMode('presential')}
                        title="Modo Presencial: Grava pelo microfone (Sua voz + Paciente)"
                        className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300
                            ${mode === 'presential'
                                ? 'bg-emerald-500 text-white shadow-md transform scale-105'
                                : 'text-textMuted hover:text-textMain hover:bg-surfaceHighlight'
                            }
                        `}
                    >
                        <Users size={16} />
                        Presencial
                    </button>
                    <button
                        onClick={() => !isRecording && setMode('telemedicine')}
                        title="Modo Telemedicina: Grava áudio do sistema (Google Meet/Zoom)"
                        className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300
                            ${mode === 'telemedicine'
                                ? 'bg-blue-500 text-white shadow-md transform scale-105'
                                : 'text-textMuted hover:text-textMain hover:bg-surfaceHighlight'
                            }
                        `}
                    >
                        <MonitorPlay size={16} />
                        Telemedicina
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col rounded-3xl relative transition-all duration-500 bg-surface/50">

                {/* Visualizer & Mic Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 min-h-[300px]">

                    {/* Mic Button */}
                    <div className="relative group">
                        <button
                            onClick={handleToggleRecording}
                            className={`
                                relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
                                ${isRecording
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40 scale-110'
                                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40 hover:scale-105'
                                }
                            `}
                        >
                            {/* Ripple Effect when recording */}
                            {isRecording && (
                                <>
                                    <span className="absolute inset-0 rounded-full border-4 border-red-400/30 animate-ping" />
                                    <span className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-pulse" />
                                </>
                            )}

                            {/* Glow Effect */}
                            {!isRecording && (
                                <span className="absolute inset-0 rounded-full bg-emerald-400/10 blur-2xl animate-pulse" />
                            )}

                            {isRecording ? (
                                <Square size={48} className="text-white fill-current" />
                            ) : (
                                mode === 'telemedicine' ? (
                                    <MonitorPlay size={56} className="text-white ml-1" />
                                ) : (
                                    <Mic size={56} className="text-white" />
                                )
                            )}
                        </button>
                    </div>

                    {/* Text Below Mic */}
                    <p className={`mt-6 text-sm font-medium transition-all ${isRecording ? 'text-red-500 animate-pulse' : 'text-textMuted'}`}>
                        {isRecording
                            ? (mode === 'telemedicine' ? "🔴 Gravando áudio do sistema..." : "🔴 Escutando consulta em tempo real...")
                            : "Toque no microfone para iniciar"
                        }
                    </p>

                    {/* Waveform Visualization (Only visible when recording) */}
                    <div className={`mt-8 h-12 flex items-center justify-center gap-1.5 w-full max-w-xs transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 rounded-full animate-sound-wave 
                                    ${mode === 'telemedicine' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                style={{
                                    animationDuration: `${0.4 + Math.random() * 0.4}s`,
                                    height: `${20 + Math.random() * 80}%`
                                }}
                            />
                        ))}
                    </div>

                    {/* Empty State Cards (When not recording and no data) */}
                    {!isRecording && !consultationTranscript && !consultationBlob && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl px-2">
                            <div className="p-3 rounded-2xl border border-borderLight bg-surface/50 hover:bg-surfaceHighlight transition-colors flex flex-col items-center text-center gap-1 cursor-help group">
                                <span className="text-xl group-hover:scale-110 transition-transform">⌨️</span>
                                <span className="font-semibold text-xs text-textMain">Atalhos</span>
                                <span className="text-[10px] text-textMuted">Use Espaço para gravar</span>
                            </div>
                            <div className="p-3 rounded-2xl border border-borderLight bg-surface/50 hover:bg-surfaceHighlight transition-colors flex flex-col items-center text-center gap-1 cursor-help group">
                                <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
                                <span className="font-semibold text-xs text-textMain">Produtividade</span>
                                <span className="text-[10px] text-textMuted">Você economizou 2h hoje</span>
                            </div>
                            <div className="p-3 rounded-2xl border border-borderLight bg-surface/50 hover:bg-surfaceHighlight transition-colors flex flex-col items-center text-center gap-1 cursor-help group">
                                <span className="text-xl group-hover:scale-110 transition-transform">🔒</span>
                                <span className="font-semibold text-xs text-textMain">Privacidade</span>
                                <span className="text-[10px] text-textMuted">Dados processados localmente</span>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Transcript Preview Area (Always visible when recording or has data) */}
            {(consultationTranscript || consultationBlob || isRecording) && (
                <div className="mt-6 rounded-2xl p-6 min-h-[100px] max-h-60 overflow-y-auto border bg-surface border-borderLight shadow-inner w-full animate-in slide-in-from-bottom-2">

                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className="text-xs font-medium text-textMuted uppercase tracking-wider">
                            {isRecording ? "Transcrição em Tempo Real" : "Transcrição Finalizada"}
                        </span>
                    </div>

                    {isRecording && !consultationTranscript && mode === 'presential' ? (
                        <div className="flex flex-col gap-2 opacity-60">
                            <p className="text-sm text-textMuted animate-pulse">Aguardando fala...</p>
                            <p className="text-xs text-textSubtle">A transcrição aparecerá aqui assim que você começar a falar.</p>
                        </div>
                    ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-textMain font-mono opacity-90">
                            {consultationTranscript || (mode === 'telemedicine' ? "🔈 Áudio do sistema sendo capturado..." : "")}
                        </p>
                    )}
                </div>
            )}

            {/* Generate Button */}
            {(consultationTranscript || consultationBlob) && !isRecording && (
                <div className="mt-4 animate-in slide-in-from-bottom-4 fade-in">
                    <button
                        onClick={handleGenerate}
                        className={`
                            w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all
                            bg-white text-emerald-600 hover:bg-emerald-50 shadow-xl border border-emerald-100
                        `}
                    >
                        <FileText size={20} />
                        Gerar Documentação
                    </button>
                </div>
            )}

            {/* Security Badge */}
            <div className="flex justify-center items-center gap-2 text-[10px] font-medium mt-6 mb-2 opacity-60 text-textMuted">
                <Lock size={10} />
                <span>Criptografia Ponta-a-Ponta</span>
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
