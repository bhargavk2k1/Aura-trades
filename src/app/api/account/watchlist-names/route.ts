import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_NAMES = Array.from({ length: 10 }, (_, i) => `Watchlist ${i + 1}`);

function parseNames(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 10) return parsed.map(String);
  } catch { /* ignore */ }
  return DEFAULT_NAMES;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.userPreferences.findUnique({ where: { userId: session.sub } });
  return NextResponse.json(parseNames(prefs?.watchlistNames ?? ""));
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body) || body.length !== 10) {
    return NextResponse.json({ error: "Expected array of 10 names" }, { status: 400 });
  }

  const names = body.map((n, i) => (typeof n === "string" && n.trim() ? n.trim().slice(0, 30) : `Watchlist ${i + 1}`));

  await prisma.userPreferences.upsert({
    where: { userId: session.sub },
    create: { userId: session.sub, watchlistNames: JSON.stringify(names) },
    update: { watchlistNames: JSON.stringify(names) },
  });

  return NextResponse.json(names);
}
