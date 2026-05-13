import { NextResponse } from "next/server";

export const revalidate = 15;

async function fetchYield(symbol: string): Promise<number> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, next: { revalidate: 15 } }
  );
  if (!res.ok) throw new Error(`Yahoo ${symbol} ${res.status}`);
  const data = await res.json();
  return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 0;
}

export async function GET() {
  try {
    const [tenYear, thirtyYear] = await Promise.all([
      fetchYield("^TNX"),
      fetchYield("^TYX"),
    ]);
    return NextResponse.json({ tenYear, thirtyYear });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
