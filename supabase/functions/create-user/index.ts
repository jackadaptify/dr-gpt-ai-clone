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

    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers });
    }

    try {
        // 2. Setup Supabase Clients
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        // Default to origin or a fixed prod URL if env is missing, though env is preferred
        const appUrl = Deno.env.get('APP_URL') || 'https://dr-gpt.app';

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        }

        // Admin Client (Bypasses RLS)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        // 3. Authenticate Caller
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        // Robust Token Parsing (handles multiple spaces)
        const token = authHeader.replace(/^Bearer\s+/i, '');

        const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !caller) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 4. Verify Admin Authority (Strict Check against DB)
        const { data: callerProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', caller.id)
            .single();

        if (profileError || callerProfile?.role !== 'admin') {
            console.error(`Unauthorized attempt by user ${caller.id} (role: ${callerProfile?.role})`);
            return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 5. Parse Request Body
        const { email, password, fullName, trialDays, isTest, generateMagicLink } = await req.json();

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 6. Check if user already exists
        const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
        let targetUser = existingUsers.find(u => u.email === email);
        let isNewUser = false;

        // 7. Create User if not exists
        if (!targetUser) {
            // If generating magic link, we don't strictly need a password, but `createUser` might require it. 
            // We'll generate a random strong password if none provided for magic link flows.
            const finalPassword = password || crypto.randomUUID() + crypto.randomUUID();

            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: finalPassword,
                email_confirm: true, // Auto-confirm
                user_metadata: { full_name: fullName || '' }
            });

            if (createError) throw createError;
            if (!newUser.user) throw new Error('Failed to create user object');

            targetUser = newUser.user;
            isNewUser = true;
        }

        // 8. Determine Trial Values
        let trialUpdates = {};
        if (isTest || trialDays) {
            const days = trialDays || 3; // Default to 3
            const now = new Date();
            const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

            trialUpdates = {
                trial_status: 'active',
                trial_ends_at: endsAt.toISOString(),
                is_test: true
            };
        }

        // 9. Fetch Pro Plan ID Dynamically (for defaults)
        // If creating new user, we assign plan. If existing, we ONLY update trial fields if explicitly requested (isTest/trialDays present)
        // BUT if it's a test user, we usually want to give them the Pro features access via the plan or just rely on trial check?
        // Let's ensure they have a plan ID that allows basic access, or just rely on the trial logic overwriting the "check".
        // For now, let's keep the existing logic of assigning 'user_147' (Pro) if it's a NEW user.

        let profileUpdates = { ...trialUpdates };

        if (isNewUser) {
            const { data: plan, error: planError } = await supabaseAdmin
                .from('subscription_plans')
                .select('id')
                .eq('slug', 'user_147') // Target Pro Plan
                .single();

            if (!planError && plan) {
                profileUpdates.billing_plan_id = plan.id;
                profileUpdates.billing_status = 'active'; // Or 'trialing'? Let's use 'active' to ensure Feature Guards pass until trial_ends_at check logic intercepts.
            }

            profileUpdates.id = targetUser.id;
            profileUpdates.email = email;
            profileUpdates.full_name = fullName;
            profileUpdates.role = 'user';
        } else {
            profileUpdates.id = targetUser.id; // Ensure ID for upsert
        }

        // 10. Update Profile (Upsert)
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .upsert(profileUpdates)
            .select();

        if (updateError) {
            console.error('Failed to update profile:', updateError);
            throw new Error('User created/found but failed to update profile');
        }

        // 11. Generate Magic Link (If requested)
        let magicLinkData = null;
        if (generateMagicLink) {
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
                options: {
                    redirectTo: `${appUrl}/auth/callback`
                }
            });

            if (linkError) throw linkError;
            magicLinkData = linkData;
        }

        return new Response(JSON.stringify({
            message: isNewUser ? 'User created successfully' : 'User updated successfully',
            user: {
                id: targetUser.id,
                email: targetUser.email,
                trial_ends_at: trialUpdates.trial_ends_at,
                trial_status: trialUpdates.trial_status
            },
            magicLink: magicLinkData?.properties?.action_link || null
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Create User Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
