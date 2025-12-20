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
        ? "bg-[#0f1f18] border border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.1)] relative transform scale-105 z-10"
        : isEnterprise
            ? "bg-[#120b1e] border border-purple-500/30 hover:border-purple-500/50 relative"
            : "bg-surfaceHighlight border border-borderLight hover:border-textMuted relative";

    const titleColor = isRecommended || isEnterprise ? "text-white" : "text-textMain";
    const highlightColor = isRecommended ? "text-emerald-400" : isEnterprise ? "text-purple-400" : "text-textMain";

    // "Current Plan" Halo Effect
    const ringClass = isCurrent ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0f1f18]" : "";

    return (
        <div className={`${containerClasses} ${ringClass} rounded-2xl p-6 flex flex-col transition-all duration-300`}>
            {/* Badges */}
            {isRecommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <IconStar className="w-3 h-3 fill-current" />
                    RECOMENDADO
                </div>
            )}
            {isEnterprise && (
                <div className="absolute -top-3 right-6 bg-purple-900/80 border border-purple-500/50 text-purple-200 text-xs font-bold px-3 py-1 rounded-full">
                    CLÍNICAS
                </div>
            )}
            {isCurrent && (
                <div className="absolute -top-3 left-6 bg-zinc-800 border border-zinc-600 text-zinc-300 text-xs font-bold px-3 py-1 rounded-full">
                    SEU PLANO ATUAL
                </div>
            )}

            <div className="mb-6 mt-2">
                <h4 className={`text-xl font-bold mb-2 ${titleColor}`}>{plan.name}</h4>
                <div className="flex items-baseline gap-1">
                    <span className={`text-sm ${isRecommended ? 'text-emerald-400' : isEnterprise ? 'text-purple-400' : 'text-textMuted'}`}>R$</span>
                    <span className={`text-4xl font-extrabold ${titleColor}`}>
                        {(plan.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-sm ${isRecommended ? 'text-emerald-400' : isEnterprise ? 'text-purple-400' : 'text-textMuted'}`}>/mês</span>
                </div>
                {description && (
                    <p className={`text-sm mt-4 leading-relaxed ${isRecommended ? 'text-emerald-100/70' : isEnterprise ? 'text-purple-200/60' : 'text-textMuted'}`}>
                        {description}
                    </p>
                )}
            </div>

            <div className={`h-px w-full mb-6 ${isRecommended ? 'bg-emerald-500/20' : isEnterprise ? 'bg-purple-500/20' : 'bg-borderLight'}`}></div>

            <ul className="space-y-4 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isRecommended ? 'bg-emerald-500' : isEnterprise ? 'bg-purple-600/20' : 'bg-zinc-800'}`}>
                            <IconCheck className={`w-3 h-3 ${isRecommended ? 'text-black' : isEnterprise ? 'text-purple-400' : 'text-zinc-400'}`} />
                        </div>
                        <span className={`font-medium ${isRecommended ? 'text-white' : isEnterprise ? 'text-purple-100/90' : 'text-textMain'}`}>
                            {feature}
                        </span>
                    </li>
                ))}
            </ul>

            <button
                onClick={() => onSubscribe(plan.slug)}
                disabled={isDisabled}
                className={`w-full mt-6 py-3 rounded-xl font-bold transition-all
                    ${isDisabled
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                        : isRecommended
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 hover:scale-[1.02]'
                            : isEnterprise
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60'
                                : 'border border-zinc-700 hover:bg-zinc-800 text-white'
                    }
                `}
            >
                {buttonText}
            </button>
        </div>
    );
};
