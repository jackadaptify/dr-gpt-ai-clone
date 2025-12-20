import React from 'react';
import { Microscope, Info } from 'lucide-react';

interface DeepResearchToggleProps {
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
    credits: number;
}

export const DeepResearchToggle: React.FC<DeepResearchToggleProps> = ({ isEnabled, onToggle, credits }) => {
    return (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                    <Microscope size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Deep Research
                        <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-blue-600 text-white rounded shadow-sm">
                            PRO
                        </span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[280px]">
                        Utiliza o modelo <strong>Perplexity Sonar Reasoning Pro</strong> para varrer bases de dados científicas em tempo real.
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                        <span className={credits > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                            {credits} créditos disponíveis
                        </span>
                        <span className="mx-1">•</span>
                        <span>1 crédito por pesquisa</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center">
                <button
                    onClick={() => onToggle(!isEnabled)}
                    className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
          `}
                >
                    <span className="sr-only">Toggle Deep Research</span>
                    <span
                        aria-hidden="true"
                        className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
              ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
            `}
                    />
                </button>
            </div>
        </div>
    );
};
