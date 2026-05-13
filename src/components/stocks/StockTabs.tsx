"use client";

import { useState } from "react";
import { TradingViewChart } from "./TradingViewChart";
import { OptionsChain } from "./OptionsChain";
import { MarketDepth } from "./MarketDepth";

type Tab = "chart" | "options" | "depth";

interface Props {
  ticker: string;
  mic?: string;
  currentPrice: number;
}

export function StockTabs({ ticker, mic, currentPrice }: Props) {
  const [tab, setTab] = useState<Tab>("chart");

  const tabs: { key: Tab; label: string }[] = [
    { key: "chart",   label: "Chart" },
    { key: "options", label: "Options Chain" },
    { key: "depth",   label: "Market Depth" },
  ];

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded overflow-hidden bg-white">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 ${
              tab === t.key
                ? "border-gray-900 text-gray-900 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content — chart fills remaining height, others scroll */}
      <div className={`flex-1 ${tab === "chart" ? "" : "overflow-auto"}`}>
        {tab === "chart" && (
          <div className="h-full min-h-[620px]">
            <TradingViewChart symbol={ticker} mic={mic} />
          </div>
        )}
        {tab === "options" && (
          <OptionsChain ticker={ticker} currentPrice={currentPrice} />
        )}
        {tab === "depth" && (
          <MarketDepth ticker={ticker} currentPrice={currentPrice} />
        )}
      </div>
    </div>
  );
}
