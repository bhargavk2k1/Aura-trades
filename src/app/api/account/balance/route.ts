import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getTradingService } from "@/lib/trading";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const balance = await getTradingService().getBalance(user.id);
    return NextResponse.json(balance);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
