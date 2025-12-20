// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
            throw new Error('Missing environment variables');
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { token, full_name, email, password } = await req.json();

        if (!token || !email || !password || !full_name) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        // 1. Validate Token
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('trial_invites')
            .select('*')
            .eq('token', token)
            .single();

        if (inviteError || !invite) {
            return new Response(JSON.stringify({ error: 'Convite inválido ou não encontrado.' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        if (invite.status !== 'active') {
            return new Response(JSON.stringify({ error: 'Este convite já foi utilizado ou revogado.' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        if (new Date(invite.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: 'Este convite expirou.' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        // 2. Create User
        // Check for duplicate email handled by createUser error usually, but let's be safe
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

        // 3. Setup Trial Profile
        const trialDays = invite.trial_days || 3;
        const now = new Date();
        const endsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

        // Fetch "Pro" plan ID (user_147)
        const { data: plan } = await supabaseAdmin
            .from('subscription_plans')
            .select('id')
            .eq('slug', 'user_147')
            .single();

        const profileUpdates = {
            trial_status: 'active',
            trial_ends_at: endsAt.toISOString(),
            is_test: invite.is_test ?? true,
            billing_status: 'trial',
            billing_plan_id: plan?.id || null,
            full_name: full_name
        };

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', user.id);

        if (updateError) {
            console.error("Profile update failed", updateError);
            // Should we rollback user creation? Hard to do cleanly. 
            // We'll proceed but log error. Ideally we'd rollback.
        }

        // 4. Mark Invite Used
        const { error: inviteUpdateError } = await supabaseAdmin
            .from('trial_invites')
            .update({
                status: 'used',
                used_at: new Date().toISOString(),
                used_by: user.id
            })
            .eq('id', invite.id);

        if (inviteUpdateError) {
            console.error("Invite consumption failed to record", inviteUpdateError);
        }

        return new Response(JSON.stringify({ success: true, userId: user.id }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Consume Invite Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Erro interno no servidor' }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
        });
    }
});
