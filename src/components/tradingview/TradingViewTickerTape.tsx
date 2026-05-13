"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const INDICES = [
  { symbol: "SPY", label: "S&P 500",        multiplier: 10.03  },
  { symbol: "QQQ", label: "NASDAQ",          multiplier: 36.84  },
  { symbol: "DIA", label: "Dow Jones",       multiplier: 100.0  },
  { symbol: "IWM", label: "Russell 2000",    multiplier: 10.06  },
  { symbol: "VTI", label: "Wilshire 5000",   multiplier: 115.65 },
  { symbol: "GLD", label: "Gold",            multiplier: 10.87  },
  { symbol: "USO", label: "WTI Oil",          multiplier: 0.71   },
  { symbol: "BNO", label: "Brent Crude",      multiplier: 1.898  },
];

interface IndexPrice { symbol: string; price: number; change: number; changePercent: number }
interface Yields { tenYear: number; thirtyYear: number }

export function TradingViewTickerTape() {
  const syms = INDICES.map(i => i.symbol).join(",");
  const { data } = useSWR<IndexPrice[]>(
    `/api/market/snapshots?symbols=${syms}`,
    fetcher,
    { refreshInterval: 15000 }
  );
  const { data: yields } = useSWR<Yields>(
    "/api/market/yields",
    fetcher,
    { refreshInterval: 60000 }
  );

  const priceItems = INDICES.map(idx => {
    const d = data?.find(p => p.symbol === idx.symbol);
    return { kind: "price" as const, label: idx.label, price: (d?.price ?? 0) * idx.multiplier, change: d?.changePercent ?? 0 };
  });

  const yieldItems = [
    { kind: "yield" as const, label: "US 10Y Yield", value: yields?.tenYear  ?? 0 },
    { kind: "yield" as const, label: "US 30Y Yield", value: yields?.thirtyYear ?? 0 },
  ];

  const items = [...priceItems, ...yieldItems];
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden bg-white select-none" style={{ height: 36 }}>
      <div className="absolute inset-0 z-10 cursor-default" onClick={e => e.preventDefault()} />

      <div
        className="flex items-center gap-0 absolute whitespace-nowrap"
        style={{
          animation: "ticker-scroll 40s linear infinite",
          top: 0, left: 0, height: "100%",
        }}
      >
        {doubled.map((item, i) => {
          if (item.kind === "yield") {
            return (
              <span key={i} className="inline-flex items-center gap-2 px-5 border-r border-gray-100 h-full text-xs">
                <span className="font-semibold text-gray-700">{item.label}</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  {item.value > 0 ? item.value.toFixed(2) + "%" : "—"}
                </span>
              </span>
            );
          }
          const up = item.change >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-2 px-5 border-r border-gray-100 h-full text-xs">
              <span className="font-semibold text-gray-700">{item.label}</span>
              <span className="font-bold text-gray-900 tabular-nums">
                {item.price > 0 ? `$${item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </span>
              <span className={`font-semibold tabular-nums ${up ? "text-green-600" : "text-red-600"}`}>
                {item.change > 0 ? "▲" : item.change < 0 ? "▼" : ""}{" "}
                {item.price > 0 ? (up ? "+" : "") + item.change.toFixed(2) + "%" : ""}
              </span>
            </span>
          );
        })}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
