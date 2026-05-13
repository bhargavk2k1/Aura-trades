import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase();

  const listParam = new URL(req.url).searchParams.get("list");
  const listIndex = listParam !== null ? parseInt(listParam) : null;

  if (listIndex !== null && !isNaN(listIndex)) {
    await prisma.watchlistItem.deleteMany({ where: { userId: session.sub, symbol, listIndex } });
  } else {
    await prisma.watchlistItem.deleteMany({ where: { userId: session.sub, symbol } });
  }

  return NextResponse.json({ message: "Removed" });
}
