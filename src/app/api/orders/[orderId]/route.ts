import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTradingService } from "@/lib/trading";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  try {
    const order = await getTradingService().getOrder(session.sub, orderId);
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
    await getTradingService().cancelOrder(session.sub, orderId);
    return NextResponse.json({ message: "Order cancelled" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
