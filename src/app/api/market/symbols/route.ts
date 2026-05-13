import { NextResponse } from "next/server";
import { STATIC_SYMBOLS } from "@/lib/staticSymbols";

export type { StockSymbol } from "@/lib/staticSymbols";

export async function GET() {
  return NextResponse.json(STATIC_SYMBOLS);
}
