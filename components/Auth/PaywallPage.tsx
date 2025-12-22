import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { IconCheck, IconCreditCard } from '../Icons';

export default function PaywallPage() {
    const { user, signOut } = useAuth();
    const [billingInterval, setBillingInterval] = useState<'monthly' | 'annually'>('monthly');

    const plans = [
        {
            name: 'ESSENCIAL',
            // For annual, show monthly equivalent: 1670/12 ~= 139. 
            // Actually user said "no preço do anual deve aperecer o valor total por mes".
            // So if annual, show "139,00". If monthly, "197,00".
            price: billingInterval === 'monthly' ? '197,00' : '139,00',
            currency: 'R$',
            frequency: '/mês', // Always /mês visually
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
            // Annual: 2497/12 ~= 208. Let's round nicely or use exact? 2497/12 = 208.08
            price: billingInterval === 'monthly' ? '297,00' : '208,00',
            currency: 'R$',
            frequency: '/mês',
            billedAs: billingInterval === 'annually' ? 'Cobrado anualmente (R$ 2.497)' : null,
            slogan: 'Nunca mais leve trabalho pra casa',
            sloganColor: 'text-emerald-400',
            description: '',
            features: [
                'Consultas ILIMITADAS',
                'Prontuários em 30 segundos',
                'Dúvidas clínicas ilimitadas',
                'Pesquisa médica atualizada',
                '5 assistentes especializados',
                'Melhores IAs do mundo (GPT 5.2, Claude Sonnet 4.5, Gemini 3 Pro)',
                'Suporte prioritário'
            ],
            buttonText: 'Assinar Agora',
            link: billingInterval === 'monthly'
                ? 'https://buy.stripe.com/aFa00bbtRckw4hG2Js2sM02'
                : 'https://buy.stripe.com/6oU28jbtR2JWeWk4RA2sM03',
            highlight: true,
            badge: 'MAIS ESCOLHIDO ⭐'
        },
        {
            name: 'ENTERPRISE',
            price: '997,00',
            currency: 'R$',
            frequency: '/mês',
            slogan: 'Padronize e escale sua clínica',
            sloganColor: 'text-purple-400',
            description: 'Ideal para clínicas com 3-10 médicos',
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
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black text-white p-4 md:p-8 font-sans">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-500 tracking-tight">
                            Assinatura e Planos
                        </h1>
                        <p className="text-zinc-400 text-lg">Escolha o plano ideal para transformar sua prática médica.</p>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="text-sm text-zinc-500 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
                    >
                        Sair da Conta ({user?.email})
                    </button>
                </div>

                {/* Billing Toggle */}
                <div className="flex justify-center mb-16">
                    <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-full border border-white/5 shadow-2xl backdrop-blur-xl">
                        <button
                            onClick={() => setBillingInterval('monthly')}
                            className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${billingInterval === 'monthly'
                                ? 'bg-zinc-800 text-white shadow-lg shadow-black/50'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Mensal
                        </button>
                        <button
                            onClick={() => setBillingInterval('annually')}
                            className={`flex items-center gap-2 px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${billingInterval === 'annually'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Anual
                            <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold tracking-wide">
                                30% OFF
                            </span>
                        </button>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {plans.map((plan) => {
                        const isPro = plan.name.includes('PRO');
                        const isEnterprise = plan.name.includes('ENTERPRISE');

                        let borderColor = 'border-white/5';
                        let glowColor = '';
                        let buttonStyle = 'bg-white/5 hover:bg-white/10 text-white border border-white/10';
                        let badgeStyle = '';
                        let cardBg = 'bg-zinc-900/40';

                        if (isPro) {
                            borderColor = 'border-emerald-500/50';
                            glowColor = 'shadow-[0_0_50px_rgba(16,185,129,0.1)]';
                            buttonStyle = 'bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-lg shadow-emerald-500/20 border-0';
                            badgeStyle = 'bg-emerald-500 text-black';
                            cardBg = 'bg-zinc-900/60';
                        } else if (isEnterprise) {
                            borderColor = 'border-purple-500/30';
                            buttonStyle = 'bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-900/20 border-0';
                            cardBg = 'bg-zinc-900/40';
                        }

                        return (
                            <div
                                key={plan.name}
                                className={`
                                    relative rounded-3xl p-8 flex flex-col transition-all duration-500 group
                                    backdrop-blur-xl border ${borderColor} ${glowColor} ${cardBg}
                                    ${isPro ? 'transform md:-translate-y-6 z-10 scale-105' : 'hover:border-white/10 hover:bg-zinc-900/60'}
                                `}
                            >
                                {plan.highlight && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-xl ${badgeStyle}`}>
                                            {plan.badge}
                                        </span>
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className={`text-xl font-bold mb-3 ${isPro ? 'text-emerald-400' : isEnterprise ? 'text-purple-400' : 'text-zinc-200'}`}>
                                        {plan.name}
                                    </h3>

                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-sm text-zinc-500 font-semibold mb-auto mt-2">{plan.currency}</span>
                                        <span className="text-5xl font-extrabold text-white tracking-tighter">{plan.price}</span>
                                        <span className="text-zinc-500 font-medium">{plan.frequency}</span>
                                    </div>

                                    {plan.billedAs && (
                                        <p className="text-xs text-zinc-500 font-medium mb-4">
                                            {plan.billedAs}
                                        </p>
                                    )}

                                    {plan.slogan && (
                                        <p className={`text-sm font-medium border-l-2 pl-3 py-1 mt-4 ${isPro ? 'border-emerald-500/50' : isEnterprise ? 'border-purple-500/50' : 'border-zinc-700'} ${plan.sloganColor || 'text-zinc-400'}`}>
                                            {plan.slogan}
                                        </p>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                                <div className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-3 group/feature">
                                            <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${isPro ? 'bg-emerald-500/20 text-emerald-500 group-hover/feature:bg-emerald-500 group-hover/feature:text-black' : isEnterprise ? 'bg-purple-500/20 text-purple-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                                <IconCheck className="w-3 h-3" />
                                            </div>
                                            <span className="text-sm text-zinc-300 group-hover/feature:text-white transition-colors text-left">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {plan.link !== '#' ? (
                                    <a
                                        href={plan.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full py-4 px-4 rounded-xl transition-all duration-300 active:scale-95 flex justify-center items-center ${buttonStyle}`}
                                    >
                                        {plan.buttonText}
                                    </a>
                                ) : (
                                    <button className={`w-full py-4 px-4 rounded-xl transition-all duration-300 active:scale-95 ${buttonStyle}`}>
                                        {plan.buttonText}
                                    </button>
                                )}

                                <p className="text-center text-[10px] text-zinc-600 mt-4 font-medium uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                                    Cancela quando quiser
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Security */}
                <div className="mt-20 text-center flex items-center justify-center gap-3 text-zinc-600 text-xs">
                    <IconCreditCard className="w-4 h-4 opacity-50" />
                    <span className="opacity-50">Pagamento 100% Seguro via Stripe · Criptografia SSL de 256 bits</span>
                </div>
            </div>
        </div>
    );
}
