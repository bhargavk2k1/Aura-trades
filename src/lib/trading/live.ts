/**
 * LiveTradingService — backed by Alpaca Broker API.
 * Accounts, balances, and orders all live in Alpaca; Prisma is only used for
 * KYC status and user identity.
 *
 * TODO: Replace the stub methods below with real Alpaca Broker API calls once
 * you have approved Broker API credentials (ALPACA_BROKER_KEY / ALPACA_BROKER_SECRET).
 * Broker API docs: https://docs.alpaca.markets/reference/broker-api-overview
 */
import { prisma } from "@/lib/prisma";
import type { ITradingService } from "./interface";
import type { TradingOrder, TradingPosition, TradingBalance, CreateOrderParams } from "./types";

const BROKER_BASE = "https://broker-api.alpaca.markets";
const BROKER_KEY    = process.env.ALPACA_BROKER_KEY    ?? "";
const BROKER_SECRET = process.env.ALPACA_BROKER_SECRET ?? "";

function brokerHeaders() {
  const creds = Buffer.from(`${BROKER_KEY}:${BROKER_SECRET}`).toString("base64");
  return { Authorization: `Basic ${creds}`, "Content-Type": "application/json" };
}

async function brokerFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BROKER_BASE}${path}`, {
    ...init,
    headers: { ...brokerHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Broker API error ${res.status}`);
  }
  return res;
}

export class LiveTradingService implements ITradingService {
  /**
   * Each Aura user maps to an Alpaca Broker account.
   * Store the Alpaca account ID in UserPreferences or a new field.
   * For now this throws until the mapping is implemented.
   */
  private async getAlpacaAccountId(userId: string): Promise<string> {
    const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
    const id = (prefs as unknown as { alpacaAccountId?: string })?.alpacaAccountId;
    if (!id) throw new Error("No Alpaca brokerage account linked. Complete account setup first.");
    return id;
  }

  async getBalance(userId: string): Promise<TradingBalance> {
    const accountId = await this.getAlpacaAccountId(userId);
    const res  = await brokerFetch(`/v1/accounts/${accountId}`);
    const data = await res.json();
    return {
      balance:      parseFloat(data.equity      ?? "0"),
      reserved:     parseFloat(data.long_market_value ?? "0"),
      available:    parseFloat(data.buying_power ?? "0"),
      transactions: [], // TODO: fetch from Alpaca ACH/transfer history
    };
  }

  async listOrders(userId: string, params: { status?: string; limit?: number } = {}): Promise<TradingOrder[]> {
    const accountId = await this.getAlpacaAccountId(userId);
    const qs = new URLSearchParams({ status: params.status ?? "all", limit: String(params.limit ?? 50), direction: "desc" });
    const res  = await brokerFetch(`/v1/trading/accounts/${accountId}/orders?${qs}`);
    const data: Record<string, string>[] = await res.json();
    return data.map(o => ({
      id:             o.id,
      symbol:         o.symbol,
      side:           o.side as "buy" | "sell",
      qty:            o.qty,
      filledQty:      o.filled_qty,
      type:           o.type,
      status:         o.status,
      timeInForce:    o.time_in_force,
      limitPrice:     o.limit_price ?? null,
      filledAvgPrice: o.filled_avg_price ?? null,
      submittedAt:    o.submitted_at,
      filledAt:       o.filled_at ?? null,
    }));
  }

  async getOrder(userId: string, orderId: string): Promise<TradingOrder> {
    const accountId = await this.getAlpacaAccountId(userId);
    const res  = await brokerFetch(`/v1/trading/accounts/${accountId}/orders/${orderId}`);
    const o: Record<string, string> = await res.json();
    return {
      id: o.id, symbol: o.symbol, side: o.side as "buy"|"sell",
      qty: o.qty, filledQty: o.filled_qty, type: o.type, status: o.status,
      timeInForce: o.time_in_force, limitPrice: o.limit_price ?? null,
      filledAvgPrice: o.filled_avg_price ?? null, submittedAt: o.submitted_at, filledAt: o.filled_at ?? null,
    };
  }

  async createOrder(userId: string, params: CreateOrderParams): Promise<TradingOrder> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } });
    if (user?.kycStatus !== "approved") throw new Error("KYC verification required before trading.");

    const accountId = await this.getAlpacaAccountId(userId);
    const body = { symbol: params.symbol, qty: params.qty, side: params.side, type: params.type, time_in_force: params.time_in_force, ...(params.limit_price ? { limit_price: params.limit_price } : {}) };
    const res = await brokerFetch(`/v1/trading/accounts/${accountId}/orders`, { method: "POST", body: JSON.stringify(body) });
    const o: Record<string, string> = await res.json();
    return {
      id: o.id, symbol: o.symbol, side: o.side as "buy"|"sell",
      qty: o.qty, filledQty: o.filled_qty, type: o.type, status: o.status,
      timeInForce: o.time_in_force, limitPrice: o.limit_price ?? null,
      filledAvgPrice: o.filled_avg_price ?? null, submittedAt: o.submitted_at, filledAt: o.filled_at ?? null,
    };
  }

  async cancelOrder(userId: string, orderId: string): Promise<void> {
    const accountId = await this.getAlpacaAccountId(userId);
    await brokerFetch(`/v1/trading/accounts/${accountId}/orders/${orderId}`, { method: "DELETE" });
  }

  async getPositions(userId: string): Promise<TradingPosition[]> {
    const accountId = await this.getAlpacaAccountId(userId);
    const res  = await brokerFetch(`/v1/trading/accounts/${accountId}/positions`);
    const data: Record<string, string>[] = await res.json();
    return data.map(p => ({
      symbol:          p.symbol,
      qty:             parseFloat(p.qty),
      avgEntryPrice:   parseFloat(p.avg_entry_price),
      currentPrice:    parseFloat(p.current_price),
      marketValue:     parseFloat(p.market_value),
      costBasis:       parseFloat(p.cost_basis),
      unrealizedPl:    parseFloat(p.unrealized_pl),
      unrealizedPlPct: parseFloat(p.unrealized_plpc) * 100,
      changeToday:     parseFloat(p.change_today),
    }));
  }
}
