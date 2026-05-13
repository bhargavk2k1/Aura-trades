"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import type { Mover } from "@/types/market";

interface Props {
  gainers: Mover[];
  losers: Mover[];
}

export function MoversList({ gainers, losers }: Props) {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const list = tab === "gainers" ? gainers : losers;

  return (
    <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Top Movers</h2>
        <div className="flex gap-1 bg-[#1f2937] rounded-lg p-1">
          {(["gainers", "losers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${tab === t ? (t === "gainers" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "text-gray-400 hover:text-white"}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        {list.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No data available</p>
        ) : (
          list.slice(0, 8).map((m) => (
            <Link
              key={m.symbol}
              href={`/stocks/${m.symbol}`}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#1f2937] transition"
            >
              <span className="font-semibold text-white text-sm w-16">{m.symbol}</span>
              <span className="text-gray-300 text-sm">{formatCurrency(m.price)}</span>
              <span className={`text-sm font-medium ${gainLossColor(m.changePercent)}`}>
                {formatPercent(m.changePercent)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
