import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export const authService = {
    async signUp(email: string, password: string, fullName: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
                }
            }
        });
        return { data, error };
    },

    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async getSession(): Promise<{ session: Session | null, error: any }> {
        const { data, error } = await supabase.auth.getSession();
        return { session: data.session, error };
    },

    onAuthStateChange(callback: (session: Session | null) => void) {
        return supabase.auth.onAuthStateChange((_event, session) => {
            callback(session);
        });
    }
};
