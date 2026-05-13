import { yahoo } from "./client";
import type { ChartBar, StockDetail, SearchResult, LivePrice, Mover } from "@/types/market";

export interface YahooQuote {
  symbol:                      string;
  shortName?:                  string;
  longName?:                   string;
  regularMarketPrice:          number;
  regularMarketChange:         number;
  regularMarketChangePercent:  number;
  regularMarketVolume?:        number;
  regularMarketOpen?:          number;
  regularMarketDayHigh?:       number;
  regularMarketDayLow?:        number;
  regularMarketPreviousClose?: number;
}

export async function getQuote(symbol: string): Promise<YahooQuote> {
  const res = await yahoo(`/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Yahoo Finance error ${res.status} for ${symbol}`);
  const data = await res.json();
  const result = data?.quoteResponse?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);
  return result as YahooQuote;
}

export async function getQuotes(symbols: string[]): Promise<Record<string, YahooQuote>> {
  if (symbols.length === 0) return {};
  const res = await yahoo(`/v7/finance/quote?symbols=${symbols.map(encodeURIComponent).join(",")}`);
  if (!res.ok) throw new Error(`Yahoo Finance batch error ${res.status}`);
  const data = await res.json();
  const results: YahooQuote[] = data?.quoteResponse?.result ?? [];
  const out: Record<string, YahooQuote> = {};
  for (const q of results) out[q.symbol] = q;
  return out;
}

export async function getCandles(
  symbol: string,
  timeframe: string,
  startDate: string,
  endDate: string
): Promise<ChartBar[]> {
  const intervalMap: Record<string, string> = {
    "1Min": "1m", "5Min": "5m", "15Min": "15m", "30Min": "30m",
    "1Hour": "1h", "4Hour": "4h", "1Day": "1d", "1Week": "1wk", "1Month": "1mo",
  };
  const interval = intervalMap[timeframe] ?? "1d";
  const from = Math.floor(new Date(startDate).getTime() / 1000);
  const to   = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  const res = await yahoo(
    `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&period1=${from}&period2=${to}`
  );
  if (!res.ok) throw new Error(`Yahoo Finance candles error ${res.status}`);
  const data = await res.json();
  const chart = data?.chart?.result?.[0];
  if (!chart?.timestamp?.length) return [];

  const { timestamp, indicators } = chart;
  const q = indicators.quote[0];
  return (timestamp as number[]).map((ts: number, i: number) => ({
    time:   new Date(ts * 1000).toISOString(),
    open:   q.open[i]   ?? 0,
    high:   q.high[i]   ?? 0,
    low:    q.low[i]    ?? 0,
    close:  q.close[i]  ?? 0,
    volume: q.volume[i] ?? 0,
  })).filter(b => b.close > 0);
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const res = await yahoo(`/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`);
  if (!res.ok) return [];
  const data = await res.json();
  return ((data?.quotes ?? []) as Array<{ symbol: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string }>)
    .filter(r => r.quoteType === "EQUITY" && !r.symbol.includes("."))
    .slice(0, 10)
    .map(r => ({
      symbol:   r.symbol,
      name:     r.longname ?? r.shortname ?? r.symbol,
      exchange: r.exchange ?? "US",
    }));
}

export function quoteToDetail(symbol: string, q: YahooQuote): StockDetail {
  return {
    symbol,
    price:         q.regularMarketPrice,
    open:          q.regularMarketOpen          ?? 0,
    high:          q.regularMarketDayHigh       ?? 0,
    low:           q.regularMarketDayLow        ?? 0,
    prevClose:     q.regularMarketPreviousClose ?? 0,
    change:        q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    volume:        q.regularMarketVolume        ?? 0,
  };
}

export function quoteToLivePrice(symbol: string, q: YahooQuote): LivePrice {
  return {
    symbol,
    price:         q.regularMarketPrice,
    change:        q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    volume:        q.regularMarketVolume ?? 0,
  };
}

export function quotesToMovers(quotes: Record<string, YahooQuote>, top = 10): { gainers: Mover[]; losers: Mover[] } {
  const all = Object.values(quotes).map(q => ({
    symbol:        q.symbol,
    price:         q.regularMarketPrice,
    change:        q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
  })).filter(m => m.price > 0);

  const sorted = [...all].sort((a, b) => b.changePercent - a.changePercent);
  return {
    gainers: sorted.slice(0, top),
    losers:  sorted.slice(-top).reverse(),
  };
}
