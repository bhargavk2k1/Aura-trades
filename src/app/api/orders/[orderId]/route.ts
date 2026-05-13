import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tradingService } from "@/lib/trading";

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  try {
    const order = await tradingService.getOrder(session.sub, orderId);
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  try {
    await tradingService.cancelOrder(session.sub, orderId);
    return NextResponse.json({ message: "Order cancelled" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
