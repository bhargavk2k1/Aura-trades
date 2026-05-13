export interface YahooIndexQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

async function fetchOne(symbol: string): Promise<YahooIndexQuote> {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
    next: { revalidate: 15 },
  });
  if (!res.ok) throw new Error(`Yahoo ${symbol} ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Yahoo ${symbol}: no meta`);
  const price = meta.regularMarketPrice ?? 0;
  const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prev;
  const changePercent = prev > 0 ? (change / prev) * 100 : 0;
  return { symbol, price, change, changePercent };
}

export async function getIndexQuotes(symbols: string[]): Promise<Record<string, YahooIndexQuote>> {
  const results = await Promise.allSettled(symbols.map(fetchOne));
  const out: Record<string, YahooIndexQuote> = {};
  for (let i = 0; i < symbols.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") out[symbols[i]] = r.value;
  }
  return out;
}
