// Normalised shapes shared between demo and live implementations

export interface TradingOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: string;
  filledQty: string;
  type: string;
  status: string;
  timeInForce: string;
  limitPrice: string | null;
  filledAvgPrice: string | null;
  submittedAt: string;
  filledAt: string | null;
}

export interface TradingPosition {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  changeToday: number;
}

export interface TradingBalance {
  balance: number;
  reserved: number;
  available: number;
  transactions: TradingTransaction[];
}

export interface TradingTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  status: string;
  reference: string;
  createdAt: string;
}

export interface CreateOrderParams {
  symbol: string;
  qty: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  time_in_force: "day" | "gtc";
  limit_price?: string;
}
