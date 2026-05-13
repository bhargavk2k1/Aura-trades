"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import type { Mover } from "@/types/market";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function LiveMovers({ initialGainers, initialLosers }: { initialGainers: Mover[]; initialLosers: Mover[] }) {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");

  const { data: gainers } = useSWR<Mover[]>("/api/market/movers?type=gainers", fetcher, {
    fallbackData: initialGainers,
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });
  const { data: losers } = useSWR<Mover[]>("/api/market/movers?type=losers", fetcher, {
    fallbackData: initialLosers,
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  const list = (tab === "gainers" ? gainers : losers) ?? [];

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Top Movers</h2>
        <div className="flex gap-1">
          {(["gainers", "losers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                tab === t
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No data — market may be closed</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {list.slice(0, 8).map((m) => (
            <Link
              key={m.symbol}
              href={`/stocks/${m.symbol}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition"
            >
              <span className="font-semibold text-gray-900 w-16">{m.symbol}</span>
              <span className="text-gray-600 tabular-nums text-sm">{formatCurrency(m.price)}</span>
              <span className={`font-medium tabular-nums text-sm ${gainLossColor(m.changePercent)}`}>
                {formatPercent(m.changePercent)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
