import Link from "next/link";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import type { LivePrice } from "@/types/market";

export function TrendingStrip({ prices }: { prices: LivePrice[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-3 pb-1" style={{ minWidth: "max-content" }}>
        {prices.map((p) => (
          <Link
            key={p.symbol}
            href={`/stocks/${p.symbol}`}
            className="flex items-center gap-2 bg-[#111827] border border-[#1f2937] rounded-xl px-4 py-2.5 hover:border-blue-500/50 transition shrink-0"
          >
            <span className="font-semibold text-white text-sm">{p.symbol}</span>
            <span className="text-gray-300 text-sm">{formatCurrency(p.price)}</span>
            <span className={`text-xs font-medium ${gainLossColor(p.changePercent)}`}>
              {formatPercent(p.changePercent)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
