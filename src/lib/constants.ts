export const INDEX_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT"] as const;

export const INDEX_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ Composite",
  "^DJI":  "Dow Jones Industrial Average",
  "^RUT":  "Russell 2000",
};

export const POPULAR_TICKERS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN",
  "META", "TSLA", "AVGO", "JPM", "LLY",
  "V", "UNH", "XOM", "MA", "JNJ",
  "PG", "HD", "MRK", "COST", "ABBV"
];

export const CHART_TIMEFRAMES = [
  { label: "1D", timeframe: "5Min",  days: 1   },
  { label: "1W", timeframe: "1Hour", days: 7   },
  { label: "1M", timeframe: "1Day",  days: 30  },
  { label: "3M", timeframe: "1Day",  days: 90  },
  { label: "1Y", timeframe: "1Day",  days: 365 }
] as const;

export const COOKIE_NAME = "aura_session";
