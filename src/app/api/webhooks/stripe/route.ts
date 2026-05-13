import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const secret    = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  if (!secret || secret === "whsec_REPLACE_ME") {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature failed: ${err}` }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const userId  = intent.metadata?.userId;
    if (!userId) return NextResponse.json({ received: true });

    // Idempotency — skip if already credited
    const already = await prisma.fundTransaction.findFirst({
      where: { reference: intent.id },
    });
    if (already) return NextResponse.json({ received: true });

    const amount  = intent.amount / 100;
    const account = await prisma.userAccount.findUnique({ where: { userId } });
    if (!account) return NextResponse.json({ received: true });

    const newBalance = account.cashBalance + amount;
    await prisma.$transaction([
      prisma.userAccount.update({
        where: { id: account.id },
        data:  { cashBalance: newBalance },
      }),
      prisma.fundTransaction.create({
        data: {
          accountId:    account.id,
          type:         "deposit",
          amount,
          balanceAfter: newBalance,
          status:       "completed",
          reference:    intent.id,
          note:         "Card deposit via Stripe webhook",
        },
      }),
    ]);
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    console.error(`Payment failed for user ${intent.metadata?.userId}: ${intent.last_payment_error?.message}`);
  }

  return NextResponse.json({ received: true });
}
