import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/finnhub/market";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 1) return NextResponse.json([]);
  try {
    const results = await searchSymbols(q);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
