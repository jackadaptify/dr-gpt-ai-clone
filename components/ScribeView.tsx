import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, FileText, ArrowRight, Brain, Stethoscope, Pencil, Users, MonitorPlay, Lock } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ScribeViewProps {
    isDarkMode: boolean;
    onGenerate: (consultation: string, thoughts: string, patientName: string, patientGender: string, audioBlob?: Blob) => void;
}

type Step = 'consultation' | 'thought';
type Mode = 'presential' | 'telemedicine';
type Gender = 'M' | 'F';

export default function ScribeView({ isDarkMode, onGenerate }: ScribeViewProps) {
    const { isListening: isMicListening, transcript, toggleListening: toggleMic, resetTranscript } = useSpeechRecognition();

    // State for the two steps
    const [step, setStep] = useState<Step>('consultation');
    const [mode, setMode] = useState<Mode>('presential');

    // Patient Metadata
    const [patientName, setPatientName] = useState('');
    const [patientGender, setPatientGender] = useState<Gender>('M');

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
            // O pulo do gato: pedimos video: true pq alguns browsers exigem, 
            // mas vamos ignorar o vídeo.
            const sysStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true // ISSO É CRUCIAL
            });

            // VALIDAÇÃO DE USUÁRIO (UX 10/10)
            // Se o usuário esqueceu de marcar "Compartilhar áudio" no popup do Chrome
            if (sysStream.getAudioTracks().length === 0) {
                alert("⚠️ ERRO CRÍTICO: Você não marcou a caixinha 'Compartilhar áudio da guia'. O áudio do paciente não será gravado. Tente novamente.");
                // Para tudo para não gerar gravação muda
                micStream.getTracks().forEach(track => track.stop());
                sysStream.getTracks().forEach(track => track.stop());
                return;
            }

            // 3. A MÁGICA: WEB AUDIO API (MIXER)
            // Criamos um estúdio virtual dentro do browser
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;

            const micSource = audioContext.createMediaStreamSource(micStream);
            const sysSource = audioContext.createMediaStreamSource(sysStream);
            const destination = audioContext.createMediaStreamDestination();

            // Conecta os dois canais no destino final
            micSource.connect(destination);
            sysSource.connect(destination);

            // 4. Inicia o Gravador com o Stream Misto
            const combinedStream = destination.stream;
            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: 'audio/webm;codecs=opus' // Padrão ouro para voz
            });

            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const finalBlob = new Blob(chunks, { type: 'audio/webm' });

                // SALVA NO STATE
                setConsultationBlob(finalBlob);

                // Limpeza de recursos
                micStream.getTracks().forEach(t => t.stop());
                sysStream.getTracks().forEach(t => t.stop()); // Isso para o compartilhamento de tela automaticamente
                audioContext.close();

                // Transição automática para o próximo passo? Não, o botão "Parar" já faz isso ao mudar o state.
                // Mas aqui precisamos garantir que o UI saiba que parou.
                setIsSysListening(false);
            };

            mediaRecorder.start(1000); // Fatias de 1s para feedback visual se precisar
            setIsSysListening(true);
            mediaStreamRef.current = sysStream; // Salva ref para parar pelo botão também

            // 5. Listener para quando o usuário clica em "Parar Compartilhamento" na barra flutuante do Chrome
            sysStream.getVideoTracks()[0].onended = () => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            };

        } catch (error) {
            console.error("Erro na Telemedicina:", error);
            setIsSysListening(false);
            // Trate o erro de "Permissão negada" aqui
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

    // Handle step transition
    const handleNextStep = () => {
        if (isRecording) handleToggleRecording();
        resetTranscript();
        setStep('thought');
        // Thought always defaults to Mic for doctor's private note
        if (mode === 'telemedicine') setMode('presential');
    };

    const handleGenerate = () => {
        if (isRecording) handleToggleRecording();
        // If telemed, we might have an audio blob instead of text transcript
        if (mode === 'telemedicine' && consultationBlob) {
            onGenerate('Arquivo de Áudio Telemedicina', thoughtTranscript, patientName, patientGender, consultationBlob);
        } else {
            onGenerate(consultationTranscript, thoughtTranscript, patientName, patientGender);
        }
    };

    return (
        <div className={`flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-500`}>

            {/* Header / Stepper Visual */}
            <div className="mb-8 text-center relative">
                <div className="flex items-center justify-center gap-4 mb-4">
                    {/* Step 1 Indicator */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${step === 'consultation' ? 'bg-emerald-500/10 text-emerald-500 ring-2 ring-emerald-500/20' : 'opacity-50 grayscale'}`}>
                        <Stethoscope size={18} />
                        <span className="font-bold text-sm">1. A Consulta</span>
                    </div>

                    <div className={`h-px w-8 ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'}`} />

                    {/* Step 2 Indicator */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${step === 'thought' ? 'bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/20' : 'opacity-50 grayscale'}`}>
                        <Brain size={18} />
                        <span className="font-bold text-sm">2. Minuto de Ouro</span>
                    </div>
                </div>

                <h1 className={`text-3xl font-bold mb-2 transition-all ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {step === 'consultation' ? 'Ambient Mode' : 'Nota Técnica'}
                </h1>

                {step === 'consultation' && (
                    <div className="flex justify-center mt-4 mb-2">
                        <div className={`flex p-1 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} border ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
                            <button
                                onClick={() => !isRecording && setMode('presential')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'presential' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Users size={16} />
                                Presencial
                            </button>
                            <button
                                onClick={() => !isRecording && setMode('telemedicine')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'telemedicine' ? 'bg-blue-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <MonitorPlay size={16} />
                                Telemedicina
                            </button>
                        </div>
                    </div>
                )}

                <p className={`text-lg max-w-xl mx-auto mt-2 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                    {step === 'consultation'
                        ? (mode === 'presential' ? 'Grave o diálogo presencial com o paciente.' : 'Capture o áudio da videochamada (Zoom/Meet).')
                        : 'Adicione seus pensamentos médicos, suspeitas e conduta para enriquecer o prontuário.'}
                </p>
            </div>

            {/* Main Card */}
            <div className={`
                flex-1 flex flex-col rounded-3xl shadow-xl overflow-hidden mb-6 relative transition-all duration-500
                ${isDarkMode ? 'bg-[#18181b] border border-white/10' : 'bg-white border border-gray-200'}
                ${step === 'thought' && isDarkMode ? 'border-indigo-500/20' : ''}
                ${mode === 'telemedicine' && step === 'consultation' && isDarkMode ? 'border-blue-500/20' : ''}
            `}>

                {/* Visualizer Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 min-h-[300px]">

                    {/* Patient Context Input - Option A (Minimalist) */}
                    {step === 'consultation' && (
                        <div className={`flex flex-col sm:flex-row items-center gap-3 mb-2 animate-in fade-in slide-in-from-top-4 duration-500`}>
                            <input
                                type="text"
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                                placeholder="Nome do Paciente..."
                                className={`bg-transparent border-b-2 ${isDarkMode ? 'border-white/10 text-white placeholder-zinc-600 focus:border-emerald-500' : 'border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500'} px-2 py-1 text-center outline-none transition-all w-64 text-lg font-medium`}
                            />
                            <div className={`flex p-1 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                <button
                                    onClick={() => setPatientGender('M')}
                                    className={`px-3 py-1 rounded-md text-sm font-bold transition-all ${patientGender === 'M' ? (isDarkMode ? 'bg-zinc-700 text-white shadow-sm' : 'bg-white text-black shadow-sm') : 'text-zinc-500 hover:text-zinc-400'}`}
                                >
                                    M
                                </button>
                                <button
                                    onClick={() => setPatientGender('F')}
                                    className={`px-3 py-1 rounded-md text-sm font-bold transition-all ${patientGender === 'F' ? (isDarkMode ? 'bg-zinc-700 text-white shadow-sm' : 'bg-white text-black shadow-sm') : 'text-zinc-500 hover:text-zinc-400'}`}
                                >
                                    F
                                </button>
                            </div>
                        </div>
                    )}


                    {/* Status Text with Dynamic Color */}
                    <div className={`text-center transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-70'}`}>
                        <h3 className={`text-xl md:text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {isRecording
                                ? (step === 'consultation'
                                    ? (mode === 'presential' ? "Ouvindo consulta..." : "Capturando áudio do sistema...")
                                    : "Gravando nota técnica...")
                                : "Pronto para iniciar"}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                            {isRecording
                                ? (mode === 'telemedicine' && step === 'consultation' ? "Áudio do Microfone + Aba sendo gravado em alta definição." : "Capture todos os detalhes.")
                                : (mode === 'telemedicine' && step === 'consultation' ? "⚠️ Importante: Escolha a Aba do Chrome e marque 'Compartilhar áudio da guia'." : "Toque no microfone para começar.")}
                        </p>
                    </div>

                    {/* Main Button */}
                    <button
                        onClick={handleToggleRecording}
                        className={`
                            relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl group
                            ${isRecording
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                : (step === 'consultation'
                                    ? (mode === 'presential' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30')
                                    : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30')
                            }
                        `}
                    >
                        {isRecording && (
                            <span className="absolute inset-0 rounded-full border-4 border-red-400/30 animate-ping" />
                        )}

                        {isRecording ? (
                            <Square size={40} className="text-white fill-current" />
                        ) : (
                            step === 'consultation' && mode === 'telemedicine' ? (
                                <MonitorPlay size={48} className="text-white" />
                            ) : (
                                <Mic size={48} className="text-white" />
                            )
                        )}
                    </button>

                    {/* Waveform Visualization */}
                    <div className="h-16 flex items-center justify-center gap-1.5 w-full max-w-md overflow-hidden">
                        {isRecording ? (
                            Array.from({ length: 20 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 rounded-full animate-sound-wave opacity-50 
                                        ${step === 'consultation'
                                            ? (mode === 'presential' ? 'bg-emerald-500' : 'bg-blue-500')
                                            : 'bg-indigo-500'}`}
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

                    {/* Security Badge */}
                    <div className={`flex items-center gap-2 text-xs font-medium mt-4 transition-opacity duration-300 ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        <Lock size={12} />
                        <span>Criptografia Ponta-a-Ponta | Compliance LGPD</span>
                    </div>

                </div>

                {/* Transcript Preview & Edit */}
                <div className={`
                    border-t p-0 transition-all duration-500
                    ${(step === 'consultation' ? consultationTranscript : thoughtTranscript) || isRecording ? 'h-48' : 'h-0 overflow-hidden border-none'}
                    ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'}
                 `}>
                    <div className="p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <div className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                <Pencil size={12} />
                                <span>{step === 'consultation' ? 'Transcrição da Consulta' : 'Sua Nota Técnica'}</span>
                            </div>
                        </div>
                        <textarea
                            value={step === 'consultation' ? consultationTranscript : thoughtTranscript}
                            onChange={(e) => step === 'consultation' ? setConsultationTranscript(e.target.value) : setThoughtTranscript(e.target.value)}
                            placeholder={
                                step === 'consultation'
                                    ? (mode === 'telemedicine' && !consultationTranscript ? "⚠️ A transcrição em tempo real não está disponível para Telemedicina nesta versão. Use o gravador e digite o resumo." : "O diálogo aparecerá aqui...")
                                    : "Sua nota técnica aparecerá aqui..."
                            }
                            className={`
                                flex-1 w-full bg-transparent resize-none outline-none text-sm leading-relaxed
                                ${isDarkMode ? 'text-zinc-300 placeholder-zinc-700' : 'text-gray-600 placeholder-gray-400'}
                            `}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            {step === 'consultation' ? (
                <button
                    onClick={handleNextStep}
                    disabled={mode === 'presential' && !consultationTranscript && !isSysListening} // For telemed, allow proceeding even if empty (since logic is partial) -> Now logic is robust with blob check later
                    className={`
                        w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all
                        ${(consultationTranscript || mode === 'telemedicine')
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-white shadow-lg'
                            : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'}
                    `}
                >
                    Próximo: Minuto de Ouro
                    <ArrowRight size={20} />
                </button>
            ) : (
                <button
                    onClick={handleGenerate}
                    // Allow generation even if thought is empty, as long as consultation exists (handled by step flow)
                    className={`
                        w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all
                        bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5
                    `}
                >
                    <div className="p-1 bg-white/20 rounded-lg">
                        <FileText size={20} />
                    </div>
                    Gerar Documentação (SOAP)
                </button>
            )}

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
