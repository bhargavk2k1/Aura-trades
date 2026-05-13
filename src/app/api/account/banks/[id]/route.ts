import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// ── DELETE: remove a bank account ────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bank = await prisma.bankAccount.findUnique({ where: { id } });
  if (!bank || bank.userId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.bankAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// ── POST: verify micro-deposits ───────────────────────────────────────────────
const verifySchema = z.object({
  amount1: z.number().min(0.01).max(0.99),
  amount2: z.number().min(0.01).max(0.99),
});

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bank = await prisma.bankAccount.findUnique({ where: { id } });

  if (!bank || bank.userId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (bank.status === "verified") {
    return NextResponse.json({ error: "Account already verified." }, { status: 400 });
  }
  if (bank.verifyAttempts >= 3) {
    await prisma.bankAccount.update({ where: { id }, data: { status: "rejected" } });
    return NextResponse.json({ error: "Too many failed attempts. This account has been locked." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter valid dollar amounts." }, { status: 400 });
  }

  const { amount1, amount2 } = parsed.data;

  // Check both amounts match (order-insensitive, ±$0.01 tolerance)
  const stored = [bank.microDeposit1!, bank.microDeposit2!].sort();
  const given  = [amount1, amount2].sort();
  const match  =
    Math.abs(stored[0] - given[0]) < 0.015 &&
    Math.abs(stored[1] - given[1]) < 0.015;

  if (!match) {
    const attempts = bank.verifyAttempts + 1;
    await prisma.bankAccount.update({ where: { id }, data: { verifyAttempts: attempts } });
    const remaining = 3 - attempts;
    return NextResponse.json({
      error: remaining > 0
        ? `Amounts don't match. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many failed attempts. This account has been locked.",
      locked: remaining <= 0,
    }, { status: 400 });
  }

  // ✅ Verified
  await prisma.bankAccount.update({
    where: { id },
    data: { status: "verified", microDeposit1: null, microDeposit2: null },
  });

  return NextResponse.json({ ok: true, message: "Bank account verified successfully!" });
}
