import { getAlpacaClient, type AlpacaMode } from "./client";

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  status: string;
  extended_hours: boolean;
}

export interface CreateOrderParams {
  symbol: string;
  qty: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  time_in_force: "day" | "gtc";
  limit_price?: string;
}

export async function listOrders(
  params: { status?: string; limit?: number } = {},
  mode: AlpacaMode = "live"
): Promise<AlpacaOrder[]> {
  const client = getAlpacaClient(mode);
  const qs = new URLSearchParams({ status: params.status ?? "all", limit: String(params.limit ?? 50), direction: "desc" });
  const res = await client.trading(`/v2/orders?${qs}`);
  if (!res.ok) throw new Error(`Alpaca orders error: ${res.status}`);
  return res.json();
}

export async function getOrder(orderId: string, mode: AlpacaMode = "live"): Promise<AlpacaOrder> {
  const client = getAlpacaClient(mode);
  const res = await client.trading(`/v2/orders/${orderId}`);
  if (!res.ok) throw new Error(`Alpaca order error: ${res.status}`);
  return res.json();
}

export async function createOrder(params: CreateOrderParams, mode: AlpacaMode = "live"): Promise<AlpacaOrder> {
  const client = getAlpacaClient(mode);
  const res = await client.trading("/v2/orders", { method: "POST", body: JSON.stringify(params) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Order failed: ${res.status}`);
  }
  return res.json();
}

export async function cancelOrder(orderId: string, mode: AlpacaMode = "live"): Promise<void> {
  const client = getAlpacaClient(mode);
  const res = await client.trading(`/v2/orders/${orderId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`Cancel order error: ${res.status}`);
}
