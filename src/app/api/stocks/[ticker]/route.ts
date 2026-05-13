import { NextResponse } from "next/server";
import { getQuote, quoteToDetail } from "@/lib/finnhub/market";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await params;
  const ticker = raw.toUpperCase();
  try {
    const q = await getQuote(ticker);
    if (!q || q.c === 0) {
      return NextResponse.json({ error: "Symbol not found or no data" }, { status: 404 });
    }
    return NextResponse.json(quoteToDetail(ticker, q));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
