import { supabase } from '../lib/supabase';
import { User, SubscriptionPlan } from '../types';

export const planService = {
    /**
     * Fetches the subscription plan for a given user.
     */
    async getUserPlan(userId: string): Promise<SubscriptionPlan | null> {
        try {
            // First get the user's profile to find the plan ID
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('billing_plan_id')
                .eq('id', userId)
                .single();

            if (profileError || !profile?.billing_plan_id) {
                return null;
            }

            // Then fetch the plan details
            const { data: plan, error: planError } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('id', profile.billing_plan_id)
                .single();

            if (planError) {
                console.error('Error fetching plan details:', planError);
                return null;
            }

            return plan as SubscriptionPlan;
        } catch (error) {
            console.error('Unexpected error in getUserPlan:', error);
            return null;
        }
    },

    /**
     * Checks if the user is on the "Start" plan (R$ 97).
     */
    isStartPlan(user: User | null): boolean {
        if (!user?.plan) return false;
        return user.plan.slug === 'user_97';
    },

    /**
     * Checks if the user is on the "Pro" plan (R$ 147).
     */
    isProPlan(user: User | null): boolean {
        if (!user?.plan) return false;
        return user.plan.slug === 'user_147';
    },

    /**
     * Fetches all active subscription plans.
     */
    async listActivePlans(): Promise<SubscriptionPlan[]> {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching active plans:', error);
            return [];
        }

        return data as SubscriptionPlan[];
    }
};
