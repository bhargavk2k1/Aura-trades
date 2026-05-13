import { NextResponse } from "next/server";
import { getIndexQuotes } from "@/lib/yahoo/indices";
import { INDEX_SYMBOLS, INDEX_LABELS } from "@/lib/constants";
import type { IndexData } from "@/types/market";

export const revalidate = 15;

export async function GET() {
  try {
    const quotes = await getIndexQuotes([...INDEX_SYMBOLS]);
    const result: IndexData[] = INDEX_SYMBOLS.map((sym) => {
      const q = quotes[sym];
      if (!q || !q.price) {
        return { symbol: sym, label: INDEX_LABELS[sym], price: 0, change: 0, changePercent: 0, volume: 0 };
      }
      return { symbol: sym, label: INDEX_LABELS[sym], price: q.price, change: q.change, changePercent: q.changePercent, volume: 0 };
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
