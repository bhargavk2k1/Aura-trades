export type AlpacaMode = "paper" | "live";

interface AlpacaClient {
  trading: (path: string, options?: RequestInit) => Promise<Response>;
  data:    (path: string, options?: RequestInit) => Promise<Response>;
}

export function getAlpacaClient(mode: AlpacaMode = "live"): AlpacaClient {
  const key    = mode === "live" ? (process.env.ALPACA_LIVE_API_KEY ?? "") : (process.env.ALPACA_API_KEY ?? "");
  const secret = mode === "live" ? (process.env.ALPACA_LIVE_SECRET_KEY ?? "") : (process.env.ALPACA_SECRET_KEY ?? "");
  const tradingBase = mode === "live"
    ? (process.env.ALPACA_LIVE_BASE_URL ?? "https://api.alpaca.markets")
    : (process.env.ALPACA_PAPER_BASE_URL ?? "https://paper-api.alpaca.markets");
  const dataBase = process.env.ALPACA_DATA_BASE_URL ?? "https://data.alpaca.markets";

  const headers = {
    "APCA-API-KEY-ID":     key,
    "APCA-API-SECRET-KEY": secret,
    "Content-Type":        "application/json"
  };

  return {
    trading: (path, options = {}) =>
      fetch(`${tradingBase}${path}`, { ...options, headers: { ...headers, ...options.headers } }),
    data: (path, options = {}) =>
      fetch(`${dataBase}${path}`, { ...options, headers: { ...headers, ...options.headers } })
  };
}
