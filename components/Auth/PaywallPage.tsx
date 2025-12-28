import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { IconCheck, IconCreditCard, IconLock, IconSparkles } from '../Icons';

export default function PaywallPage() {
    const { user, signOut } = useAuth();
    const [billingInterval, setBillingInterval] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');

    const plans = [
        {
            name: 'ESSENCIAL',
            price: billingInterval === 'monthly' ? '197,00' : billingInterval === 'quarterly' ? '197,00' : '139,00',
            currency: 'R$',
            frequency: '/mês',
            billedAs: billingInterval === 'annually' ? 'Cobrado anualmente (R$ 1.670)' : null,
            slogan: 'Saia do consultório 2 horas mais cedo',
            sloganColor: 'text-blue-400',
            description: '',
            features: [
                '3 consultas/dia documentadas',
                'Prontuários em 30 segundos',
                'Dúvidas clínicas ilimitadas',
                'IA rápida e precisa',
                'Suporte por email'
            ],
            buttonText: 'Assinar Agora',
            link: billingInterval === 'monthly'
                ? 'https://buy.stripe.com/3cI28j55t1FS5lKabU2sM04'
                : 'https://buy.stripe.com/eVq9ALapNacocOcabU2sM05',
            highlight: false
        },
        {
            name: 'PRO',
            price: billingInterval === 'monthly' ? '299,00' : billingInterval === 'quarterly' ? '249,00' : '199,00',
            currency: 'R$',
            frequency: '/mês',
            billedAs: billingInterval === 'annually'
                ? 'Cobrado anualmente (R$ 2.388)'
                : billingInterval === 'quarterly'
                    ? 'Cobrado trimestralmente (R$ 747)'
                    : null,
            slogan: 'Nunca mais leve trabalho pra casa',
            sloganColor: 'text-emerald-400',
            description: '',
            features: [
                'Consultas ilimitadas',
                'Transcrição em tempo real',
                'Todos os formatos de prontuário',
                'Debate com agente clínico',
                'Projetos ilimitados',
                'Pesquisa médica avançada ILIMITADA'
            ],
            buttonText: 'Garantir Oferta Exclusiva',
            link: billingInterval === 'annually'
                ? 'https://pay.cakto.com.br/8pg8xjb'
                : 'https://pay.cakto.com.br/35r66np',
            highlight: true,
            badge: 'OFERTA SECRETA 🔒'
        },
        {
            name: 'ENTERPRISE',
            price: billingInterval === 'monthly' || billingInterval === 'quarterly' ? '999,00' : '833,00',
            currency: 'R$',
            frequency: '/mês',
            slogan: 'Padronize e escale sua clínica',
            sloganColor: 'text-purple-400',
            description: 'Ideal para clínicas com 3-10 médicos',
            billedAs: billingInterval === 'annually' ? 'Cobrado anualmente (R$ 10.000)' : null,
            features: [
                'Até 5 médicos inclusos',
                'Protocolos personalizados',
                'Dashboard administrativo',
                'API e integrações',
                'Gerente de sucesso dedicado'
            ],
            buttonText: 'Falar com Especialista',
            link: '#',
            highlight: false
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans overflow-x-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-emerald-900/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Exclusive Banner */}
                <div className="mx-auto max-w-3xl mb-12 text-center transform hover:scale-[1.01] transition-transform duration-500">
                    <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/20 shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)] mb-6 backdrop-blur-md">
                        <IconLock className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-200 text-sm font-semibold tracking-wide uppercase">
                            Acesso Exclusivo Liberado
                        </span>
                        <div className="h-1 w-1 bg-amber-400 rounded-full animate-ping" />
                    </div>

                    <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-[1.1]">
                        Desbloqueie seu <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-emerald-400">
                            Potencial Médico Máximo
                        </span>
                    </h1>

                    <div className="flex flex-col items-center gap-2">
                        <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            Você foi selecionado para acessar condições especiais de lançamento.
                            <strong className="text-zinc-200 font-semibold block mt-1">
                                Estes valores são válidos apenas para participantes do grupo Beta.
                            </strong>
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center max-w-5xl mx-auto mb-8 px-4">
                    <button
                        onClick={() => signOut()}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-2 group"
                    >
                        <span>Sair da conta ({user?.email})</span>
                    </button>
                    <div className="text-xs text-emerald-500/80 font-mono flex items-center gap-2 bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        OFERTA ATIVA
                    </div>
                </div>

                {/* Billing Toggle */}
                <div className="flex justify-center mb-16 relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-xl opacity-50" />
                    <div className="flex items-center gap-1 bg-zinc-900/90 p-1.5 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl relative z-10">
                        {['monthly', 'quarterly', 'annually'].map((interval) => {
                            const labels: Record<string, string> = { monthly: 'Mensal', quarterly: 'Trimestral', annually: 'Anual' };
                            const isActive = billingInterval === interval;
                            return (
                                <button
                                    key={interval}
                                    onClick={() => setBillingInterval(interval as any)}
                                    className={`
                                        relative px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300
                                        ${isActive
                                            ? 'text-white shadow-lg scale-105'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                        }
                                    `}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-full -z-10 shadow-inner border-t border-white/10" />
                                    )}
                                    <span className="flex items-center gap-2">
                                        {labels[interval]}
                                        {interval === 'annually' && (
                                            <span className="text-[9px] bg-emerald-500 text-black px-1.5 py-0.5 rounded shadow-sm font-extrabold tracking-tight transform -translate-y-0.5">
                                                -30%
                                            </span>
                                        )}
                                        {interval === 'quarterly' && (
                                            <span className="text-[9px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded shadow-sm font-bold tracking-tight transform -translate-y-0.5">
                                                -15%
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto">
                    {plans.map((plan) => {
                        const isPro = plan.name.includes('PRO');
                        const isEnterprise = plan.name.includes('ENTERPRISE');

                        let borderColor = 'border-zinc-800';
                        let buttonStyle = 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200';
                        let cardBg = 'bg-zinc-900/50';
                        let glowEffect = '';

                        if (isPro) {
                            borderColor = 'border-amber-500/30';
                            buttonStyle = 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 border-t border-white/20';
                            cardBg = 'bg-zinc-900/80';
                            glowEffect = 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.15)]';
                        } else if (isEnterprise) {
                            borderColor = 'border-purple-500/20';
                            buttonStyle = 'bg-zinc-800 hover:bg-zinc-700 text-purple-200 border border-purple-500/20';
                        }

                        return (
                            <div
                                key={plan.name}
                                className={`
                                    relative rounded-3xl p-1 flex flex-col transition-all duration-500 group
                                    ${isPro ? 'md:-translate-y-8 z-10' : 'hover:bg-zinc-900/80'}
                                `}
                            >
                                {/* Gradient Border for Pro */}
                                {isPro && (
                                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/40 via-transparent to-transparent rounded-3xl opacity-100 pointer-events-none" />
                                )}

                                <div className={`
                                    relative h-full rounded-[22px] p-8 flex flex-col overflow-hidden backdrop-blur-xl border
                                    ${borderColor} ${cardBg} ${glowEffect}
                                `}>

                                    {plan.highlight && (
                                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
                                    )}

                                    {plan.highlight && (
                                        <div className="absolute top-6 right-6">
                                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider text-amber-400 shadow-sm">
                                                <IconSparkles className="w-3 h-3" />
                                                {plan.badge}
                                            </span>
                                        </div>
                                    )}

                                    <div className="mb-8 relative">
                                        <h3 className={`text-lg font-bold mb-4 tracking-wide ${isPro ? 'text-white' : 'text-zinc-400'}`}>
                                            {plan.name}
                                        </h3>

                                        <div className="flex items-end gap-1.5 mb-2">
                                            <span className="text-zinc-500 font-semibold mb-1.5 text-lg">{plan.currency}</span>
                                            <span className={`text-5xl font-extrabold tracking-tighter ${isPro ? 'text-white' : 'text-zinc-200'}`}>{plan.price}</span>
                                            <span className="text-zinc-500 font-medium mb-1.5">{plan.frequency}</span>
                                        </div>

                                        {plan.billedAs && (
                                            <p className="text-xs text-zinc-500 font-medium">
                                                {plan.billedAs}
                                            </p>
                                        )}

                                        {!plan.billedAs && <div className="h-4" />} {/* Spacer */}

                                        <div className="mt-6 pt-6 border-t border-dashed border-white/5">
                                            <p className={`text-sm font-medium leading-relaxed ${isPro ? 'text-amber-100' : 'text-zinc-400'}`}>
                                                "{plan.slogan}"
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-10 flex-1">
                                        {plan.features.map((feature, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPro ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                                                    <IconCheck className="w-3 h-3" />
                                                </div>
                                                <span className={`text-sm ${isPro ? 'text-zinc-200' : 'text-zinc-400'}`}>{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <a
                                        href={plan.link}
                                        target={plan.link !== '#' ? "_blank" : undefined}
                                        rel="noopener noreferrer"
                                        className={`w-full py-4 rounded-xl font-bold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center shadow-xl ${buttonStyle}`}
                                    >
                                        {plan.buttonText}
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Secure Footer */}
                <div className="mt-24 pb-8 flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center gap-2 text-zinc-500/60 mix-blend-plus-lighter">
                        <IconLock className="w-3 h-3" />
                        <span className="text-[10px] font-medium uppercase tracking-widest">Ambiente Seguro</span>
                    </div>
                    <p className="text-zinc-600 text-xs max-w-md text-center">
                        Cancele a qualquer momento. Suporte humano 24/7. <br />
                        Ao assinar, você concorda com nossos Termos de Uso Exclusivos para membros Beta.
                    </p>
                </div>
            </div>
        </div>
    );
}
