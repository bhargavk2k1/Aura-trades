import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuotes, quoteToLivePrice } from "@/lib/finnhub/market";

export const dynamic = "force-dynamic";

function parseList(url: string): number {
  const n = parseInt(new URL(url).searchParams.get("list") ?? "0");
  return isNaN(n) || n < 0 || n > 9 ? 0 : n;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listIndex = parseList(req.url);

  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.sub, listIndex },
    orderBy: { addedAt: "asc" }
  });
  const symbols = items.map((i) => i.symbol);
  if (symbols.length === 0) return NextResponse.json([]);

  try {
    const quotes = await getQuotes(symbols);
    const result = items.map((item) => {
      const q = quotes[item.symbol];
      if (!q || q.c === 0) return { symbol: item.symbol, price: 0, change: 0, changePercent: 0, volume: 0, addedAt: item.addedAt, priceAtAdd: item.priceAtAdd ?? null, sinceAddedPercent: null };
      const lp = quoteToLivePrice(item.symbol, q);
      const sinceAddedPercent = item.priceAtAdd && item.priceAtAdd > 0
        ? ((lp.price - item.priceAtAdd) / item.priceAtAdd) * 100
        : null;
      return { ...lp, addedAt: item.addedAt, priceAtAdd: item.priceAtAdd ?? null, sinceAddedPercent };
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(items.map((item) => ({ symbol: item.symbol, price: 0, change: 0, changePercent: 0, volume: 0, addedAt: item.addedAt, priceAtAdd: item.priceAtAdd ?? null, sinceAddedPercent: null })));
  }
}

const addSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  listIndex: z.number().int().min(0).max(9).default(0),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const { symbol, listIndex } = parsed.data;

  let priceAtAdd: number | null = null;
  try {
    const quotes = await getQuotes([symbol]);
    const q = quotes[symbol];
    if (q && q.c > 0) priceAtAdd = q.c;
  } catch { /* non-fatal */ }

  const item = await prisma.watchlistItem.upsert({
    where: { userId_listIndex_symbol: { userId: session.sub, listIndex, symbol } },
    create: { userId: session.sub, symbol, listIndex, priceAtAdd: priceAtAdd ?? undefined },
    update: {}
  });
  return NextResponse.json(item, { status: 201 });
}
