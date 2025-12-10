import { useState, useEffect, useCallback } from 'react';

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
    const [transcript, setTranscript] = useState('');
    const [recognition, setRecognition] = useState<any>(null);
    const [hasSupport, setHasSupport] = useState(false);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setHasSupport(true);
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'pt-BR'; // Default to Portuguese

            recognitionInstance.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptChunk = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        currentTranscript += transcriptChunk + ' ';
                    } else {
                        currentTranscript += transcriptChunk;
                    }
                }
                // Note: This logic might need adjustment.
                // event.results contains ALL results for the session if continuous=true.
                // So we should iterate from 0?
                // Actually, let's just rebuild the whole string from 0 to be safe.
                let fullTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    fullTranscript += event.results[i][0].transcript;
                }
                setTranscript(fullTranscript);
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
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

    const startListening = useCallback(() => {
        if (recognition && !isListening) {
            try {
                setTranscript(''); // Reset transcript on new session
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
            setIsListening(false);
        }
    }, [recognition, isListening]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        toggleListening,
        hasSupport
    };
};
