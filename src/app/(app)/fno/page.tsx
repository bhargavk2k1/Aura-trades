"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const POPULAR_SYMBOLS = [
  { ticker: "AAPL",  name: "Apple Inc."           },
  { ticker: "TSLA",  name: "Tesla Inc."            },
  { ticker: "NVDA",  name: "NVIDIA Corp."          },
  { ticker: "MSFT",  name: "Microsoft Corp."       },
  { ticker: "AMZN",  name: "Amazon.com Inc."       },
  { ticker: "GOOGL", name: "Alphabet Inc."         },
  { ticker: "META",  name: "Meta Platforms Inc."   },
  { ticker: "SPY",   name: "SPDR S&P 500 ETF"     },
  { ticker: "QQQ",   name: "Invesco QQQ Trust"     },
  { ticker: "NFLX",  name: "Netflix Inc."          },
  { ticker: "AMD",   name: "Advanced Micro Devices"},
  { ticker: "INTC",  name: "Intel Corp."           },
];

const GLOSSARY = [
  {
    term: "Call Option",
    definition:
      "Gives the buyer the right (not obligation) to buy 100 shares at the strike price before expiration. Profitable when the stock rises above the strike + premium paid.",
  },
  {
    term: "Put Option",
    definition:
      "Gives the buyer the right (not obligation) to sell 100 shares at the strike price before expiration. Profitable when the stock falls below the strike - premium paid.",
  },
  {
    term: "Strike Price",
    definition:
      "The fixed price at which the option holder can buy (call) or sell (put) the underlying shares. Chosen at the time of purchase.",
  },
  {
    term: "Expiry Date",
    definition:
      "The date on which the option contract expires. US equity options typically expire on the third Friday of the expiration month.",
  },
  {
    term: "Open Interest (OI)",
    definition:
      "The total number of outstanding option contracts that have not been settled. High OI indicates greater liquidity and trader interest.",
  },
  {
    term: "Implied Volatility (IV)",
    definition:
      "A forward-looking measure of how much the market expects the underlying stock to move. Higher IV means more expensive options (higher premium).",
  },
];

export default function FnOPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const sym = search.trim().toUpperCase();
    if (sym) router.push(`/fno/${sym}`);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">F&amp;O — Futures &amp; Options</h1>
        <p className="text-sm text-gray-500 mt-1">
          View options chains for US-listed stocks and ETFs
        </p>
      </div>

      {/* Search bar */}
      <div className="max-w-md">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter ticker symbol (e.g. AAPL)"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition"
          >
            View Chain
          </button>
        </form>
      </div>

      {/* Popular symbols */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Popular Symbols</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {POPULAR_SYMBOLS.map(({ ticker, name }) => (
            <Link
              key={ticker}
              href={`/fno/${ticker}`}
              className="border border-gray-200 rounded p-3 hover:border-gray-400 transition flex flex-col gap-1 group"
            >
              <span className="font-bold text-gray-900 text-sm group-hover:text-gray-700">
                {ticker}
              </span>
              <span className="text-xs text-gray-500 leading-tight truncate">{name}</span>
              <span className="text-xs text-gray-400 mt-1">Options →</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Glossary */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Options Terminology</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GLOSSARY.map(({ term, definition }) => (
            <div key={term} className="border border-gray-200 rounded p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">{term}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{definition}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="border border-gray-200 rounded p-4 bg-gray-50">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-700">Disclaimer:</span> Options trading involves
          significant risk and is not suitable for all investors. Each options contract represents
          100 shares of the underlying security. Data provided by Yahoo Finance. Aura Trade does not
          currently support options order execution — this page is for informational purposes only.
        </p>
      </div>
    </div>
  );
}
