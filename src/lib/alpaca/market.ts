import { getAlpacaClient } from "./client";

export interface AlpacaSnapshot {
  latestTrade: { p: number; s: number; t: string };
  latestQuote: { ap: number; bp: number };
  minuteBar: { o: number; h: number; l: number; c: number; v: number };
  dailyBar: { o: number; h: number; l: number; c: number; v: number };
  prevDailyBar: { o: number; h: number; l: number; c: number; v: number };
}

export interface BarData {
  t: string; // ISO timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface AlpacaAsset {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  tradable: boolean;
  fractionable: boolean;
}

export interface AlpacaMover {
  symbol: string;
  percent_change: number;
  change: number;
  price: number;
}

export async function getSnapshots(
  symbols: string[]
): Promise<Record<string, AlpacaSnapshot>> {
  if (symbols.length === 0) return {};
  const client = getAlpacaClient("paper");
  const qs = new URLSearchParams({ symbols: symbols.join(",") });
  const res = await client.data(`/v2/stocks/snapshots?${qs}`);
  if (!res.ok) throw new Error(`Alpaca snapshots error: ${res.status}`);
  const data = await res.json();
  return data;
}

export async function getSnapshot(symbol: string): Promise<AlpacaSnapshot> {
  const client = getAlpacaClient("paper");
  const res = await client.data(`/v2/stocks/${symbol}/snapshot`);
  if (!res.ok) throw new Error(`Alpaca snapshot error: ${res.status}`);
  const data = await res.json();
  return data;
}

export async function getBars(
  symbol: string,
  timeframe: string,
  start: string,
  end: string
): Promise<BarData[]> {
  const client = getAlpacaClient("paper");
  const qs = new URLSearchParams({ timeframe, start, end, limit: "1000", adjustment: "raw" });
  const res = await client.data(`/v2/stocks/${symbol}/bars?${qs}`);
  if (!res.ok) throw new Error(`Alpaca bars error: ${res.status}`);
  const data = await res.json();
  return data.bars ?? [];
}

export async function searchAssets(query: string): Promise<AlpacaAsset[]> {
  const client = getAlpacaClient("paper");
  const qs = new URLSearchParams({ status: "active", asset_class: "us_equity" });
  const res = await client.trading(`/v2/assets?${qs}`);
  if (!res.ok) throw new Error(`Alpaca assets error: ${res.status}`);
  const assets: AlpacaAsset[] = await res.json();
  const q = query.toLowerCase();
  return assets
    .filter(
      (a) =>
        a.tradable &&
        (a.symbol.toLowerCase().startsWith(q) || a.name.toLowerCase().includes(q))
    )
    .slice(0, 10);
}

export async function getMovers(
  top: "gainers" | "losers"
): Promise<AlpacaMover[]> {
  const client = getAlpacaClient("paper");
  const res = await client.data(
    `/v1beta1/screener/stocks/movers?top=${top === "gainers" ? "gainers" : "losers"}&by=percent_change&top_n=10`
  );
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data[top] ?? data.movers ?? [];
}
