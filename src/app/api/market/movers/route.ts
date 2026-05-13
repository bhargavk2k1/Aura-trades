import { NextResponse } from "next/server";
import { getQuotes, quotesToMovers } from "@/lib/finnhub/market";
import { POPULAR_TICKERS } from "@/lib/constants";

export const revalidate = 15;

// Extend the mover pool for more varied results
const MOVER_POOL = [
  ...POPULAR_TICKERS,
  "AMD","INTC","NFLX","PYPL","SQ","SHOP","UBER","LYFT","SNAP","PINS",
  "ROKU","TWLO","ZM","DOCU","CRWD","DDOG","NET","SNOW","PLTR","COIN",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") === "losers" ? "losers" : "gainers";
  try {
    const quotes = await getQuotes(MOVER_POOL);
    const { gainers, losers } = quotesToMovers(quotes, 10);
    return NextResponse.json(type === "gainers" ? gainers : losers);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
