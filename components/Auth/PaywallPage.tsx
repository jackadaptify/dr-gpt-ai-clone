import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { IconAlertTriangle, IconCreditCard } from '../Icons';

export default function PaywallPage() {
    const { user, signOut } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <IconCreditCard className="w-8 h-8 text-amber-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Assinatura Necessária</h1>
                <p className="text-zinc-400 mb-6">
                    Sua conta não possui uma assinatura ativa. Para acessar o Dr. GPT, é necessário confirmar seu pagamento.
                </p>

                <div className="bg-zinc-800/50 rounded-lg p-4 mb-6 text-sm text-left border border-zinc-800">
                    <p className="text-zinc-500 mb-1">Logado como:</p>
                    <p className="font-medium text-white break-all">{user?.email}</p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => signOut()}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-all"
                    >
                        Sair da Conta
                    </button>
                    <div className="text-xs text-zinc-500 mt-2">
                        Dúvidas? Entre em contato com o suporte.
                    </div>
                </div>
            </div>
        </div>
    );
}
