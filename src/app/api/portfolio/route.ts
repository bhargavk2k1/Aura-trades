import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTradingService } from "@/lib/trading";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const positions = await getTradingService().getPositions(session.sub);
    return NextResponse.json(positions);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
