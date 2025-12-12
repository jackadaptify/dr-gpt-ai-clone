import React from 'react';
import { Mic } from 'lucide-react';

export default function ScribeView() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <Mic className="text-emerald-500 w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent mb-4">
                AI Scribe
            </h1>
            <p className="text-zinc-400 max-w-md">
                Gravação e transcrição inteligente de consultas.
                <br />
                (Em breve tela dedicada de gravação aqui)
            </p>

            {/* Can re-use AIScribeModal trigger button here or embed logic later */}
        </div>
    );
}
