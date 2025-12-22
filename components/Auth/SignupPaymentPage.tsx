import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { IconCheck, IconAlertTriangle, IconBrain } from '../Icons';

export default function SignupPaymentPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, session, signOut } = useAuth();

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentData, setPaymentData] = useState<any>(null);

    // Form State
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);

    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        if (!sessionId) {
            setError('Sessão de pagamento não encontrada.');
            setLoading(false);
            return;
        }

        const verifyPayment = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('verify_payment', {
                    body: { session_id: sessionId }
                });

                if (error || !data?.ok) {
                    throw new Error(data?.error || error?.message || 'Falha na verificação do pagamento.');
                }

                setPaymentData(data);

                // Security Check: Email mismatch
                if (user?.email && data?.email && user.email.toLowerCase() !== data.email.toLowerCase()) {
                    throw new Error('Você está logado com um email diferente do pagamento. Faça logout e tente novamente.');
                }

                // If user is already logged in, we can link directly
                if (user) {
                    // Do NOT await here if we want the effect to finish and let handleLinkProfile handle navigation?
                    // Actually user code sample implies simple call.
                    // The issue was setLoader -> infinite.
                    // We just call it.
                    await handleLinkProfile(data.customer_id);
                }
            } catch (err: any) {
                console.error('Payment verification failed:', err);
                setError(err.message || 'Erro ao verificar pagamento.');
            } finally {
                setLoading(false);
            }
        };

        verifyPayment();
    }, [sessionId, user]);

    const handleLinkProfile = async (customerId: string) => {
        const { error: updateError } = await supabase
            .from('profiles')
            .upsert({
                id: user!.id,
                // We must provide minimal required fields for upsert if row doesn't exist?
                // Or just use update if we assume row exists?
                // User requirement: "Se o profile não existir ainda (trigger atrasou), o update não faz nada. MVP rápido: trocar para upsert."
                // Only providing ID might be risky if we wipe other data on conflict?
                // Dangers of upsert: if row exists, it updates. If not, it inserts.
                // We should merge with existing data? 'onConflict' defaults to 'do update'.
                // But we don't have other data here if it DOESN'T exist.
                // We'll trust the user's snippet which included email/fullname stub if possible?
                // Wait, user snippet in Prompt:
                // email: paymentData.email, full_name: fullName...
                // But in handleLinkProfile (logged in), we don't have password/full_name from form!
                // We have user metadata maybe.
                // Let's use user email.
                email: user!.email,
                subscription_status: true,
                stripe_customer_id: customerId,
                billing_status: 'active'
            }, { onConflict: 'id' });

        if (updateError) throw updateError;

        toast.success('Assinatura ativada com sucesso!');
        navigate('/app', { replace: true });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentData) return;

        setIsCreatingAccount(true);
        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: paymentData.email,
                password: password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Erro ao criar usuário.');

            // 2. Update Profile
            // Note: Triggers might handle profile creation, but we need to update extra fields.
            // We wait a bit or try update immediately? usually triggers are fast but race conditions exist.
            // However, signUp returns session usually if auto-confirm is on?
            // If email confirmation is required, we can't update profile yet via RLS potentially if not logged in?
            // Actually, if signUp logs us in (session exists), we can update.

            // If session is null (email confirm required), we can't update profile easily from client.
            // checking authData.session.

            let userId = authData.user.id;

            if (authData.session) {
                // Logged in immediately
                const { error: updateError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        email: paymentData.email,
                        full_name: fullName,
                        subscription_status: true,
                        stripe_customer_id: paymentData.customer_id,
                        billing_status: 'active'
                    }, { onConflict: 'id' });

                if (updateError) throw updateError;

                navigate('/app', { replace: true });
            } else {
                toast.success('Conta criada! Verifique seu email para confirmar.');
            }

        } catch (err: any) {
            console.error('Signup error:', err);
            toast.error(err.message || 'Erro ao criar conta.');
        } finally {
            setIsCreatingAccount(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-emerald-500">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-10 w-10 border-4 border-emerald-500 rounded-full border-t-transparent"></div>
                    <p>Verificando pagamento...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <IconAlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Erro no Pagamento</h1>
                    <p className="text-zinc-400 mb-6">{error}</p>
                    <div className="flex flex-col gap-3">
                        {user && (
                            <button
                                onClick={() => {
                                    signOut();
                                    // create a 'hard' refresh or redirect to ensure clean state if needed, 
                                    // but signOut in context usually redirects to /login. 
                                    // However we are on a specific page.
                                    // We might want to reload the page or let the context handle it.
                                    // The context updates user to null, which triggers a re-render here.
                                    // If user becomes null, the "Security Check" won't trigger next time?
                                    // Actually if user becomes null, we might just stay on this page 
                                    // and since sessionId is still there, useEffect runs again?
                                    // Check dependency [sessionId, user]. 
                                    // If user changes to null, effect runs, verifyPayment runs.
                                    // This time 'user' is null. 'handleLinkProfile' skipped.
                                    // It sets PaymentData.
                                    // Then shows the form!
                                    // Perfect. 
                                }}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2 rounded-xl transition-all"
                            >
                                Sair da conta atual ({user.email})
                            </button>
                        )}
                        <button onClick={() => navigate('/')} className="text-emerald-500 hover:underline">Voltar ao início</button>
                    </div>
                </div>
            </div>
        );
    }

    // If user is already logged in, the effect handles logic/redirect. 
    // Usually we just show a spinner or "Linking..." text while effect runs.
    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-textMuted">Vinculando sua assinatura...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-textMain font-sans relative overflow-hidden">
            {/* Background Effects similar to Invite Page */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-background to-background pointer-events-none z-0" />

            <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-borderLight shadow-card-3d mb-6">
                        <IconCheck className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">Pagamento Confirmado!</h1>
                    <p className="text-textMuted text-sm">
                        Finalize seu cadastro para acessar o Dr. GPT.
                    </p>
                </div>

                <div className="bg-surface/80 backdrop-blur-xl border border-borderLight rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">Email (Confirmado)</label>
                            <input
                                type="email"
                                value={paymentData?.email}
                                disabled
                                className="w-full bg-surfaceHighlight/50 border border-borderLight rounded-xl px-4 py-3 text-sm text-textMuted cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">Nome Completo</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain focus:outline-none focus:border-emerald-500/50 transition-all"
                                placeholder="Seu nome"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">Defina sua Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain focus:outline-none focus:border-emerald-500/50 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isCreatingAccount}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all mt-4"
                        >
                            {isCreatingAccount ? 'Criando Conta...' : 'Acessar Dr. GPT'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
