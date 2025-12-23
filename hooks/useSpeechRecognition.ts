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
    // historyTranscript: Text from previous sessions (before pause)
    const [historyTranscript, setHistoryTranscript] = useState('');
    // currentTranscript: Text from the current active session
    const [currentTranscript, setCurrentTranscript] = useState('');

    const [recognition, setRecognition] = useState<any>(null);
    const [hasSupport, setHasSupport] = useState(false);

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
                let sessionText = '';
                for (let i = 0; i < event.results.length; i++) {
                    sessionText += event.results[i][0].transcript;
                }
                setCurrentTranscript(sessionText);
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

    // When listening stops, we commit the current session text to history
    useEffect(() => {
        if (!isListening && currentTranscript) {
            setHistoryTranscript(prev => prev + (prev ? ' ' : '') + currentTranscript);
            setCurrentTranscript('');
        }
    }, [isListening]); // Depend on isListening flipping to false

    const startListening = useCallback(() => {
        if (recognition && !isListening) {
            try {
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
            // isListening will allow the Effect to trigger and commit text
            // But we manually set it false here just in case, though onend usually does it.
            // Actually relying on onend is safer, but trigger here for UI responsiveness?
            // Let's rely on onend from the API or force it if API is slow?
            // Native onend is reliable.
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
