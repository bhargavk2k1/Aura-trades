import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.userAccount.findUnique({ where: { userId: session.sub } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const available = account.cashBalance - account.reservedCash;

  return NextResponse.json({
    equity:         account.cashBalance,
    cash:           account.cashBalance,
    buyingPower:    available,
    portfolioValue: account.cashBalance,
    lastEquity:     account.cashBalance,
    dayPnl:         0,
    status:         "ACTIVE",
    source:         "aura"
  });
}
