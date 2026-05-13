import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { stripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const schema = z.object({
  amount: z.number().positive().max(1_000_000),
});

export async function POST(req: Request) {
  if (!stripeConfigured) {
    return NextResponse.json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local." }, { status: 503 });
  }

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const { amount } = parsed.data;

  // Create a PaymentIntent — amount in cents
  const intent = await stripe.paymentIntents.create({
    amount:   Math.round(amount * 100),
    currency: "usd",
    metadata: { userId: user.id, purpose: "deposit" },
    automatic_payment_methods: { enabled: true },
    description: `Aura Trade deposit — ${user.email}`,
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}
