"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import type { StockSymbol } from "@/lib/staticSymbols";
import type { LivePrice } from "@/types/market";

interface NewsItem {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  image:    string;
  datetime: number;
  related:  string;
}

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() - unix * 1000) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PAGE_SIZE = 60;

const EXCHANGES: Record<string, string> = {
  XNAS: "NASDAQ",
  XNYS: "NYSE",
  XASE: "AMEX",
  ARCX: "NYSE Arca",
};

export default function StocksPage() {
  const [allSymbols, setAllSymbols]   = useState<StockSymbol[]>([]);
  const [filtered, setFiltered]       = useState<StockSymbol[]>([]);
  const [prices, setPrices]           = useState<Record<string, LivePrice>>({});
  const [search, setSearch]           = useState("");
  const [letter, setLetter]           = useState("All");
  const [page, setPage]               = useState(1);
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingPrices, setLoadingPrices]   = useState(false);
  const [news, setNews]               = useState<NewsItem[]>([]);
  const priceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetch("/api/market/news").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setNews(d);
    }).catch(() => {});
  }, []);

  const loadSymbols = useCallback(async () => {
    setLoadingSymbols(true);
    try {
      const r = await fetch("/api/market/symbols");
      const data = await r.json();
      if (Array.isArray(data)) {
        setAllSymbols(data);
        setFiltered(data);
      }
    } finally {
      setLoadingSymbols(false);
    }
  }, []);

  useEffect(() => { loadSymbols(); }, [loadSymbols]);

  useEffect(() => {
    let result = allSymbols;
    if (letter !== "All") result = result.filter((s) => s.symbol.startsWith(letter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
    setPage(1);
  }, [search, letter, allSymbols]);

  const loadPrices = useCallback(async (symbols: string[]) => {
    if (!symbols.length) return;
    setLoadingPrices(true);
    try {
      const res = await fetch(`/api/market/snapshots?symbols=${symbols.join(",")}`);
      const data: LivePrice[] = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, LivePrice> = {};
        data.forEach((p) => { map[p.symbol] = p; });
        setPrices((prev) => ({ ...prev, ...map }));
      }
    } finally {
      setLoadingPrices(false);
    }
  }, []);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  useEffect(() => {
    clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(() => {
      const missing = pageItems.map((s) => s.symbol).filter((sym) => !prices[sym]);
      if (missing.length) loadPrices(missing);
    }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtered]);

  const letters = ["All", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">US Stock Market</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {loadingSymbols ? "Loading…" : `${filtered.length.toLocaleString()} stocks`}
          </p>
        </div>
        {loadingPrices && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            Loading prices…
          </div>
        )}
      </div>

      {/* Market News */}
      {news.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Market News</h2>
            <Link href="/market-news" className="text-xs text-gray-400 hover:text-gray-700 transition">View all →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {news.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group flex-shrink-0 w-60 border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-gray-300 transition flex flex-col"
              >
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6-4h2" />
                    </svg>
                  </div>
                )}
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">
                    {item.source} · {timeAgo(item.datetime)}
                  </p>
                  <p className="text-xs font-semibold text-gray-900 leading-snug group-hover:underline line-clamp-3 flex-1">
                    {item.headline}
                  </p>
                  {item.related && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.related.split(",").slice(0, 2).map(s => s.trim()).filter(Boolean).map(sym => (
                        <span key={sym} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">{sym}</span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by symbol or company name…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">✕</button>
        )}
      </div>

      {/* A–Z Filter */}
      {!search && (
        <div className="flex flex-wrap gap-1">
          {letters.map((l) => (
            <button
              key={l}
              onClick={() => setLetter(l)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                letter === l
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loadingSymbols ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="border border-gray-100 rounded p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {search ? `No results for "${search}"` : "No stocks found"}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {pageItems.map((s) => {
            const p = prices[s.symbol];
            const exchange = EXCHANGES[s.mic] ?? s.mic ?? "";
            return (
              <Link
                key={s.symbol}
                href={`/stocks/${s.symbol}`}
                className="border border-gray-200 rounded p-4 hover:border-gray-400 transition flex flex-col gap-1"
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="font-bold text-gray-900 text-sm truncate">{s.symbol}</p>
                  {exchange && <span className="text-xs text-gray-400 shrink-0">{exchange}</span>}
                </div>
                <p className="text-gray-500 text-xs truncate leading-tight">{s.name}</p>
                {p && p.price > 0 ? (
                  <div className="mt-auto pt-1">
                    <p className="text-gray-900 text-sm font-semibold tabular-nums">{formatCurrency(p.price)}</p>
                    <p className={`text-xs font-medium tabular-nums ${gainLossColor(p.changePercent)}`}>
                      {formatPercent(p.changePercent)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-auto pt-1">
                    <div className="h-4 w-14 bg-gray-100 rounded animate-pulse" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-500 hover:text-gray-800 disabled:opacity-40 transition"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 3, totalPages - 6));
              return start + i;
            }).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-sm font-medium transition ${
                  p === page
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 text-gray-500 hover:text-gray-800"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-500 hover:text-gray-800 disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
