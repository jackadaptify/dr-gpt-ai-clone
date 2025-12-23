import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '../src/services/offline-storage';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export interface UseSpeechRecognitionProps {
    // onResult?: (transcript: string) => void; // Removed
    // onEnd?: () => void; // Removed
}

export const useSpeechRecognition = () => {
    const [isListening, setIsListening] = useState(false);
    // historyTranscript: Text from previous sessions OR finalized chunks in current session
    const [historyTranscript, setHistoryTranscript] = useState('');
    // currentTranscript: ONLY Interim text from the current active session
    const [currentTranscript, setCurrentTranscript] = useState('');

    const [recognition, setRecognition] = useState<any>(null);
    const [hasSupport, setHasSupport] = useState(false);

    // MediaRecorder refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Time Tracking
    const startTimeRef = useRef<number>(0);
    const accumulatedTimeRef = useRef<number>(0);
    const finalizedIndices = useRef<Set<number>>(new Set());

    // Combined for the UI
    const transcript = historyTranscript + (historyTranscript && currentTranscript ? ' ' : '') + currentTranscript;

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setHasSupport(true);
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'pt-BR';

            recognitionInstance.onresult = (event: any) => {
                let interimText = '';

                // Calculate current session elapsed time base
                const now = Date.now();
                const sessionElapsed = now - startTimeRef.current;
                const totalElapsed = accumulatedTimeRef.current + sessionElapsed;

                for (let i = 0; i < event.results.length; i++) {
                    const result = event.results[i];

                    if (result.isFinal) {
                        if (!finalizedIndices.current.has(i)) {
                            // New finalized chunk!
                            const text = result[0].transcript.trim();
                            if (text) {
                                // Format Timestamp [MM:SS]
                                const seconds = Math.floor(totalElapsed / 1000);
                                const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
                                const ss = (seconds % 60).toString().padStart(2, '0');
                                const timestamp = `[${mm}:${ss}]`;

                                setHistoryTranscript(prev => {
                                    const separator = prev ? '\n\n' : ''; // Double newline for paragraph break
                                    return prev + separator + `${timestamp} ${text}`;
                                });
                            }
                            finalizedIndices.current.add(i);
                        }
                    } else {
                        interimText += result[0].transcript;
                    }
                }
                setCurrentTranscript(interimText);
            };

            recognitionInstance.onend = () => {
                // When "end" fires naturally (e.g. silence or stop), we update the accumulated time
                if (isListening) {
                    // This logic is tricky because onend fires even if we just paused?
                    // If we manually stopped, we updated accumulated time in stopListening already.
                    // Let's rely on stopListening state change.
                    setIsListening(false);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            setRecognition(recognitionInstance);

            return () => {
                recognitionInstance.abort();
            };
        }
    }, []);

    const startListening = useCallback(async () => {
        if (recognition && !isListening) {
            try {
                // Reset session-specific tracking
                finalizedIndices.current.clear();
                startTimeRef.current = Date.now();

                // Start MediaRecorder for offline audio capture
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mediaRecorder = new MediaRecorder(stream);
                    mediaRecorderRef.current = mediaRecorder;
                    audioChunksRef.current = [];

                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            audioChunksRef.current.push(event.data);
                        }
                    };

                    mediaRecorder.start();
                } catch (err) {
                    console.error('Error starting MediaRecorder:', err);
                    toast.error('Could not access microphone for audio recording');
                }

                recognition.start();
                setIsListening(true);
            } catch (error) {
                console.error('Error starting recognition:', error);
            }
        }
    }, [recognition, isListening]);

    const stopListening = useCallback(() => {
        if (recognition && isListening) {
            recognition.stop();

            // Stop MediaRecorder and save to IndexDB
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                    if (!navigator.onLine) {
                        const recordingId = uuidv4();
                        try {
                            await offlineStorage.saveRecording(recordingId, audioBlob);
                            console.log(`Offline: gravação salva ${recordingId}`);
                        } catch (err) {
                            console.error('Erro ao salvar offline:', err);
                            toast.error('Erro ao salvar gravação offline');
                        }
                    } else {
                        console.log('Online: enviando direto para API');
                    }

                    // Stop all tracks
                    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                    audioChunksRef.current = [];
                };
            }

            setIsListening(false);

            // Update accumulated time
            const sessionDuration = Date.now() - startTimeRef.current;
            accumulatedTimeRef.current += sessionDuration;
        }
    }, [recognition, isListening]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    const resetTranscript = useCallback(() => {
        setHistoryTranscript('');
        setCurrentTranscript('');
        accumulatedTimeRef.current = 0;
        finalizedIndices.current.clear();
    }, []);

    const updateTranscript = useCallback((newText: string) => {
        setHistoryTranscript(newText);
        setCurrentTranscript('');
    }, []);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        toggleListening,
        resetTranscript,
        updateTranscript,
        hasSupport
    };
};
