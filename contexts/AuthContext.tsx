import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { User } from '../types';
import { authService } from '../services/authService';
import { planService } from '../services/planService';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        authService.getSession().then(async ({ session }) => {
            setSession(session);
            if (session?.user) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('AuthContext: Error fetching profile:', error);
                }

                // Fetch plan details
                const plan = await planService.getUserPlan(session.user.id);

                // Explicitly merge role to ensure it overrides session role
                const mergedUser = {
                    ...session.user,
                    ...profile,
                    plan, // Add plan to user object
                    role: profile?.role || session.user.role // Prefer profile role
                };

                setUser(mergedUser as User);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = authService.onAuthStateChange(async (session) => {
            setSession(session);
            if (session?.user) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) console.error('AuthContext: Error fetching profile (auth change):', error);

                // Fetch plan details
                const plan = await planService.getUserPlan(session.user.id);

                const mergedUser = {
                    ...session.user,
                    ...profile,
                    plan, // Add plan to user object
                    role: profile?.role || session.user.role // Prefer profile role
                };

                setUser(mergedUser as User);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        try {
            await authService.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            setSession(null);
            setUser(null);
            window.location.href = '/login';
        }
    };

    const value = {
        session,
        user,
        loading,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
