import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { planService } from '../services/planService';
import { SubscriptionPlan } from '../types';
import { useAuth } from '../contexts/AuthContext'; // Only for getting user ID context
import { PlanCard } from './PlanCard';

const PLAN_CHECKOUT_URLS: Record<string, string> = {
    'essential': 'https://checkout.stripe.com/c/pay/placeholder_essential',
    'pro': 'https://checkout.stripe.com/c/pay/placeholder_pro',
    'elite': 'https://checkout.stripe.com/c/pay/placeholder_elite',
    // Fallbacks
    'user_97': 'https://checkout.stripe.com/c/pay/placeholder_essential',
    'user_147': 'https://checkout.stripe.com/c/pay/placeholder_pro',
};

const PLAN_DETAILS: Record<string, { description: string; features: string[]; isRecommended?: boolean; isEnterprise?: boolean }> = {
    'essential': {
        description: "Pare de levar trabalho para casa. Automatize a escrita dos seus prontuários (SOAP) e recupere até 1 hora do seu dia.",
        features: [
            "Scribe: 10 consultas/mês",
            "Modelos Rápidos (Flash/Mini)",
            "Acesso Mobile e Web",
            "Suporte por Email"
        ]
    },
    'pro': {
        description: "O sistema operacional do consultório moderno. Tenha um time de IA para zerar suas glosas e escalar seu atendimento.",
        isRecommended: true,
        features: [
            "Transcrição: ILIMITADA",
            "Anti-Glosa ILIMITADO",
            "Agentes de Marketing ILIMITADOS",
            "Modelos de Elite (GPT-5.2, Claude 4.5)",
            "Geração ILIMITADA de Imagens",
            "Suporte Prioritário"
        ]
    },
    'elite': {
        description: "Infraestrutura de alta performance para clínicas. Controle total de múltiplos profissionais e gestão centralizada.",
        isEnterprise: true,
        features: [
            "Tudo do plano Profissional",
            "Múltiplos Usuários",
            "RAG Personalizado (Protocolos)",
            "Gestão de Equipes",
            "Dashboard Administrativo",
            "Onboarding Assistido"
        ]
    }
};

const PREFERRED_ORDER = ['essential', 'pro', 'elite'];

interface UserBillingProfile {
    id: string;
    billing_plan_id: string | null;
    billing_status: string | null;
    billing_current_period_end: string | null;
    trial_status: string | null;
    trial_ends_at: string | null;
}

