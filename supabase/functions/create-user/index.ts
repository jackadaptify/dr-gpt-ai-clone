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
        const { email, password, fullName } = await req.json();

        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email and password are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 6. Fetch Pro Plan ID Dynamically
        const { data: plan, error: planError } = await supabaseAdmin
            .from('subscription_plans')
            .select('id')
            .eq('slug', 'user_147') // Target Pro Plan
            .single();

        if (planError || !plan) {
            console.error('Pro Plan (user_147) not found in database');
            throw new Error('System Configuration Error: Pro Plan not found');
        }

        // 7. Create User
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm
            user_metadata: { full_name: fullName || '' }
        });

        if (createError) throw createError;
        if (!newUser.user) throw new Error('Failed to create user object');

        // 8. Assign Plan & Activate Billing (Direct DB Update)
        // Note: The 'on_auth_user_created' trigger might have already created the profile row.
        // We use upsert to be safe, or update if we trust the trigger.
        // Given race conditions, we'll wait a brief moment or retry?
        // Actually, since we are admin, we can just UPSERT to ensure it's set.

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUser.user.id, // Match the Auth ID
                email: email,        // Sync email
                full_name: fullName,
                billing_plan_id: plan.id,
                billing_status: 'active',
                role: 'user' // Default to user role, NOT admin
            })
            .select();

        if (updateError) {
            // Rollback user creation if profile update fails? 
            // Ideally yes, but for now we'll just report the error.
            console.error('Failed to update profile constraints:', updateError);
            throw new Error('User created but failed to assign plan profile');
        }

        return new Response(JSON.stringify({
            message: 'User created successfully',
            user: {
                id: newUser.user.id,
                email: newUser.user.email,
                plan: 'Pro (user_147)'
            }
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
