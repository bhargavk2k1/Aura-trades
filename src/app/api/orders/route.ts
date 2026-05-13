import { NextResponse } from "next/server";
import { z } from "zod";
import { tradingService } from "@/lib/trading";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "all";

  try {
    const orders = await tradingService.listOrders(session.sub, { status, limit: 50 });
    return NextResponse.json(orders);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

const orderSchema = z.object({
  symbol:        z.string().min(1).max(10),
  qty:           z.string().regex(/^\d+(\.\d+)?$/),
  side:          z.enum(["buy", "sell"]),
  type:          z.enum(["market", "limit"]),
  time_in_force: z.enum(["day", "gtc"]).default("day"),
  limit_price:   z.string().optional()
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid order parameters" }, { status: 400 });

  try {
    const order = await tradingService.createOrder(session.sub, parsed.data);
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    const msg = String(err);
    const status = msg.includes("KYC") ? 403 : msg.includes("Insufficient") ? 422 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
