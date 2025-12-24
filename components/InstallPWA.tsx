import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [hasDismissed, setHasDismissed] = useState(false);

    useEffect(() => {
        // Check if already installed/standalone
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(isStandaloneMode);

        // Check if iOS (including iPads with desktop site enabled)
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Check localStorage preference REMOVED to ensure it always appears on reload
        // const dismissed = localStorage.getItem('pwa-install-dismissed');
        // if (dismissed) setHasDismissed(true);

        // Listen for beforeinstallprompt (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Only auto-show if not dismissed (session state) and not standalone
            if (!isStandaloneMode) {
                // We can show a banner or just wait for user user interaction
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowInstallModal(true);
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            setDeferredPrompt(null);
        } else {
            // Fallback or desktop scenario where prompt isn't available
            // Just show instructions maybe?
            setShowInstallModal(true);
        }
    };

    const handleDismiss = () => {
        setHasDismissed(true);
        // localStorage.setItem('pwa-install-dismissed', 'true'); // Don't persist dismissal forever
        setShowInstallModal(false);
    };

    if (isStandalone) return null;

    return (
        <>
            {/* Mini Banner / Badge if not installed */}
            {!showInstallModal && !hasDismissed && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
                    <button
                        onClick={() => setShowInstallModal(true)}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                        <Download size={16} />
                        Instalar Aplicativo
                    </button>
                </div>
            )}

            {/* Main Install Modal */}
            {showInstallModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowInstallModal(false)}
                            className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                                <Download size={32} />
                            </div>

                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                                Instalar Dr. GPT
                            </h3>

                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Instale o aplicativo para ter acesso offline, melhor performance e gravação em segundo plano.
                            </p>

                            {isIOS ? (
                                <div className="space-y-4">
                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                        Para instalar o Dr. GPT no seu iPhone:
                                    </p>
                                    <ol className="text-sm space-y-4 text-left text-zinc-700 dark:text-zinc-300">
                                        <li className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                1
                                            </span>
                                            <span>
                                                Se não estiver no Safari, abra este site no navegador <strong>Safari</strong>
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                2
                                            </span>
                                            <div className="flex-1">
                                                <p className="mb-2">
                                                    Toque no ícone de <strong>Compartilhar</strong>
                                                    <Share size={14} className="inline mx-1" />
                                                    que fica no meio, na parte inferior da tela.
                                                </p>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                3
                                            </span>
                                            <span>
                                                Role para baixo e selecione <br />
                                                <strong>Adicionar à Tela de Início</strong>
                                                <PlusSquare size={14} className="inline mx-1" />
                                            </span>
                                        </li>
                                    </ol>
                                </div>
                            ) : (
                                <div className="py-2">
                                    {deferredPrompt ? (
                                        <button
                                            onClick={handleInstallClick}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors"
                                        >
                                            Instalar Agora
                                        </button>
                                    ) : (
                                        <p className="text-xs text-zinc-500 italic">
                                            Use o menu do seu navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".
                                        </p>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleDismiss}
                                className="text-xs text-zinc-400 hover:text-zinc-500 underline decoration-dotted"
                            >
                                Não mostrar novamente
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Badge fixo no topo */}
            {!isStandalone && !hasDismissed && (
                <div className="fixed top-0 left-0 right-0 bg-emerald-500 text-white px-4 py-3 flex items-center justify-between z-50 shadow-lg">
                    <div className="flex items-center gap-3">
                        <Download className="w-5 h-5" />
                        <span className="text-sm font-medium">
                            Instale o Dr. GPT para acesso rápido
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleInstallClick}
                            className="bg-white text-emerald-600 px-4 py-1 rounded-md text-sm font-semibold hover:bg-emerald-50"
                        >
                            Instalar
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="text-white hover:text-emerald-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
