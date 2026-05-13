import { getAlpacaClient, type AlpacaMode } from "./client";

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export async function getPositions(mode: AlpacaMode = "live"): Promise<AlpacaPosition[]> {
  const client = getAlpacaClient(mode);
  const res = await client.trading("/v2/positions");
  if (!res.ok) throw new Error(`Alpaca positions error: ${res.status}`);
  return res.json();
}

export async function getPosition(symbol: string, mode: AlpacaMode = "live"): Promise<AlpacaPosition | null> {
  const client = getAlpacaClient(mode);
  const res = await client.trading(`/v2/positions/${symbol}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Alpaca position error: ${res.status}`);
  return res.json();
}
