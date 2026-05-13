import { NextResponse } from "next/server";
import { STATIC_SYMBOLS } from "@/lib/staticSymbols";

export const dynamic = "force-dynamic";

export type { StockSymbol } from "@/lib/staticSymbols";

export async function GET() {
  return NextResponse.json(STATIC_SYMBOLS);
}
