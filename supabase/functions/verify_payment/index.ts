// @ts-nocheck - Supabase Edge Function (Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
});

function corsHeaders(origin: string | null) {
    // Ajuste se quiser whitelist. Aqui fica permissivo para não quebrar o fluxo.
    // Se você já tem CORS "fail-closed" em outras funções, pode copiar o padrão.
    return {
        "Access-Control-Allow-Origin": origin ?? "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json",
    };
}

serve(async (req: Request) => {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
        if (req.method === "OPTIONS") {
            return new Response(null, { status: 204, headers });
        }

        if (req.method !== "POST") {
            return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
                status: 405,
                headers,
            });
        }

        const body = await req.json().catch(() => ({}));
        const session_id = body?.session_id;

        if (!session_id) {
            return new Response(JSON.stringify({ ok: false, error: "Missing session_id" }), {
                status: 400,
                headers,
            });
        }

        // 🔍 Retrieve the Checkout Session
        const session = await stripe.checkout.sessions.retrieve(session_id);

        // ✅ Must be a completed checkout session
        if (session.status !== "complete") {
            return new Response(JSON.stringify({ ok: false, error: "Checkout not completed" }), {
                status: 401,
                headers,
            });
        }

        // ✅ Accept both normal payment and trial/no-payment-required
        const okPayment =
            session.payment_status === "paid" ||
            session.payment_status === "no_payment_required";

        if (!okPayment) {
            return new Response(JSON.stringify({ ok: false, error: "Payment not confirmed yet" }), {
                status: 401,
                headers,
            });
        }

        // ✅ Email is mandatory
        const email = session.customer_details?.email || session.customer_email;
        if (!email) {
            return new Response(JSON.stringify({ ok: false, error: "Missing customer email" }), {
                status: 400,
                headers,
            });
        }

        // ✅ OK
        return new Response(
            JSON.stringify({
                ok: true,
                email,
                customer_id: session.customer ?? null,

                // Useful debug fields (safe enough for your current UI)
                status: session.status,
                payment_status: session.payment_status,
                mode: session.mode,
                subscription_id: session.subscription ?? null,
                payment_intent: session.payment_intent ?? null,
                amount_total: session.amount_total ?? null,
                currency: session.currency ?? null,
            }),
            { status: 200, headers }
        );
    } catch (error) {
        console.error("verify_payment error:", error);

        return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), {
            status: 500,
            headers,
        });
    }
});
