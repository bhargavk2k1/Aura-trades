import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err}` }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const userId = intent.metadata?.userId;
    const amount = intent.amount / 100; // back to dollars

    if (!userId) return NextResponse.json({ ok: true });

    // Credit the user's Aura Trade account
    const account = await prisma.userAccount.findUnique({ where: { userId } });
    if (!account) return NextResponse.json({ ok: true });

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
          reference:    `Stripe ${intent.id.slice(-8)}`,
          note:         "Card deposit via Stripe",
        },
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
