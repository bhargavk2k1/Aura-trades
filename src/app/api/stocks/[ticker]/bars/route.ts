import { NextResponse } from "next/server";
import { getDaysAgo } from "@/lib/utils";
import type { ChartBar } from "@/types/market";

// Map our timeframe strings to Yahoo Finance intervals
const TF_MAP: Record<string, string> = {
  "5Min":  "5m",
  "1Hour": "60m",
  "1Day":  "1d",
};

export async function GET(req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await params;
  const ticker = raw.toUpperCase();
  const { searchParams } = new URL(req.url);
  const timeframe = searchParams.get("timeframe") ?? "1Day";
  const start = searchParams.get("start") ?? getDaysAgo(30);
  const end   = searchParams.get("end")   ?? new Date().toISOString().slice(0, 10);

  const interval = TF_MAP[timeframe] ?? "1d";
  const period1  = Math.floor(new Date(start).getTime() / 1000);
  const period2  = Math.floor(new Date(end).getTime() / 1000) + 86400;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}` +
    `?period1=${period1}&period2=${period2}&interval=${interval}&includePrePost=false`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`);

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("No chart data returned");

    const timestamps: number[]    = result.timestamp ?? [];
    const quote                   = result.indicators?.quote?.[0] ?? {};
    const opens:   (number|null)[] = quote.open   ?? [];
    const highs:   (number|null)[] = quote.high   ?? [];
    const lows:    (number|null)[] = quote.low    ?? [];
    const closes:  (number|null)[] = quote.close  ?? [];
    const volumes: (number|null)[] = quote.volume ?? [];

    const bars: ChartBar[] = timestamps
      .map((ts, i) => ({
        time:   new Date(ts * 1000).toISOString(),
        open:   opens[i]   ?? 0,
        high:   highs[i]   ?? 0,
        low:    lows[i]    ?? 0,
        close:  closes[i]  ?? 0,
        volume: volumes[i] ?? 0,
      }))
      .filter((b) => b.close > 0);

    return NextResponse.json(bars);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