export const SubscriptionPlansSection: React.FC = () => {
    const { user } = useAuth();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [profile, setProfile] = useState<UserBillingProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const mountingRef = useRef(true);

    useEffect(() => {
        mountingRef.current = true;

        const loadData = async () => {
            if (!user) return;

            try {
                // 1. Fetch Profile for reliable billing status
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id,billing_plan_id,billing_status,billing_current_period_end,trial_status,trial_ends_at')
                    .eq('id', user.id)
                    .single();

                if (profileError && profileError.code !== 'PGRST116') {
                    console.error("Error fetching profile:", profileError);
                }

                // 2. Fetch Active Plans
                const activePlans = await planService.listActivePlans();

                // 3. Sort Plans
                const sortedPlans = activePlans.sort((a, b) => {
                    // Try to match strict slugs first, then fallbacks
                    const getSlugKey = (slug: string) => {
                        if (slug.includes('97')) return 'essential';
                        if (slug.includes('147') || slug.includes('297')) return 'pro';
                        if (slug.includes('997')) return 'elite';
                        return slug;
                    };

                    const indexA = PREFERRED_ORDER.indexOf(getSlugKey(a.slug));
                    const indexB = PREFERRED_ORDER.indexOf(getSlugKey(b.slug));

                    // If both are in the preferred list, sort by order
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    // If A is in list but B is not, A comes first
                    if (indexA !== -1) return -1;
                    // If B is in list but A is not, B comes first
                    if (indexB !== -1) return 1;
                    // Otherwise sort by price
                    return a.price_cents - b.price_cents;
                });

                if (mountingRef.current) {
                    setProfile(profileData as UserBillingProfile);
                    setPlans(sortedPlans);
                }
            } catch (err) {
                console.error("Unexpected error loading subscription data:", err);
            } finally {
                if (mountingRef.current) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            mountingRef.current = false;
        };
    }, [user]);

    const handleSubscribe = (slug: string) => {
        // Logic to redirect to checkout
        // Find best matching key for URL map
        let url = PLAN_CHECKOUT_URLS[slug];

        // Try fallback logic if exact slug not found
        if (!url) {
            if (slug.includes('97')) url = PLAN_CHECKOUT_URLS['essential'];
            else if (slug.includes('147') || slug.includes('297')) url = PLAN_CHECKOUT_URLS['pro'];
            else if (slug.includes('997')) url = PLAN_CHECKOUT_URLS['elite'];
        }

        if (url) {
            window.open(url, '_blank');
        } else {
            console.warn(`No checkout URL configured for plan: ${slug}`);
            alert("Em breve! Entre em contato com o suporte.");
        }
    };

    const normalizeFeatures = (plan: SubscriptionPlan) => {
        // First try to use static map details
        let detailsKey = plan.slug;
        if (plan.slug.includes('97')) detailsKey = 'essential';
        else if (plan.slug.includes('147') || plan.slug.includes('297')) detailsKey = 'pro';
        else if (plan.slug.includes('997')) detailsKey = 'elite';

        const staticDetail = PLAN_DETAILS[detailsKey];
        if (staticDetail?.features) return staticDetail.features;

        // Fallback to jsonb if available and array
        if (Array.isArray(plan.features)) return plan.features;

        // If it's an object (legacy), try to extract meaningful keys or return empty
        if (typeof plan.features === 'object' && plan.features !== null) {
            return Object.keys(plan.features);
        }

        return [];
    };

    const getPlanDetails = (plan: SubscriptionPlan) => {
        let detailsKey = plan.slug;
        if (plan.slug.includes('97')) detailsKey = 'essential';
        else if (plan.slug.includes('147') || plan.slug.includes('297')) detailsKey = 'pro';
        else if (plan.slug.includes('997')) detailsKey = 'elite';

        return PLAN_DETAILS[detailsKey] || { description: '', features: [], isRecommended: false, isEnterprise: false };
    };

    // Calculate Current Price for Upgrade/Downgrade logic
    const currentPlan = plans.find(p => p.id === profile?.billing_plan_id);
    const currentPrice = currentPlan?.price_cents;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-emerald-500 min-h-[400px]">
                <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Header Status */}
            <div className="mb-6 p-4 bg-surfaceHighlight border border-borderLight rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-textMain uppercase tracking-wider mb-1">Status da Assinatura</h3>
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile?.billing_plan_id ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700/50 text-zinc-400'
                            }`}>
                            {profile?.billing_plan_id ? (currentPlan?.name || 'Ativo') : 'Free / Sem Plano'}
                        </span>
                        {profile?.trial_status === 'active' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                                Trial Ativo
                            </span>
                        )}
                    </div>
                </div>
                {profile?.billing_current_period_end && (
                    <div className="text-right">
                        <p className="text-xs text-textMuted">Renova em</p>
                        <p className="text-sm font-medium text-textMain">
                            {new Date(profile.billing_current_period_end).toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                )}
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
                {plans.map(plan => {
                    const details = getPlanDetails(plan);
                    const features = normalizeFeatures(plan);
                    const isCurrent = plan.id === profile?.billing_plan_id;

                    return (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            isCurrent={isCurrent}
                            currentPrice={currentPrice}
                            billingStatus={profile?.billing_status || undefined}
                            onSubscribe={handleSubscribe}
                            description={details.description}
                            features={features}
                            isRecommended={details.isRecommended}
                            isEnterprise={details.isEnterprise}
                        />
                    );
                })}
            </div>
        </div>
    );
};
