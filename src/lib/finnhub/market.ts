import { finnhub } from "./client";
import type { ChartBar, StockDetail, SearchResult, LivePrice, Mover } from "@/types/market";

export interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change
  dp: number;  // percent change
  h: number;   // high
  l: number;   // low
  o: number;   // open
  pc: number;  // previous close
  t: number;   // timestamp
}

export async function getQuote(symbol: string): Promise<FinnhubQuote> {
  const res = await finnhub(`/quote?symbol=${symbol}`);
  if (!res.ok) throw new Error(`Finnhub quote error ${res.status} for ${symbol}`);
  return res.json();
}

export async function getQuotes(symbols: string[]): Promise<Record<string, FinnhubQuote>> {
  const results = await Promise.allSettled(symbols.map((s) => getQuote(s).then((q) => [s, q] as const)));
  const out: Record<string, FinnhubQuote> = {};
  for (const r of results) {
    if (r.status === "fulfilled") out[r.value[0]] = r.value[1];
  }
  return out;
}

// Alpaca timeframe strings → Finnhub resolution
const RESOLUTION_MAP: Record<string, string> = {
  "1Min": "1", "5Min": "5", "15Min": "15", "30Min": "30",
  "1Hour": "60", "4Hour": "240", "1Day": "D", "1Week": "W", "1Month": "M"
};

export async function getCandles(
  symbol: string,
  timeframe: string,
  startDate: string,
  endDate: string
): Promise<ChartBar[]> {
  const resolution = RESOLUTION_MAP[timeframe] ?? "D";
  const from = Math.floor(new Date(startDate).getTime() / 1000);
  const to   = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  const res = await finnhub(`/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`);
  if (!res.ok) throw new Error(`Finnhub candles error ${res.status}`);
  const data = await res.json();

  if (data.s !== "ok" || !data.t?.length) return [];

  return (data.t as number[]).map((ts: number, i: number) => ({
    time:   new Date(ts * 1000).toISOString(),
    open:   data.o[i],
    high:   data.h[i],
    low:    data.l[i],
    close:  data.c[i],
    volume: data.v[i],
  }));
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const res = await finnhub(`/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.result ?? [])
    .filter((r: { type: string; symbol: string }) => r.type === "Common Stock" && !r.symbol.includes("."))
    .slice(0, 10)
    .map((r: { symbol: string; description: string; displaySymbol: string }) => ({
      symbol:   r.displaySymbol ?? r.symbol,
      name:     r.description,
      exchange: "US",
    }));
}

export function quoteToDetail(symbol: string, q: FinnhubQuote): StockDetail {
  return {
    symbol,
    price:         q.c,
    open:          q.o,
    high:          q.h,
    low:           q.l,
    prevClose:     q.pc,
    change:        q.d,
    changePercent: q.dp,
    volume:        0,
  };
}

export function quoteToLivePrice(symbol: string, q: FinnhubQuote): LivePrice {
  return { symbol, price: q.c, change: q.d, changePercent: q.dp, volume: 0 };
}

export function quotesToMovers(quotes: Record<string, FinnhubQuote>, top = 10): { gainers: Mover[]; losers: Mover[] } {
  const all = Object.entries(quotes).map(([sym, q]) => ({
    symbol: sym, price: q.c, change: q.d, changePercent: q.dp
  })).filter((m) => m.price > 0);

  const sorted = [...all].sort((a, b) => b.changePercent - a.changePercent);
  return {
    gainers: sorted.slice(0, top),
    losers:  sorted.slice(-top).reverse(),
  };
}
