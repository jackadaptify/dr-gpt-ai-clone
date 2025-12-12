import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function FinanceView() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="text-amber-500 w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-200 bg-clip-text text-transparent mb-4">
                Financeiro & Anti-Glosa
            </h1>
            <p className="text-zinc-400 max-w-md">
                Auditoria de contas e geração de justificativas.
                <br />
                (Em breve dashboard financeiro aqui)
            </p>
        </div>
    );
}
