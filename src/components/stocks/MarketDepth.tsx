"use client";

import { useState, useEffect, useCallback } from "react";

interface Level {
  price: number;
  size: number;
  total: number;
}

function generateDepth(basePrice: number, seed: number): {
  bids: Level[];
  asks: Level[];
} {
  // Small pseudo-random offset based on seed for variation
  const rand = (i: number, offset: number) => {
    const x = Math.sin(seed * 9301 + i * 49297 + offset * 233) * 10000;
    return x - Math.floor(x);
  };

  const spread = basePrice * 0.0002; // ~0.02% spread
  const tickSize = basePrice < 10 ? 0.01 : basePrice < 100 ? 0.05 : basePrice < 500 ? 0.1 : 0.25;

  const asks: Level[] = [];
  let askRunning = 0;
  for (let i = 0; i < 5; i++) {
    const price = parseFloat((basePrice + spread / 2 + tickSize * (i + 1) + rand(i, 1) * tickSize * 0.5).toFixed(2));
    const size = Math.floor(50 + rand(i, 2) * 400 + (4 - i) * 30);
    askRunning += size;
    asks.push({ price, size, total: askRunning });
  }

  const bids: Level[] = [];
  let bidRunning = 0;
  for (let i = 0; i < 5; i++) {
    const price = parseFloat((basePrice - spread / 2 - tickSize * (i + 1) - rand(i, 3) * tickSize * 0.5).toFixed(2));
    const size = Math.floor(50 + rand(i, 4) * 400 + (4 - i) * 30);
    bidRunning += size;
    bids.push({ price, size, total: bidRunning });
  }

  return { asks: asks.reverse(), bids };
}

export function MarketDepth({
  ticker,
  currentPrice,
}: {
  ticker: string;
  currentPrice: number;
}) {
  const [seed, setSeed] = useState(() => Date.now());
  const [depth, setDepth] = useState(() => generateDepth(currentPrice, Date.now()));

  const refresh = useCallback(() => {
    const newSeed = Date.now();
    setSeed(newSeed);
    setDepth(generateDepth(currentPrice, newSeed));
  }, [currentPrice]);

  useEffect(() => {
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    setDepth(generateDepth(currentPrice, seed));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice]);

  const maxTotal = Math.max(
    depth.bids[depth.bids.length - 1]?.total ?? 1,
    depth.asks[0]?.total ?? 1
  );

  const spread = depth.bids[0]
    ? depth.asks[depth.asks.length - 1].price - depth.bids[0].price
    : 0;
  const spreadPct = currentPrice > 0 ? (spread / currentPrice) * 100 : 0;

  return (
    <div className="border border-gray-200 rounded bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Market Depth</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Simulated Level 2</span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-4 py-1.5 border-b border-gray-100 bg-gray-50">
        <span className="text-xs text-gray-500 font-medium">Price</span>
        <span className="text-xs text-gray-500 font-medium text-right">Size</span>
        <span className="text-xs text-gray-500 font-medium text-right">Total</span>
      </div>

      {/* Asks (sell orders) — displayed top to bottom, ascending price */}
      <div className="divide-y divide-gray-50">
        {depth.asks.map((level, i) => {
          const barPct = (level.total / maxTotal) * 100;
          return (
            <div key={i} className="relative px-4 py-1.5 overflow-hidden">
              {/* Depth bar */}
              <div
                className="absolute inset-y-0 right-0 bg-red-50 transition-all duration-700"
                style={{ width: `${barPct}%` }}
              />
              <div className="relative grid grid-cols-3">
                <span className="text-xs font-medium text-red-600 tabular-nums">
                  ${level.price.toFixed(2)}
                </span>
                <span className="text-xs text-gray-700 text-right tabular-nums">
                  {level.size.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 text-right tabular-nums">
                  {level.total.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Spread row */}
      <div className="px-4 py-2 border-y border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Spread</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-900 tabular-nums">
            ${spread.toFixed(2)}
          </span>
          <span className="text-xs text-gray-400 tabular-nums">
            ({spreadPct.toFixed(3)}%)
          </span>
        </div>
        <span className="text-xs font-bold text-gray-900 tabular-nums">
          ${currentPrice.toFixed(2)}
        </span>
      </div>

      {/* Bids (buy orders) — displayed top to bottom, descending price */}
      <div className="divide-y divide-gray-50">
        {depth.bids.map((level, i) => {
          const barPct = (level.total / maxTotal) * 100;
          return (
            <div key={i} className="relative px-4 py-1.5 overflow-hidden">
              {/* Depth bar */}
              <div
                className="absolute inset-y-0 right-0 bg-green-50 transition-all duration-700"
                style={{ width: `${barPct}%` }}
              />
              <div className="relative grid grid-cols-3">
                <span className="text-xs font-medium text-green-600 tabular-nums">
                  ${level.price.toFixed(2)}
                </span>
                <span className="text-xs text-gray-700 text-right tabular-nums">
                  {level.size.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 text-right tabular-nums">
                  {level.total.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400">
          {ticker} · Alpaca free tier does not include Level 2 · Simulated order book · Refreshes every 3s
        </p>
      </div>
    </div>
  );
}
