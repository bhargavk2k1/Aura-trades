import { getAlpacaClient, type AlpacaMode } from "./client";

export interface AlpacaAccount {
  id: string;
  equity: string;
  cash: string;
  buying_power: string;
  portfolio_value: string;
  last_equity: string;
  daytrade_count: number;
  status: string;
}

export async function getAccount(mode: AlpacaMode = "live"): Promise<AlpacaAccount> {
  const client = getAlpacaClient(mode);
  const res = await client.trading("/v2/account");
  if (!res.ok) throw new Error(`Alpaca account error: ${res.status}`);
  return res.json();
}
