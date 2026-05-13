/**
 * DemoTradingService — backed by the local Prisma DB for balances/transactions
 * and Alpaca paper trading for order execution and positions.
 */
import { prisma } from "@/lib/prisma";
import { listOrders, getOrder, createOrder, cancelOrder } from "@/lib/alpaca/orders";
import { getPositions } from "@/lib/alpaca/positions";
import type { ITradingService } from "./interface";
import type { TradingOrder, TradingPosition, TradingBalance, CreateOrderParams } from "./types";

function mapOrder(o: Awaited<ReturnType<typeof getOrder>>): TradingOrder {
  return {
    id:             o.id,
    symbol:         o.symbol,
    side:           o.side as "buy" | "sell",
    qty:            o.qty,
    filledQty:      o.filled_qty,
    type:           o.type,
    status:         o.status,
    timeInForce:    o.time_in_force,
    limitPrice:     o.limit_price,
    filledAvgPrice: o.filled_avg_price,
    submittedAt:    o.submitted_at,
    filledAt:       o.filled_at,
  };
}

export class DemoTradingService implements ITradingService {
  async getBalance(userId: string): Promise<TradingBalance> {
    const account = await prisma.userAccount.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    return {
      balance:      account?.cashBalance   ?? 0,
      reserved:     account?.reservedCash  ?? 0,
      available:    (account?.cashBalance ?? 0) - (account?.reservedCash ?? 0),
      transactions: (account?.transactions ?? []).map(t => ({
        id:           t.id,
        type:         t.type,
        amount:       t.amount,
        balanceAfter: t.balanceAfter,
        status:       t.status,
        reference:    t.reference,
        createdAt:    t.createdAt.toISOString(),
      })),
    };
  }

  async listOrders(_userId: string, params: { status?: string; limit?: number } = {}): Promise<TradingOrder[]> {
    const orders = await listOrders(params, "paper");
    return orders.map(mapOrder);
  }

  async getOrder(_userId: string, orderId: string): Promise<TradingOrder> {
    return mapOrder(await getOrder(orderId, "paper"));
  }

  async createOrder(userId: string, params: CreateOrderParams): Promise<TradingOrder> {
    // KYC gate
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } });
    if (user?.kycStatus !== "approved") throw new Error("KYC verification required before trading.");

    // Funds gate (buy orders only)
    if (params.side === "buy") {
      const account = await prisma.userAccount.findUnique({ where: { userId } });
      if (!account) throw new Error("Account not found.");
      if (account.cashBalance - account.reservedCash <= 0) throw new Error("Insufficient funds.");
    }

    return mapOrder(await createOrder(params, "paper"));
  }

  async cancelOrder(_userId: string, orderId: string): Promise<void> {
    await cancelOrder(orderId, "paper");
  }

  async getPositions(_userId: string): Promise<TradingPosition[]> {
    const positions = await getPositions("paper");
    return positions.map(p => ({
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
