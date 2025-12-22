import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import { IconCheck, IconAlertTriangle } from "../Icons";

export default function SignupPaymentPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentData, setPaymentData] = useState<any>(null);

    // Form State
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);

    const sessionId = useMemo(() => searchParams.get("session_id"), [searchParams]);

    useEffect(() => {
        let isMounted = true;

        const run = async () => {
            if (!sessionId) {
                if (!isMounted) return;
                setError("Sessão de pagamento não encontrada.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const { data, error: invokeError } = await supabase.functions.invoke(
                    "verify_payment",
                    { body: { session_id: sessionId } }
                );

                if (invokeError || !data?.ok) {
                    throw new Error(
                        data?.error || invokeError?.message || "Falha na verificação do pagamento."
                    );
                }

                if (!isMounted) return;

                setPaymentData(data);

                // Security Check: Email mismatch
                if (
                    user?.email &&
                    data?.email &&
                    user.email.toLowerCase() !== String(data.email).toLowerCase()
                ) {
                    throw new Error(
                        "Você está logado com um email diferente do pagamento. Faça logout e tente novamente."
                    );
                }

                // If user is already logged in, link subscription/profile directly
                if (user) {
                    await handleLinkProfile(String(data.customer_id || ""));
                }
            } catch (err: any) {
                console.error("Payment verification failed:", err);
                if (!isMounted) return;
                setError(err?.message || "Erro ao verificar pagamento.");
            } finally {
                if (!isMounted) return;
                setLoading(false);
            }
        };

        run();

        return () => {
            isMounted = false;
        };
        // IMPORTANT: user included here because the flow changes if user is logged in/out
    }, [sessionId, user]);

    const handleLinkProfile = async (customerId: string) => {
        if (!user?.id) return;

        const { error: updateError } = await supabase
            .from("profiles")
            .upsert(
                {
                    id: user.id,
                    email: user.email,
                    subscription_status: true,
                    stripe_customer_id: customerId || null,
                    billing_status: "active",
                },
                { onConflict: "id" }
            );

        if (updateError) throw updateError;

        toast.success("Assinatura ativada com sucesso!");
        navigate("/app", { replace: true });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentData || !sessionId) return;

        setIsCreatingAccount(true);

        try {
            const { data, error: invokeError } = await supabase.functions.invoke(
                "consume-payment-signup",
                {
                    body: {
                        session_id: sessionId,
                        password,
                        full_name: fullName,
                    },
                }
            );

            if (invokeError) throw invokeError;
            if (data?.error) throw new Error(data.error);

            toast.success("Conta criada com sucesso! Faça login para continuar.");
            navigate("/login");
        } catch (err: any) {
            console.error("Signup error:", err);
            const msg = err?.message || "Erro ao criar conta.";
            toast.error(msg);
        } finally {
            setIsCreatingAccount(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-emerald-500">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-10 w-10 border-4 border-emerald-500 rounded-full border-t-transparent" />
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
                                onClick={() => signOut()}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2 rounded-xl transition-all"
                            >
                                Sair da conta atual ({user.email})
                            </button>
                        )}

                        <button
                            onClick={() => navigate("/")}
                            className="text-emerald-500 hover:underline"
                        >
                            Voltar ao início
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // If user is logged in, page will link and redirect to /app
    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-textMuted">Vinculando sua assinatura...</p>
            </div>
        );
    }

    // Not logged in: show account creation form
    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-textMain font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-background to-background pointer-events-none z-0" />

            <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-borderLight shadow-card-3d mb-6">
                        <IconCheck className="w-8 h-8 text-emerald-400" />
                    </div>

                    <h1 className="text-3xl font-bold mb-2 tracking-tight">
                        Pagamento Confirmado!
                    </h1>

                    <p className="text-textMuted text-sm">
                        Finalize seu cadastro para acessar o Dr. GPT.
                    </p>
                </div>

                <div className="bg-surface/80 backdrop-blur-xl border border-borderLight rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">
                                Email (Confirmado)
                            </label>
                            <input
                                type="email"
                                value={paymentData?.email || ""}
                                disabled
                                className="w-full bg-surfaceHighlight/50 border border-borderLight rounded-xl px-4 py-3 text-sm text-textMuted cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-textMuted ml-1">
                                Nome Completo
                            </label>
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
                            <label className="text-xs font-medium text-textMuted ml-1">
                                Defina sua Senha
                            </label>
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
                            {isCreatingAccount ? "Criando Conta..." : "Acessar Dr. GPT"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
