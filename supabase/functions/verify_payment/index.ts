// @ts-nocheck - Supabase Edge Function (Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
});

serve(async (req: Request) => {
    try {
        if (req.method !== "POST") {
            return new Response(
                JSON.stringify({ error: "Method not allowed" }),
                { status: 405 }
            );
        }

        const { session_id } = await req.json();

        if (!session_id) {
            return new Response(
                JSON.stringify({ ok: false, error: "Missing session_id" }),
                { status: 400 }
            );
        }

        // 🔍 Recupera a sessão do Checkout
        const session = await stripe.checkout.sessions.retrieve(session_id);

        // ❌ Pagamento não concluído
        if (session.payment_status !== "paid") {
            return new Response(
                JSON.stringify({ ok: false, error: "Payment not completed" }),
                { status: 401 }
            );
        }

        // ❌ Sessão inválida
        if (!session.customer_details?.email) {
            return new Response(
                JSON.stringify({ ok: false, error: "Missing customer email" }),
                { status: 400 }
            );
        }

        // ✅ Pagamento confirmado
        return new Response(
            JSON.stringify({
                ok: true,
                email: session.customer_details.email,
                customer_id: session.customer,
                payment_intent: session.payment_intent,
                amount_total: session.amount_total,
                currency: session.currency,
            }),
            {
                headers: { "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("verify_payment error:", error);

        return new Response(
            JSON.stringify({
                ok: false,
                error: "Internal server error",
            }),
            { status: 500 }
        );
    }
});
