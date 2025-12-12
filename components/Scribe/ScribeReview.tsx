import React from 'react';
import { Copy, Check, FileText, Save } from 'lucide-react';

interface ScribeReviewProps {
    isDarkMode: boolean;
    content: string;
    onChange: (value: string) => void;
    onSave?: () => void;
    children: React.ReactNode; // The Chat Component
}

export default function ScribeReview({ isDarkMode, content, onChange, onSave, children }: ScribeReviewProps) {
    const [copied, setCopied] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        if (onSave) {
            setSaving(true);
            await onSave();
            setTimeout(() => setSaving(false), 2000);
        }
    };

    return (
        <div className={`flex w-full h-full overflow-hidden animate-in fade-in duration-300 ${isDarkMode ? 'bg-[#09090b]' : 'bg-gray-50'}`}>

            {/* Left Column: SOAP Editor (60%) */}
            <div className={`w-[60%] flex flex-col border-r h-full relative ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>

                {/* Header */}
                <div className={`h-16 flex items-center justify-between px-6 border-b ${isDarkMode ? 'bg-[#18181b] border-white/5' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                            <FileText size={20} />
                        </div>
                        <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Revisão de Prontuário
                        </h2>
                    </div>

                    <button
                        onClick={handleCopy}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                            ${copied
                                ? 'bg-emerald-500 text-white'
                                : (isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50')
                            }
                        `}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copiado!' : 'Copiar Prontuário'}
                    </button>

                    <button
                        onClick={handleSave}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ml-2
                            ${saving
                                ? 'bg-emerald-500 text-white'
                                : (isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50')
                            }
                        `}
                    >
                        {saving ? <Check size={16} /> : <Save size={16} />}
                        {saving ? 'Salvo!' : 'Salvar'}
                    </button>

                </div>

                {/* Editor Area */}
                <div className="flex-1 p-6 overflow-hidden">
                    <textarea
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        className={`
                            w-full h-full p-6 text-base leading-normal resize-none text-left outline-none rounded-xl border
                            font-mono
                            ${isDarkMode
                                ? 'bg-[#121215] border-white/5 text-zinc-300 placeholder-zinc-700 focus:border-emerald-500/50'
                                : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-emerald-500'
                            }
                            transition-all scrollbar-thin
                        `}
                        placeholder="O prontuário gerado aparecerá aqui..."
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Right Column: Chat (40%) */}
            <div className="w-[40%] h-full relative">
                {children}
            </div>
        </div>
    );
}
