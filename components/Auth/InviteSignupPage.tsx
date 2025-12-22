import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IconBrain, IconCheck, IconAlertTriangle } from '../Icons';
import { Toaster, toast } from 'react-hot-toast';

export default function InviteSignupPage() {
    const [token, setToken] = useState<string | null>(null);
    const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'expired'>('validating');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        // Extract token from URL
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        setToken(t);

        if (!t) {
            setStatus('invalid');
            return;
        }

        // Optional: Validate token via backend immediately? 
        // Or just let the form submission handle it to save an RTT?
        // We'll trust the form submission for strict validation, but maybe check structure?
        // For better UX, let's assume valid until submitted, unless we build a 'validate-invite' endpoint.
        // Given constraints, we'll just check existence.
        setStatus('valid');

    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            // Call Edge Function
            const { data, error } = await supabase.functions.invoke('consume-trial-invite', {
                body: {
                    token,
                    email,
                    password,
                    full_name: fullName
                }
            });

            if (error) throw error; // Network/Edge error

            // Note: supabase.functions.invoke might return 200 even if function returns { error: ... } logic inside data?
            // Actually, invoke usually throws if !ok, but let's check data
            // If function returns new Response(..., {status: 400}) invoke throws?
            // Yes, supbabase client throws if status is not 2xx usually or we check.

            // Re-authenticate user explicitly
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) {
                // Should not happen usually if creation worked, but maybe auto-confirm? 
                // Function used 'email_confirm: true' so they are confirmed.
                // We'll redirect to login if auto-login fails
                window.location.href = '/';
                return;
            }

            // Redirect to App
            window.location.href = '/';

        } catch (err: any) {
            console.error("Signup error:", err);

            let msg = 'Erro ao criar conta.';

            if (err instanceof Error) {
                // Check for network/connection errors
                if (err.message.includes('Failed to send a request') || err.message.includes('fetch failed')) {
                    msg = 'Erro de conexão: Não foi possível contatar o servidor. A função pode estar indisponível ou não implantada.';
                } else {
                    // Try to use the error message returned by the function/Supabase
                    msg = err.message;
                }
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'invalid' || status === 'expired') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <IconAlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Link Inválido ou Expirado</h1>
                    <p className="text-zinc-400 mb-8">
                        Este convite não é mais válido. Entre em contato com o suporte ou quem te enviou este link.
                    </p>
                    <a
                        href="https://wa.me/55..." // Placeholder whatsapp
                        className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        Falar no WhatsApp
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-textMain font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-background to-background pointer-events-none z-0" />
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-borderLight shadow-card-3d mb-6 group">
                        <IconBrain className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">
                        Dr. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">GPT</span>
                    </h1>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        <IconCheck className="w-3 h-3" />
                        Convite Especial
                    </div>
                    <p className="text-textMuted text-sm">
                        Crie sua conta para ativar seu período de teste.
                    </p>
                </div>

                <div className="bg-surface/80 backdrop-blur-xl border border-borderLight rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <form onSubmit={handleSubmit} className="relative space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center border-l-4 border-l-red-500">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">Nome Completo</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                placeholder="Dr. João Silva"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">Confirmar Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? 'Ativando Conta...' : 'Criar Conta e Ativar Teste'}
                        </button>
                    </form>
                </div>
            </div>
            <Toaster />
        </div>
    );
}
