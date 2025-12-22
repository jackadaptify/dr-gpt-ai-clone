import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { IconBrain } from '../Icons';

export default function AuthPage({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
    const [isLogin, setIsLogin] = useState(initialMode === 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmationSent, setConfirmationSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isReset, setIsReset] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isReset) {
                const { error } = await authService.resetPasswordForEmail(email);
                if (error) throw error;
                setResetSent(true);
            } else if (isLogin) {
                const { error } = await authService.signIn(email, password);
                if (error) throw error;
            } else {
                const { error, data } = await authService.signUp(email, password, fullName);
                if (error) throw error;
                // If sign up is successful, show confirmation message
                if (data.user && !data.session) {
                    setConfirmationSent(true);
                    return;
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-textMain font-sans selection:bg-emerald-500/30 relative overflow-hidden">
            {/* Background Effects Removed */}

            <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-borderLight shadow-card-3d mb-6 group">
                        <IconBrain className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">
                        Dr. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">GPT</span>
                    </h1>
                    <p className="text-textMuted text-sm">
                        {isReset
                            ? 'Recupere sua senha.'
                            : (isLogin ? 'Bem-vindo de volta, doutor.' : 'Crie sua conta para começar.')}
                    </p>
                </div>

                <div className="bg-surface/80 backdrop-blur-xl border border-borderLight rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    {/* Glass Shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    {confirmationSent || resetSent ? (
                        <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-500">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-textMain mb-2">Verifique seu email</h3>
                            <p className="text-textMuted text-sm mb-6">
                                {resetSent
                                    ? 'Enviamos as instruções de recuperação para '
                                    : 'Enviamos um link de confirmação para '
                                }
                                <span className="text-textMain font-medium">{email}</span>.
                                <br />Verifique sua caixa de entrada (e spam).
                            </p>
                            <button
                                onClick={() => {
                                    setConfirmationSent(false);
                                    setResetSent(false);
                                    setIsReset(false);
                                    setIsLogin(true);
                                }}
                                className="w-full bg-surfaceHighlight border border-borderLight hover:bg-surface text-textMain font-medium py-3 rounded-xl transition-all"
                            >
                                Voltar para o Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="relative space-y-5">
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                                    {error}
                                </div>
                            )}

                            {!isLogin && !isReset && (
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
                            )}

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

                            {!isReset && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-textMuted ml-1">Senha</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                        placeholder="••••••••"
                                    />
                                    {isLogin && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsReset(true);
                                                    setIsLogin(false);
                                                    setError(null);
                                                }}
                                                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                            >
                                                Esqueci minha senha
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processando...
                                    </span>
                                ) : (
                                    isReset ? 'Enviar Email de Recuperação' : (isLogin ? 'Entrar' : 'Criar Conta')
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {!confirmationSent && !resetSent && (
                    <div className="text-center mt-8 space-y-2">
                        {isReset ? (
                            <button
                                onClick={() => {
                                    setIsLogin(true);
                                }}
                                className="text-sm text-textMuted hover:text-textMain transition-colors"
                            >
                                Voltar para o Login
                            </button>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
