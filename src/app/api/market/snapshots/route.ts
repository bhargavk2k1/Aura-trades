import { NextResponse } from "next/server";
import { getQuotes, quoteToLivePrice } from "@/lib/finnhub/market";

export const dynamic = "force-dynamic";

export const revalidate = 15;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("symbols") ?? "";
  const symbols = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (symbols.length === 0) return NextResponse.json([]);
  try {
    const quotes = await getQuotes(symbols);
    const result = symbols.map((sym) => {
      const q = quotes[sym];
      return q ? quoteToLivePrice(sym, q) : { symbol: sym, price: 0, change: 0, changePercent: 0, volume: 0 };
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
