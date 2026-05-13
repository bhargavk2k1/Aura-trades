import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured } from "@/lib/stripe";

const schema = z.object({
  paymentIntentId: z.string().startsWith("pi_"),
});

export async function POST(req: Request) {
  if (!stripeConfigured) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const intent = await stripe.paymentIntents.retrieve(parsed.data.paymentIntentId);

  if (intent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment not completed." }, { status: 400 });
  }
  if (intent.metadata?.userId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Idempotency — don't double-credit if called twice
  const already = await prisma.fundTransaction.findFirst({
    where: { reference: intent.id },
  });
  if (already) {
    const account = await prisma.userAccount.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ newBalance: account?.cashBalance ?? 0 });
  }

  const amount = intent.amount / 100; // Stripe stores in cents

  const account = await prisma.userAccount.findUnique({ where: { userId: user.id } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

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
        note:         `Card deposit via Stripe`,
      },
    }),
  ]);

  return NextResponse.json({ newBalance });
}
