import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { IconCheck, IconCreditCard } from '../Icons';

export default function PaywallPage() {
    const { user, signOut } = useAuth();

    const plans = [
        {
            name: 'Essencial',
            price: '97,00',
            description: 'Pare de levar trabalho para casa. Automatize a escrita dos seus prontuários (SOAP) e recupere até 1 hora do seu dia.',
            features: [
                'Scribe: 10 consultas/mês',
                'Modelos Rápidos (Flash/Mini)',
                'Acesso Mobile e Web',
                'Suporte por Email'
            ],
            buttonText: 'Fazer Downgrade', // Using placeholder text from screenshot or adapting? 
            // Since this is paywall, let's use "Assinar Agora" or similar as user is not subscribed.
            // Screenshot has "Fazer Downgrade" because user was on Pro.
            // I will use "Escolher Plano" or "Assinar" for all since user has NO plan.
            highlight: false
        },
        {
            name: 'Pro',
            price: '297,00',
            description: 'Pare de levar trabalho para casa. Automatize a escrita dos seus prontuários (SOAP) e recupere até 1 hora do seu dia.',
            features: [
                'Scribe: 10 consultas/mês', // Text from screenshot seems identical, using it as is.
                'Modelos Rápidos (Flash/Mini)',
                'Acesso Mobile e Web',
                'Suporte por Email'
            ],
            highlight: true
        },
        {
            name: 'Enterprise',
            price: '997,00',
            description: 'Pare de levar trabalho para casa. Automatize a escrita dos seus prontuários (SOAP) e recupere até 1 hora do seu dia.',
            features: [
                'Scribe: 10 consultas/mês',
                'Modelos Rápidos (Flash/Mini)',
                'Acesso Mobile e Web',
                'Suporte por Email'
            ],
            highlight: false
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Assinatura e Planos</h1>
                        <p className="text-zinc-400">Gerencie seu plano e método de pagamento.</p>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="text-sm text-zinc-500 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-zinc-900"
                    >
                        Sair da Conta ({user?.email})
                    </button>
                </div>

                {/* Status Section (Optional based on screenshot, keeping simple for now as they have NO status) */}
                <div className="bg-zinc-900/50 rounded-xl p-6 mb-12 border border-zinc-800">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">STATUS DA ASSINATURA</span>
                    </div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                        Inativa
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative rounded-2xl p-6 flex flex-col ${plan.highlight
                                    ? 'bg-zinc-900 border-2 border-emerald-500/50'
                                    : 'bg-zinc-900 border border-zinc-800'
                                }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-3 left-6">
                                    <span className="bg-zinc-800 text-white text-xs font-bold px-3 py-1 rounded-full border border-zinc-700 uppercase tracking-wide">
                                        Recomendado
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm text-zinc-400">R$</span>
                                    <span className="text-4xl font-bold text-white tracking-tight">{plan.price}</span>
                                    <span className="text-zinc-500">/mês</span>
                                </div>
                            </div>

                            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                                {plan.description}
                            </p>

                            <div className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <IconCheck className="w-5 h-5 text-zinc-500 shrink-0" />
                                        <span className="text-sm text-zinc-300">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${plan.highlight
                                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700' // Using darker button as per screenshot
                                    : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50'
                                }`}>
                                Assinar Agora
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
