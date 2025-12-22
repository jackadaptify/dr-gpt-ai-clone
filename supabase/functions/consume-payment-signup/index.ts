// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
});

const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://dr-gpt.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allow localhost for development
const allowCors = (req: Request) => {
    const origin = req.headers.get('Origin');
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin === 'https://dr-gpt.app')) {
        return {
            ...corsHeaders,
            'Access-Control-Allow-Origin': origin,
        };
    }
    return corsHeaders;
};

serve(async (req: Request) => {
    const headers = allowCors(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error('Missing Supabase environment variables');
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { session_id, password, full_name } = await req.json();

        if (!session_id || !password || !full_name) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        // 1. Verify Payment with Stripe
        let session;
        try {
            session = await stripe.checkout.sessions.retrieve(session_id);
        } catch (e) {
            console.error("Stripe retrieve error", e);
            return new Response(JSON.stringify({ error: 'Sessão de pagamento inválida.' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        if (session.payment_status !== "paid") {
            return new Response(JSON.stringify({ error: 'Pagamento não confirmado.' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        // REPLAY PROTECTION: Check if session was already consumed
        const { data: existingSession } = await supabaseAdmin
            .from('consumed_stripe_sessions')
            .select('session_id')
            .eq('session_id', session_id)
            .single();

        if (existingSession) {
            return new Response(JSON.stringify({ error: 'Este pagamento já foi utilizado.' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        const email = session.customer_details?.email;
        if (!email) {
            return new Response(JSON.stringify({ error: 'Email não encontrado no pagamento.' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        // 2. Create User
        // Check for duplicate email handled by createUser error usually
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        });

        if (createError) {
            // Handle duplicate email specifically
            if (createError.message.includes('already registered') || createError.status === 422) {
                return new Response(JSON.stringify({ error: 'Este email já está cadastrado. Por favor, faça login.' }), {
                    status: 400,
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            throw createError;
        }

        const user = authData.user;
        if (!user) throw new Error('User creation failed');

        // 3. Mark Session as Consumed (Critical Step)
        const { error: consumeError } = await supabaseAdmin
            .from('consumed_stripe_sessions')
            .insert({
                session_id: session_id,
                email: email,
                user_id: user.id
            });

        if (consumeError) {
            console.error("Failed to mark session as consumed", consumeError);
            // Critical error, but user created. We log heavily.
        }

        // 4. Update Profile with Subscription Status
        const profileUpdates = {
            subscription_status: true,
            billing_status: 'active',
            stripe_customer_id: session.customer,
            full_name: full_name,
            // Clear trial flags if they existed (unlikely for new user, but good hygiene)
            trial_status: 'converted',
            // trial_ends_at: null // Optional: keep history or clear
        };

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', user.id);

        if (updateError) {
            console.error("Profile update failed", updateError);
            // Proceed anyway effectively, or alert? 
            // We return success but log error.
        }

        return new Response(JSON.stringify({ success: true, userId: user.id }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Consume Payment Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Erro interno no servidor' }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
        });
    }
});
