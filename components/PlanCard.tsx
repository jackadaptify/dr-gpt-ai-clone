import React from 'react';
import { IconCheck, IconX, IconStar } from './Icons';
import { SubscriptionPlan } from '../types';

interface PlanCardProps {
    plan: SubscriptionPlan;
    isCurrent: boolean;
    currentPrice?: number;
    billingStatus?: string;
    onSubscribe: (slug: string) => void;
    description?: string;
    features?: string[];
    isRecommended?: boolean;
    isEnterprise?: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({
    plan,
    isCurrent,
    currentPrice,
    billingStatus,
    onSubscribe,
    description,
    features = [],
    isRecommended,
    isEnterprise
}) => {
    // Determine button text and state
    let buttonText = "Assinar Agora";
    let isDisabled = false;

    if (isCurrent) {
        buttonText = "Plano Atual";
        isDisabled = true;
    } else if (currentPrice !== undefined) {
        // user has a plan, check if upgrade or downgrade
        if (plan.price_cents > currentPrice) {
            buttonText = "Fazer Upgrade";
        } else {
            buttonText = "Fazer Downgrade";
        }
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    // Styling variants based on plan type
    const containerClasses = isRecommended
        ? "bg-gradient-to-br from-emerald-800 via-emerald-950 to-black border border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)] relative transform hover:scale-[1.02] transition-transform duration-300 z-10"
        : isEnterprise
            ? "bg-gradient-to-br from-purple-800 via-purple-950 to-black border border-purple-500/30 hover:border-purple-500/50 relative shadow-[0_0_30px_rgba(168,85,247,0.25)]"
            : "bg-surfaceHighlight border border-borderLight hover:border-textMuted relative";

    const titleColor = isRecommended || isEnterprise ? "text-white" : "text-textMain";

    // "Current Plan" Halo Effect
    const ringClass = isCurrent ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-black" : "";

    return (
        <div className={`${containerClasses} ${ringClass} rounded-2xl p-6 flex flex-col transition-all duration-300 h-full`}>
            {/* Badges */}
            {isRecommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 tracking-wide uppercase">
                    <IconStar className="w-3.5 h-3.5 fill-current" />
                    Recomendado
                </div>
            )}
            {isEnterprise && (
                <div className="absolute -top-3 right-6 bg-purple-900 border border-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-900/40">
                    Clínicas
                </div>
            )}
            {isCurrent && (
                <div className="absolute -top-3 left-6 bg-zinc-700 border border-zinc-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Seu Plano Atual
                </div>
            )}

            <div className="mb-8 mt-4">
                <h4 className={`text-xl font-bold mb-3 ${titleColor} tracking-tight`}>{plan.name}</h4>
                <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-medium ${isRecommended ? 'text-emerald-400' : isEnterprise ? 'text-purple-400' : 'text-textMuted'}`}>R$</span>
                    <span className={`text-5xl font-black ${titleColor} tracking-tighter`}>
                        {(plan.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[0]}
                        <span className="text-2xl text-opacity-60">,{(plan.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[1]}</span>
                    </span>
                    <span className={`text-sm font-medium ${isRecommended ? 'text-emerald-400' : isEnterprise ? 'text-purple-400' : 'text-textMuted'}`}>/mês</span>
                </div>
                {description && (
                    <p className={`text-sm mt-4 leading-relaxed font-medium ${isRecommended ? 'text-emerald-100/80' : isEnterprise ? 'text-purple-100/70' : 'text-textMuted'}`}>
                        {description}
                    </p>
                )}
            </div>

            <div className={`h-px w-full mb-6 ${isRecommended ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent' : isEnterprise ? 'bg-gradient-to-r from-transparent via-purple-500/50 to-transparent' : 'bg-borderLight'}`}></div>

            <ul className="space-y-4 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm group">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isRecommended ? 'bg-emerald-500 text-black shadow-sm shadow-emerald-500/50' : isEnterprise ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/50' : 'bg-zinc-800 text-zinc-400'}`}>
                            <IconCheck className={`w-3 h-3`} />
                        </div>
                        <span className={`font-medium ${isRecommended ? 'text-white' : isEnterprise ? 'text-purple-50' : 'text-textMain'}`}>
                            {feature}
                        </span>
                    </li>
                ))}
            </ul>

            <button
                onClick={() => onSubscribe(plan.slug)}
                disabled={isDisabled}
                className={`w-full mt-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all uppercase relative overflow-hidden group/btn
                    ${isDisabled
                        ? 'bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5'
                        : isRecommended
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transform hover:-translate-y-0.5'
                            : isEnterprise
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 transform hover:-translate-y-0.5'
                                : 'bg-transparent border border-zinc-600 hover:bg-zinc-800 text-white hover:border-zinc-500'
                    }
                `}
            >
                {buttonText}
            </button>
        </div>
    );
};
