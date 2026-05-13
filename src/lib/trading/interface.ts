import type { TradingOrder, TradingPosition, TradingBalance, CreateOrderParams } from "./types";

export interface ITradingService {
  /** Current account balance, reserved cash, available cash, recent transactions */
  getBalance(userId: string): Promise<TradingBalance>;

  /** List orders — status: "open" | "closed" | "all" */
  listOrders(userId: string, params?: { status?: string; limit?: number }): Promise<TradingOrder[]>;

  /** Single order by ID */
  getOrder(userId: string, orderId: string): Promise<TradingOrder>;

  /** Place a new order. Throws on insufficient funds or KYC failure. */
  createOrder(userId: string, params: CreateOrderParams): Promise<TradingOrder>;

  /** Cancel an open order */
  cancelOrder(userId: string, orderId: string): Promise<void>;

  /** Open positions */
  getPositions(userId: string): Promise<TradingPosition[]>;
}
