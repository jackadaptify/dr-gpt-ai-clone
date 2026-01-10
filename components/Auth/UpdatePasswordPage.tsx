import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { IconBrain } from '../Icons';
import { toast } from 'react-hot-toast';

export default function UpdatePasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success('Senha atualizada com sucesso!');
            navigate('/copilot'); // Go to main app
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar senha');
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-textMain">
                <div className="text-center">
                    <p className="mb-4">Verificando sessão...</p>
                    <div className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-textMain font-sans selection:bg-emerald-500/30 relative overflow-hidden">
            <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-borderLight shadow-card-3d mb-6 group">
                        <IconBrain className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">
                        Nova <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Senha</span>
                    </h1>
                    <p className="text-textMuted text-sm">
                        Digite sua nova senha abaixo.
                    </p>
                </div>

                <div className="bg-surface/80 backdrop-blur-xl border border-borderLight rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    <form onSubmit={handleUpdatePassword} className="relative space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">Nova Senha</label>
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? 'Atualizando...' : 'Definir Nova Senha'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
