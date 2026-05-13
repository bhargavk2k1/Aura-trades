"use client";

import useSWR from "swr";
import Link from "next/link";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import { POPULAR_TICKERS } from "@/lib/constants";
import type { LivePrice } from "@/types/market";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const SYMBOLS = POPULAR_TICKERS.slice(0, 12).join(",");

export function LiveTrending({ initial }: { initial: LivePrice[] }) {
  const { data } = useSWR<LivePrice[]>(
    `/api/market/snapshots?symbols=${SYMBOLS}`,
    fetcher,
    { fallbackData: initial, refreshInterval: 15000, revalidateOnFocus: true }
  );

  const prices = data ?? initial;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
        {prices.map((p) => (
          <Link
            key={p.symbol}
            href={`/stocks/${p.symbol}`}
            className="flex items-center gap-3 border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 transition shrink-0"
          >
            <span className="font-semibold text-gray-900 text-sm">{p.symbol}</span>
            <span className="text-gray-600 text-sm tabular-nums">{formatCurrency(p.price)}</span>
            <span className={`text-xs font-medium tabular-nums ${gainLossColor(p.changePercent)}`}>
              {formatPercent(p.changePercent)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
