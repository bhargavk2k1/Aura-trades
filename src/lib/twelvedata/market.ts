import { twelvedata } from "./client";
import type { ChartBar, StockDetail, SearchResult, LivePrice, Mover } from "@/types/market";

export interface TDQuote {
  symbol:          string;
  name:            string;
  close:           string;
  open:            string;
  high:            string;
  low:             string;
  previous_close:  string;
  change:          string;
  percent_change:  string;
  volume:          string;
  is_market_open:  boolean;
}

export async function getQuote(symbol: string): Promise<TDQuote> {
  const res = await twelvedata(`/quote?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Twelve Data quote error ${res.status} for ${symbol}`);
  const data = await res.json();
  if (data.code) throw new Error(`Twelve Data: ${data.message}`);
  return data as TDQuote;
}

export async function getQuotes(symbols: string[]): Promise<Record<string, TDQuote>> {
  if (symbols.length === 0) return {};
  // Twelve Data supports batch quotes with comma-separated symbols
  const res = await twelvedata(`/quote?symbol=${symbols.map(encodeURIComponent).join(",")}`);
  if (!res.ok) throw new Error(`Twelve Data batch quote error ${res.status}`);
  const data = await res.json();

  const out: Record<string, TDQuote> = {};
  if (symbols.length === 1) {
    // Single symbol returns object directly
    if (!data.code) out[symbols[0]] = data as TDQuote;
  } else {
    // Multiple symbols returns { SYMBOL: quote, ... }
    for (const sym of symbols) {
      const q = data[sym];
      if (q && !q.code) out[sym] = q as TDQuote;
    }
  }
  return out;
}

export async function getCandles(
  symbol: string,
  timeframe: string,
  startDate: string,
  endDate: string
): Promise<ChartBar[]> {
  // Map Alpaca timeframes to Twelve Data intervals
  const intervalMap: Record<string, string> = {
    "1Min": "1min", "5Min": "5min", "15Min": "15min", "30Min": "30min",
    "1Hour": "1h", "4Hour": "4h", "1Day": "1day", "1Week": "1week", "1Month": "1month",
  };
  const interval = intervalMap[timeframe] ?? "1day";

  const res = await twelvedata(
    `/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&start_date=${startDate}&end_date=${endDate}&order=ASC&outputsize=5000`
  );
  if (!res.ok) throw new Error(`Twelve Data candles error ${res.status}`);
  const data = await res.json();
  if (!data.values?.length) return [];

  return (data.values as Array<{ datetime: string; open: string; high: string; low: string; close: string; volume: string }>).map(v => ({
    time:   v.datetime,
    open:   parseFloat(v.open),
    high:   parseFloat(v.high),
    low:    parseFloat(v.low),
    close:  parseFloat(v.close),
    volume: parseFloat(v.volume),
  }));
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const res = await twelvedata(`/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=10`);
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.data ?? []) as Array<{ symbol: string; instrument_name: string; exchange: string; instrument_type: string }>)
    .filter(r => r.instrument_type === "Common Stock" && !r.symbol.includes("/"))
    .slice(0, 10)
    .map(r => ({
      symbol:   r.symbol,
      name:     r.instrument_name,
      exchange: r.exchange,
    }));
}

export function quoteToDetail(symbol: string, q: TDQuote): StockDetail {
  return {
    symbol,
    price:         parseFloat(q.close),
    open:          parseFloat(q.open),
    high:          parseFloat(q.high),
    low:           parseFloat(q.low),
    prevClose:     parseFloat(q.previous_close),
    change:        parseFloat(q.change),
    changePercent: parseFloat(q.percent_change),
    volume:        parseFloat(q.volume ?? "0"),
  };
}

export function quoteToLivePrice(symbol: string, q: TDQuote): LivePrice {
  return {
    symbol,
    price:         parseFloat(q.close),
    change:        parseFloat(q.change),
    changePercent: parseFloat(q.percent_change),
    volume:        parseFloat(q.volume ?? "0"),
  };
}

export function quotesToMovers(quotes: Record<string, TDQuote>, top = 10): { gainers: Mover[]; losers: Mover[] } {
  const all = Object.entries(quotes).map(([sym, q]) => ({
    symbol:        sym,
    price:         parseFloat(q.close),
    change:        parseFloat(q.change),
    changePercent: parseFloat(q.percent_change),
  })).filter(m => m.price > 0);

  const sorted = [...all].sort((a, b) => b.changePercent - a.changePercent);
  return {
    gainers: sorted.slice(0, top),
    losers:  sorted.slice(-top).reverse(),
  };
}
