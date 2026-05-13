import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  amount:        z.number().positive().max(10_000_000),
  type:          z.enum(["deposit", "withdrawal"]),
  cardId:        z.string().optional(),
  bankAccountId: z.string().optional(),
  note:          z.string().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { amount, type, cardId, note } = schema.parse(body);

    // Resolve payment method label for reference
    let reference = "";
    if (cardId) {
      const card = await prisma.savedCard.findUnique({ where: { id: cardId } });
      if (!card || card.userId !== user.id) return NextResponse.json({ error: "Card not found." }, { status: 404 });
      reference = `${card.cardType.toUpperCase()} •••• ${card.last4}`;
    }

    const account = await prisma.userAccount.findUnique({ where: { userId: user.id } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    if (type === "withdrawal" && account.cashBalance - account.reservedCash < amount) {
      return NextResponse.json({ error: "Insufficient available balance" }, { status: 422 });
    }

    const newBalance = type === "deposit" ? account.cashBalance + amount : account.cashBalance - amount;

    await prisma.$transaction([
      prisma.userAccount.update({ where: { id: account.id }, data: { cashBalance: newBalance } }),
      prisma.fundTransaction.create({
        data: { accountId: account.id, type, amount, balanceAfter: newBalance, status: "completed", reference, note: note ?? "" },
      }),
    ]);

    return NextResponse.json({ balance: newBalance });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
