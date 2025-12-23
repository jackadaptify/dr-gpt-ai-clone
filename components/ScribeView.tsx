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
    const { isListening: isMicListening, transcript, toggleListening: toggleMic, resetTranscript, updateTranscript } = useSpeechRecognition();

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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [consultationBlob, setConsultationBlob] = useState<Blob | null>(null);

    // UX States
    const [seconds, setSeconds] = useState(0);
    const [autoScroll, setAutoScroll] = useState(true);

    // Sync current recording with the correct state (Mic Only)
    useEffect(() => {
        // Only update from hook if we are NOT manually editing significantly differently?
        // Actually, just trust the hook as source of truth.
        // If user edits, we update the hook (see handleToggleRecording).
        // While capturing, hook updates us.
        if (transcript && mode === 'presential') {
            setConsultationTranscript(transcript);
        }
    }, [transcript, mode]);

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
        // Sync edits back to hook before toggling (Important for Resume)
        if (updateTranscript && consultationTranscript) {
            updateTranscript(consultationTranscript);
        }

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

    // --- EFFECTS ---
    // Timer Effect
    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    // Keyboard Shortcut (Space)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                const activeTag = document.activeElement?.tagName.toLowerCase();
                if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
                e.preventDefault();
                handleToggleRecording();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRecording, mode]);

    // Auto-scroll Effect
    useEffect(() => {
        if (autoScroll && textareaRef.current && isRecording) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
    }, [consultationTranscript, isRecording, autoScroll]);
    // Helpers
    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleDiscard = () => {
        if (confirm("Tem certeza que deseja descartar esta gravação?")) {
            resetTranscript();
            setConsultationBlob(null);
            setSeconds(0);
            if (isRecording) handleToggleRecording(); // Stop
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full w-full max-w-[98%] xl:max-w-[1600px] mx-auto gap-2 md:gap-6 p-2 md:p-6 animate-in fade-in duration-500 overflow-hidden text-textMain">

            {/* --- LEFTSIDE: CONTROLS (Mobile: Flattened via contents) --- */}
            {/* On mobile, this wrapper 'disappears' allowing children to be reordered in the main flex container */}
            <div className="contents md:flex md:flex-col md:w-[400px] lg:w-[420px] md:flex-none md:gap-4 md:h-full md:relative">

                {/* 1. Header & Selectors (Order 1 on Mobile) */}
                <div className="order-1 md:order-none w-full flex flex-col gap-3 shrink-0 z-20 bg-background md:bg-transparent pb-2 md:pb-0">
                    {/* Header: Menu & Patient */}
                    <div className="flex items-center gap-2 md:gap-3">
                        <button onClick={toggleSidebar} className="p-3 md:p-2.5 rounded-xl bg-surface hover:bg-surfaceHighlight text-textMuted hover:text-textMain border border-borderLight transition-all">
                            <Menu size={20} />
                        </button>
                        <div className="flex-1 relative">
                            <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider absolute -top-2 left-2 bg-background px-1 hidden md:block">Paciente</label>
                            <input
                                type="text"
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                                placeholder="Nome do Paciente..."
                                className="w-full bg-surface border border-borderLight rounded-xl py-3 md:py-3 px-4 md:px-4 text-base md:text-base font-semibold text-textMain outline-none focus:border-emerald-500 transition-all placeholder:text-textMuted/40"
                            />
                        </div>
                    </div>

                    {/* Scenario & Mode */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar md:grid md:grid-cols-1 md:gap-3">
                        <div className="relative min-w-[160px] md:min-w-0 flex-1">
                            <select
                                value={selectedScenario}
                                onChange={(e) => setSelectedScenario(e.target.value as Scenario)}
                                className="w-full appearance-none bg-surface border border-borderLight rounded-xl py-3 md:py-3 px-3 md:px-4 text-sm md:text-sm font-medium text-textMain outline-none focus:border-emerald-500 cursor-pointer hover:bg-surfaceHighlight transition-all"
                            >
                                <option value="evolution">📝 Evolução</option>
                                <option value="anamnesis">🩺 Anamnese</option>
                                <option value="bedside">🏥 Visita</option>
                                <option value="clinical_meeting">👥 Reunião</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
                        </div>

                        <div className="flex bg-surface border border-borderLight rounded-xl p-0.5 md:p-1 min-w-[140px] md:w-full">
                            <button
                                onClick={() => !isRecording && setMode('presential')}
                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold py-2 md:py-2 transition-all ${mode === 'presential' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-textMuted hover:bg-surfaceHighlight'}`}
                            >
                                <Users size={14} /> <span className="hidden sm:inline">Presencial</span>
                            </button>
                            <button
                                onClick={() => !isRecording && setMode('telemedicine')}
                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold py-2 md:py-2 transition-all ${mode === 'telemedicine' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-textMuted hover:bg-surfaceHighlight'}`}
                            >
                                <MonitorPlay size={14} /> <span className="hidden sm:inline">Telemed</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. Controls (Order 3 on Mobile) */}
                <div className="order-3 md:order-none w-full shrink-0 z-20 pb-2 md:pb-0">

                    {/* COMPACT RECORDING CARD */}
                    {/* COMPACT RECORDING CARD */}
                    <div className={`
                        flex flex-row md:flex-col items-center justify-between md:justify-center p-3 md:p-6 rounded-2xl md:rounded-3xl transition-all duration-500 border relative overflow-hidden shadow-sm gap-4
                        ${isRecording
                            ? (mode === 'telemedicine' ? 'bg-blue-50/50 border-blue-200' : 'bg-red-50/50 border-red-200')
                            : 'bg-surface/60 border-borderLight'
                        }
                    `}>
                        {/* Status + Timer (Mobile: Inline Left) */}
                        <div className="flex items-center gap-3 relative z-10">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all
                                ${isRecording
                                    ? 'bg-white text-red-600 shadow-sm border border-red-100'
                                    : 'bg-surfaceHighlight text-textMuted border border-transparent'
                                }`}>
                                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${isRecording ? 'animate-pulse bg-red-500' : 'bg-gray-400'}`} />
                                {isRecording ? "GRAVANDO" : "AGUARDANDO"}
                            </div>
                            <span className="font-mono text-xl md:text-2xl font-bold tracking-tight text-textMain tabular-nums">
                                {formatTime(seconds)}
                            </span>
                        </div>

                        {/* Controls (Mobile: Inline Right, Desktop: Big Center) */}
                        <div className="flex items-center gap-3 z-10">

                            {/* Discard Button */}
                            {(seconds > 0 || consultationTranscript) && isRecording && (
                                <button
                                    onClick={handleDiscard}
                                    className="p-2.5 md:p-3 text-textMuted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                    title="Descartar"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-1 1-1h6c1 0 1 1 1 1v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                </button>
                            )}

                            {/* Main Action Button */}
                            {!isRecording ? (
                                <button
                                    onClick={handleToggleRecording}
                                    className={`
                                        relative w-12 h-12 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
                                        bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:scale-105 hover:shadow-emerald-500/30 group
                                    `}
                                >
                                    {mode === 'telemedicine' ? <MonitorPlay size={20} className="md:hidden" /> : <Mic size={20} className="md:hidden" />}
                                    <div className="hidden md:block">
                                        {mode === 'telemedicine' ? <MonitorPlay size={32} /> : <Mic size={32} />}
                                    </div>
                                </button>
                            ) : (
                                <button
                                    onClick={handleToggleRecording}
                                    className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-white border-2 border-red-100 flex items-center justify-center text-red-500 shadow-md hover:scale-105 hover:bg-red-50 transition-all"
                                >
                                    <div className="flex gap-1 md:gap-1.5">
                                        <span className="w-1 md:w-1.5 h-4 md:h-6 bg-current rounded-full" />
                                        <span className="w-1 md:w-1.5 h-4 md:h-6 bg-current rounded-full" />
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Desktop Ripple Only */}
                        {isRecording && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-red-500/5 animate-pulse -z-10 pointer-events-none hidden md:block" />
                        )}
                    </div>
                </div>

                {/* 4. Footer (Order 4 on Mobile) */}
                <div className="order-4 md:order-none w-full shrink-0 md:absolute md:bottom-0 md:left-0 md:bg-gradient-to-t md:from-background md:via-background md:to-transparent md:pt-6">
                    <button
                        onClick={handleGenerate}
                        disabled={!consultationTranscript && !consultationBlob}
                        className={`
                            w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-2 transition-all shadow-lg
                            ${(consultationTranscript || consultationBlob)
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-500/20 translate-y-0'
                                : 'bg-surfaceHighlight text-textMuted cursor-not-allowed border border-borderLight'
                            }
                        `}
                    >
                        <FileText size={18} />
                        Gerar Documentação
                    </button>
                    <div className="flex justify-center items-center gap-1.5 text-[10px] font-medium text-textMuted/60 uppercase tracking-wider mt-2 md:mt-3">
                        <Lock size={10} />
                        Dados protegidos
                    </div>
                </div>
            </div>

            {/* --- RIGHTSIDE: TRANSCRIPTION (Mobile: Order 2) --- */}
            <div className="contents md:flex md:flex-col md:flex-1 md:h-full md:overflow-hidden">
                <div className="order-2 md:order-none flex-1 flex flex-col bg-surface border border-borderLight rounded-2xl md:rounded-3xl p-1 shadow-sm overflow-hidden min-h-[30vh]">

                    {/* Header Desktop Only (Hidden on Mobile to save space? Or Keep?) User said "Header Fixo", but this is Transcript Header. Keep simpler. */}
                    <div className="flex items-center justify-between px-3 md:px-5 py-2 md:py-3 border-b border-borderLight/50">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <FileText size={14} className="md:hidden" />
                            <span className="font-semibold text-xs md:text-sm">Transcrição em Tempo Real</span>
                        </div>
                        <button
                            onClick={() => setAutoScroll(!autoScroll)}
                            className={`text-[10px] md:text-xs font-medium px-2 py-1 md:px-3 md:py-1.5 rounded-lg border transition-all ${autoScroll ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-transparent border-transparent text-textMuted hover:bg-surfaceHighlight'}`}
                        >
                            {autoScroll ? 'Auto-scroll On' : 'Off'}
                        </button>
                    </div>

                    <div className="flex-1 relative bg-surfaceHighlight/20">
                        <textarea
                            ref={textareaRef}
                            value={consultationTranscript}
                            onChange={(e) => setConsultationTranscript(e.target.value)}
                            placeholder="A transcrição aparecerá aqui..."
                            className="w-full h-full resize-none bg-transparent p-4 md:p-6 outline-none text-textMain text-base md:text-lg leading-relaxed md:leading-8 font-normal placeholder-textMuted/30 custom-scrollbar"
                        />
                        {/* Quick Floating Action (Insert Time) - Optional Polish */}
                        {isRecording && (
                            <div className="absolute bottom-6 right-6 pointer-events-none opacity-50">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
}
