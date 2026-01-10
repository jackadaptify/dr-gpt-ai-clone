import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, FileText, UploadCloud, ChevronRight, Menu, Edit2, Users, MonitorPlay, ArrowRight, ChevronDown, Pause, Play, CheckSquare, Square as SquareIcon, Settings } from 'lucide-react';
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
type Scenario = 'evolution' | 'anamnesis' | 'bedside' | 'clinical_meeting' | 'dar' | 'pie' | 'narrative' | 'hospital_evolution' | 'emergency_care' | 'psychiatric';

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

    // Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [consultationType, setConsultationType] = useState('Primeira Consulta');
    const [observations, setObservations] = useState('');
    const [selectedModules, setSelectedModules] = useState<string[]>([]);

    // Available Analysis Modules
    const analysisModules = [
        "Análise Laboratorial",
        "Interpretação de Imagens",
        "Sugestão de CID",
        "Prescrição Guiada",
        "Risco Cardiovascular"
    ];

    const toggleModule = (module: string) => {
        setSelectedModules(prev =>
            prev.includes(module)
                ? prev.filter(m => m !== module)
                : [...prev, module]
        );
    };

    // Mobile Tab State
    const [mobileTab, setMobileTab] = useState<'context' | 'transcript'>('transcript');

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
        // Sync edits back to hook ONLY when STARTING (Important for Resume)
        // We do NOT sync on stop, because recognition.stop() will finalize the current chunk with timestamp.
        // Syncing on stop would cause duplication (Raw + Timestamped).
        const currentlyRecording = mode === 'presential' ? isMicListening : isSysListening;

        if (!currentlyRecording && updateTranscript && consultationTranscript) {
            updateTranscript(consultationTranscript);
        }

        if (mode === 'presential') {
            toggleMic();
        } else {
            toggleTelemed();
        }
    };

    const isRecording = mode === 'presential' ? isMicListening : isSysListening;

    const handleInitialGenerateClick = () => {
        if (isRecording) handleToggleRecording();
        setShowGenerateModal(true);
    };

    const confirmGenerate = () => {
        setShowGenerateModal(false);

        // Pass generic defaults or captured name
        // We use the captured patientName or 'Sem Título'
        const finalName = patientName.trim() || "Paciente";

        // Combine metadata into "thoughts" (which is used as Note/Observation context)
        // Format: "Tipo Consulta: X | Obs: Y"
        // Combine metadata into "thoughts" (which is used as Note/Observation context)
        // Format: "Módulos: [A, B] | Tipo de Consulta: X | Obs: Y"
        const modulesStr = selectedModules.length > 0 ? selectedModules.join(', ') : 'Nenhum';
        const finalThoughts = `Módulos: ${modulesStr} \nTipo de Consulta: ${consultationType} \nObservações: ${observations} `;


        if (mode === 'telemedicine' && consultationBlob) {
            onGenerate("", finalThoughts, finalName, patientGender, consultationBlob, selectedScenario);
        } else {
            onGenerate(consultationTranscript, finalThoughts, finalName, patientGender, undefined, selectedScenario);
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
        return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} `;
    };

    const handleDiscard = () => {
        setShowDeleteModal(true);
    };

    const confirmDiscard = () => {
        resetTranscript();
        setConsultationBlob(null);
        setSeconds(0);
        if (isRecording) handleToggleRecording(); // Stop
        setShowDeleteModal(false);
    };

    return (
        <div className="flex flex-col h-full w-full max-w-[98%] xl:max-w-[1600px] mx-auto gap-2 p-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:p-4 animate-in fade-in duration-500 overflow-hidden text-textMain">

            {/* --- TOP HEADER (Patient & Menu) --- */}
            <div className="w-full flex items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <button onClick={toggleSidebar} className="md:hidden p-2.5 rounded-xl bg-surface hover:bg-surfaceHighlight text-textMuted hover:text-textMain border border-borderLight transition-all">
                        <Menu size={20} />
                    </button>

                    <div className="flex-1 max-w-2xl relative group">
                        <div className="absolute top-1/2 -translate-y-1/2 left-3 text-emerald-500 pointer-events-none transition-colors group-focus-within:text-emerald-400">
                            <Edit2 size={16} />
                        </div>
                        <input
                            type="text"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="Nova Consulta"
                            className="w-full bg-transparent border-0 border-b border-transparent hover:border-borderLight focus:border-emerald-500 py-2 pl-9 pr-4 text-xl font-bold text-textMain placeholder-textMain/50 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Header Actions & Mode Selector */}
                <div className="flex items-center gap-3">
                    {/* Mode Selector */}
                    <div className="flex bg-surface border border-borderLight rounded-lg p-1">
                        <button
                            onClick={() => !isRecording && setMode('presential')}
                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'presential' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-textMuted hover:text-textMain hover:bg-white/5'} `}
                        >
                            <Users size={14} /> <span className="hidden sm:inline">Presencial</span>
                        </button>
                        <button
                            onClick={() => !isRecording && setMode('telemedicine')}
                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'telemedicine' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'text-textMuted hover:text-textMain hover:bg-white/5'} `}
                        >
                            <MonitorPlay size={14} /> <span className="hidden sm:inline">Telemed</span>
                        </button>
                    </div>

                    <div className="hidden md:block w-px h-6 bg-borderLight/50 mx-1" />

                    <button className="hidden md:flex px-3 py-2 rounded-lg border border-borderLight bg-surface hover:bg-surfaceHighlight text-xs font-bold text-textMuted hover:text-textMain transition-all items-center gap-2">
                        <FileText size={14} /> <span>Imprimir</span>
                    </button>
                </div>
            </div>

            {/* --- MOBILE TABS (NEW) --- */}
            <div className="md:hidden flex w-full bg-surface border border-borderLight rounded-xl p-1 mb-2 shrink-0">
                <button
                    onClick={() => setMobileTab('transcript')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mobileTab === 'transcript' ? 'bg-emerald-500 text-white shadow-md' : 'text-textMuted hover:bg-surfaceHighlight'} `}
                >
                    <Mic size={16} />
                    Transcrição
                </button>
                <button
                    onClick={() => setMobileTab('context')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mobileTab === 'context' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-textMuted hover:bg-surfaceHighlight'} `}
                >
                    <FileText size={16} />
                    Contexto
                </button>
            </div>

            {/* --- MAIN CONTENT (Two Columns) --- */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4 md:gap-6 relative z-10">

                {/* --- LEFTSIDE PANEL: CONTEXT --- */}
                <div className={`
                    ${mobileTab === 'context' ? 'flex' : 'hidden'}
                    md:flex flex-col w-full md:w-1/2 h-full rounded-2xl md:rounded-3xl shadow-none overflow-hidden relative group border transition-colors duration-300
                    ${isDarkMode ? 'bg-[#141414] border-transparent' : 'bg-white border-borderLight shadow-sm'}
    `}>

                    {/* Header */}
                    <div className={`px-4 py-3 flex items-center gap-2 ${isDarkMode ? 'bg-white/[0.02]' : 'bg-zinc-50 border-b border-borderLight'}`}>
                        <span className="text-xs font-bold text-textMuted uppercase tracking-wider">Contexto da Consulta</span>
                    </div>

                    <div className="flex-1 flex flex-col p-4 md:p-5 gap-4 overflow-y-auto custom-scrollbar">

                        {/* File Upload Area */}
                        <div className={`w-full rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer group border border-dashed border-transparent hover:border-emerald-500/30
                            ${isDarkMode ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'bg-zinc-50 hover:bg-emerald-50/50 border-zinc-200'}
                        `}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                                ${isDarkMode ? 'bg-surfaceHighlight text-textMuted group-hover:bg-emerald-500/10 group-hover:text-emerald-500' : 'bg-white border border-borderLight text-zinc-400 group-hover:border-emerald-200 group-hover:text-emerald-600'}
                            `}>
                                <UploadCloud size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-textMain">Carregar arquivos</p>
                                <p className="text-xs text-textMuted mt-1">Arraste exames ou documentos (PDF, Imagens)</p>
                            </div>
                        </div>

                        {/* Notes Area */}
                        <div className={`flex-1 flex flex-col min-h-[200px] rounded-xl p-4 mt-2 transition-colors
                            ${isDarkMode ? 'bg-white/[0.02]' : 'bg-zinc-50 border border-borderLight'}
                        `}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded bg-amber-100/50 text-amber-600 flex items-center justify-center">
                                    <FileText size={14} />
                                </div>
                                <span className="text-xs font-bold text-textMain uppercase tracking-wider">Anotações</span>
                            </div>
                            <textarea
                                value={observations}
                                onChange={(e) => setObservations(e.target.value)}
                                placeholder="Digite informações relevantes sobre seu paciente, queixas ou lembretes..."
                                className="w-full h-full resize-none bg-transparent outline-none text-textMain text-sm leading-relaxed placeholder-textMuted/40 custom-scrollbar"
                            />
                        </div>
                    </div>
                </div>

                {/* --- RIGHTSIDE PANEL: TRANSCRIPTION --- */}
                <div className={`
                     ${mobileTab === 'transcript' ? 'flex' : 'hidden'}
                     md:flex flex-col w-full md:w-1/2 h-full rounded-2xl md:rounded-3xl shadow-none overflow-hidden relative border transition-colors duration-300
                     ${isDarkMode ? 'bg-[#141414] border-transparent' : 'bg-white border-borderLight shadow-sm'}
                `}>


                    {/* Header */}
                    <div className={`flex items-center justify-between px-3 md:px-5 py-2 md:py-3 shrink-0 ${isDarkMode ? 'bg-white/[0.02]' : 'bg-zinc-50 border-b border-borderLight'}`}>
                        <div className="flex items-center gap-2 text-emerald-600">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-semibold text-xs md:text-sm">Transcrição da consulta</span>
                        </div>
                    </div>

                    <div className={`flex-1 relative transition-all duration-500 ${isRecording ? 'bg-emerald-500/5 ring-1 ring-emerald-500/20' : (isDarkMode ? 'bg-surfaceHighlight/20' : 'bg-white')} `}>
                        <textarea
                            ref={textareaRef}
                            value={consultationTranscript}
                            onChange={(e) => setConsultationTranscript(e.target.value)}
                            placeholder={isRecording ? "Ouvindo..." : "A transcrição da consulta aparecerá aqui..."}
                            className="w-full h-full resize-none bg-transparent p-6 md:p-8 outline-none text-textMain text-base md:text-lg leading-relaxed md:leading-8 font-normal placeholder-textMuted/30 custom-scrollbar"
                        />
                    </div>
                </div>
            </div>

            {/* --- GLOBAL BOTTOM ACTION BAR (Footer) --- */}
            <div className={`w-full p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0 flex items-center justify-between gap-4 z-50 border-t relative transition-colors duration-300
                ${isDarkMode ? 'bg-[#09090b] border-white/5' : 'bg-white border-borderLight shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'}
            `}>

                <div className="flex items-center gap-3">
                    {/* Timer Display */}
                    <div className={`flex items-center justify-center border rounded-lg px-4 py-2.5 min-w-[100px] transition-colors
                        ${isDarkMode ? 'bg-surface border-borderLight' : 'bg-zinc-50 border-zinc-200'}
                    `}>
                        <Play size={14} className="text-textMuted mr-2" fill="currentColor" />
                        <span className="text-sm font-mono text-textMain font-medium tracking-widest">
                            {formatTime(seconds)}
                        </span>
                    </div>

                    {/* Trash (Visible only when content exists) */}
                    {(seconds > 0 || consultationTranscript) && (
                        <button
                            onClick={handleDiscard}
                            className="p-2.5 rounded-lg text-textMuted hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                            title="Descartar"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>

                {/* Center: Main Recording Button */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    <button
                        onClick={handleToggleRecording}
                        className={`
                            flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all duration-300
                            ${isRecording
                                ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]'
                                : 'bg-surface border border-borderLight text-textMain hover:bg-surfaceHighlight hover:border-textMuted'
                            }
                        `}
                    >
                        {isRecording ? (
                            <>
                                <div className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </div>
                                <span>Parar gravação</span>
                            </>
                        ) : (
                            <>
                                <Mic size={18} />
                                <span>Iniciar gravação</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Right: Generate Button */}
                <button
                    onClick={handleInitialGenerateClick}
                    disabled={(!consultationTranscript && !consultationBlob)}
                    className={`
                        flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all border
                        ${(!consultationTranscript && !consultationBlob)
                            ? 'border-transparent text-textMuted cursor-not-allowed opacity-50'
                            : 'bg-surface border-borderLight text-textMain hover:bg-surfaceHighlight hover:border-textMuted'
                        }
                    `}
                >
                    <FileText size={16} />
                    <span>Gerar documento</span>
                </button>
            </div>




            {/* --- MODAL DE GERAÇÃO --- */}
            {
                showGenerateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-surface border border-borderLight rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setShowGenerateModal(false)}
                                className="absolute top-4 right-4 text-textMuted hover:text-textMain transition-colors"
                            >
                                <Trash2 className="rotate-45" size={20} /> {/* Using Trash2 rotated as close temporary or import X if possible (Trash2 is already imported) */}
                            </button>

                            <h3 className="text-xl font-bold text-textMain mb-1">Finalizar Consulta</h3>
                            <p className="text-textMuted text-sm mb-6">Confirme os detalhes para gerar a documentação.</p>

                            <div className="space-y-4">

                                {/* Módulos de Análise */}
                                <div className="space-y-2 bg-surfaceHighlight/30 p-4 rounded-xl border border-borderLight/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-5 h-5 rounded bg-amber-100 text-amber-600 flex items-center justify-center">
                                            <Edit2 size={12} />
                                        </div>
                                        <label className="text-xs font-bold text-textMain uppercase tracking-wider">Módulos de Análise</label>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {analysisModules.map((module) => (
                                            <div
                                                key={module}
                                                onClick={() => toggleModule(module)}
                                                className={`
                                                flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border
                                                ${selectedModules.includes(module)
                                                        ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                                        : 'hover:bg-surfaceHighlight border-transparent'
                                                    }
`}
                                            >
                                                <div className={`
w-5 h-5 rounded flex items-center justify-center transition-all
                                                ${selectedModules.includes(module)
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-surface border border-borderLight text-transparent'
                                                    }
`}>
                                                    <CheckSquare size={14} className={selectedModules.includes(module) ? 'opacity-100' : 'opacity-0'} />
                                                </div>
                                                <span className={`text-sm font-medium ${selectedModules.includes(module) ? 'text-emerald-900' : 'text-textMuted'} `}>
                                                    {module}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Tipo de Consulta */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-textMain uppercase tracking-wider">Tipo de Consulta</label>
                                    <div className="relative">
                                        <select
                                            value={consultationType}
                                            onChange={(e) => setConsultationType(e.target.value)}
                                            className="w-full appearance-none bg-surface border border-borderLight rounded-xl py-3 px-4 text-base text-textMain outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                                        >
                                            <option value="Primeira Consulta">Primeira Consulta</option>
                                            <option value="Retorno/Consulta de Revisão">Retorno/Consulta de Revisão</option>
                                            <option value="Consulta de Urgência/Emergência">Consulta de Urgência/Emergência</option>
                                            <option value="Consulta Pré-Operatória">Consulta Pré-Operatória</option>
                                            <option value="Consulta Pós-Operatória">Consulta Pós-Operatória</option>
                                            <option value="Acompanhamento de Doença Crônica">Acompanhamento de Doença Crônica</option>
                                            <option value="Atestado/Receita">Atestado/Receita</option>
                                            <option value="Exames de Rotina/Check-up">Exames de Rotina/Check-up</option>
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
                                    </div>
                                </div>

                                {/* Tipo de Prontuário (Antigo Scenario) */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-textMain uppercase tracking-wider">Tipo de Prontuário</label>
                                    <div className="relative">
                                        <select
                                            value={selectedScenario}
                                            onChange={(e) => setSelectedScenario(e.target.value as Scenario)}
                                            className="w-full appearance-none bg-surface border border-borderLight rounded-xl py-3 px-4 text-base text-textMain outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                                        >
                                            <option value="evolution">📝 Evolução (SOAP)</option>
                                            <option value="dar">📋 DAR (Dados, Ação, Resposta)</option>
                                            <option value="pie">📋 PIE (Problema, Intervenção, Evolução)</option>
                                            <option value="narrative">📋 Narrativo (Texto livre)</option>
                                            <option value="hospital_evolution">📋 Evolução Hospitalar</option>
                                            <option value="emergency_care">📋 Atendimento de Urgência</option>
                                            <option value="psychiatric">📋 Psiquiátrico</option>
                                            <option value="anamnesis">🩺 Anamnese Completa</option>
                                            <option value="bedside">🏥 Visita Beira-Leito</option>
                                            <option value="clinical_meeting">👥 Reunião Clínica</option>
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
                                    </div>
                                </div>

                                {/* Observações - REMOVIDO DAQUI E MOVIDO PARA A ESQUERDA */}
                                {/* <div className="space-y-1.5"> ... </div> */}
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setShowGenerateModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-borderLight text-textMain font-semibold hover:bg-surfaceHighlight transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmGenerate}
                                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <FileText size={18} />
                                    Gerar Agora
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO --- */}
            {
                showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-surface border border-borderLight rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} />
                            </div>

                            <h3 className="text-lg font-bold text-textMain mb-2">Descartar Gravação?</h3>
                            <p className="text-textMuted text-sm mb-6">
                                Você tem certeza que deseja apagar toda a transcrição e reiniciar? Esta ação não pode ser desfeita.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-borderLight text-textMain font-semibold hover:bg-surfaceHighlight transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDiscard}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg hover:shadow-red-500/20 transition-all"
                                >
                                    Excluir Tudo
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, 0.2); }
`}</style>

        </div>
    );
}
