"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import { MarketStatusBadge } from "@/components/market/MarketStatusBadge";
import { TradingViewMarketOverview } from "@/components/tradingview/TradingViewMarketOverview";
import { POPULAR_TICKERS } from "@/lib/constants";
import type { IndexData, LivePrice, Mover } from "@/types/market";

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
const SYMBOLS = POPULAR_TICKERS.slice(0, 12).join(",");
const DEFAULT_NAMES = Array.from({ length: 10 }, (_, i) => `Watchlist ${i + 1}`);
const INTERVAL_MS = 15000;

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

interface WatchItem { symbol: string; price: number; change: number; changePercent: number; sinceAddedPercent?: number | null }

// ── Kite-style Watchlist Widget ───────────────────────────────────────────────
function DashboardWatchlist() {
  const router = useRouter();
  const [activeList, setActiveList] = useState(0);
  const [names, setNames]           = useState<string[]>(DEFAULT_NAMES);
  const [items, setItems]           = useState<WatchItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [hovered, setHovered]         = useState<string | null>(null);
  const [removing, setRemoving]       = useState<string | null>(null);
  const [editingTab, setEditingTab]   = useState<number | null>(null);
  const [editValue, setEditValue]     = useState("");
  const [search, setSearch]           = useState("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [searching, setSearching]     = useState(false);
  const [adding, setAdding]           = useState<string | null>(null);
  const tabsRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/account/watchlist-names")
      .then(r => r.ok ? r.json() : DEFAULT_NAMES)
      .then(n => Array.isArray(n) && setNames(n))
      .catch(() => {});
  }, []);

  // Debounced Finnhub search
  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data: { symbol: string; name: string }[] = await res.json();
          const seen = new Set<string>();
          setSearchResults(data.filter(r => { if (seen.has(r.symbol)) return false; seen.add(r.symbol); return true; }));
        }
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (editingTab !== null) inputRef.current?.focus();
  }, [editingTab]);

  const load = useCallback(async (list: number) => {
    try {
      const res = await fetch(`/api/watchlist?list=${list}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(activeList);
    const id = setInterval(() => load(activeList), INTERVAL_MS);
    return () => clearInterval(id);
  }, [load, activeList]);

  const addToWatchlist = useCallback(async (symbol: string) => {
    setAdding(symbol);
    await fetch("/api/watchlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, listIndex: activeList }),
    }).catch(() => {});
    await load(activeList);
    setAdding(null);
    setSearch("");
    setSearchResults([]);
  }, [load, activeList]);

  async function remove(symbol: string) {
    setRemoving(symbol);
    await fetch(`/api/watchlist/${symbol}?list=${activeList}`, { method: "DELETE" });
    setRemoving(null);
    load(activeList);
  }

  function startEdit(i: number, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTab(i);
    setEditValue(names[i]);
  }

  async function commitEdit() {
    if (editingTab === null) return;
    const trimmed = editValue.trim() || DEFAULT_NAMES[editingTab];
    const next = names.map((n, i) => (i === editingTab ? trimmed : n));
    setNames(next);
    setEditingTab(null);
    await fetch("/api/account/watchlist-names", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  function scrollTabs(dir: "left" | "right") {
    tabsRef.current?.scrollBy({ left: dir === "right" ? 120 : -120, behavior: "smooth" });
  }


  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden flex flex-col" style={{ minHeight: 420 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 shrink-0">
        <p className="text-sm font-semibold text-gray-800">Watchlist</p>
        <Link href="/watchlist" className="text-[11px] text-gray-400 hover:text-gray-700 transition">Manage →</Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-2 pb-2 shrink-0">
        <button onClick={() => scrollTabs("left")}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 transition">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div ref={tabsRef} className="flex gap-0.5 overflow-x-auto scrollbar-hide flex-1">
          {names.map((name, i) => (
            <div key={i} className={`shrink-0 flex items-center group transition rounded-md text-[11px] font-semibold
              ${activeList === i ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-400 hover:text-gray-700"}`}>
              {editingTab === i ? (
                <input ref={inputRef} value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingTab(null); }}
                  maxLength={20}
                  className="w-20 bg-blue-50 border border-blue-300 rounded px-1.5 py-0.5 text-[11px] outline-none text-gray-800"
                />
              ) : (
                <>
                  <button onClick={() => setActiveList(i)} className="px-1.5 py-0.5 whitespace-nowrap">{name}</button>
                  <button onClick={(e) => startEdit(i, e)} title="Rename"
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition pr-0.5 text-gray-400">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => scrollTabs("right")}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 transition">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-blue-400 transition">
          <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" size={12}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search & add stocks…"
            className="flex-1 text-xs bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"/>
          {search && <button onClick={() => { setSearch(""); setSearchResults([]); }} className="text-gray-400 hover:text-gray-600 text-[10px]">✕</button>}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {search ? (
          // ── Search results ──
          searching ? (
            <p className="text-xs text-gray-400 text-center py-8">Searching…</p>
          ) : searchResults.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No results for &quot;{search}&quot;</p>
          ) : searchResults.map(r => {
            const already = items.some(w => w.symbol === r.symbol);
            return (
              <div key={r.symbol} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition">
                <button onClick={() => router.push(`/stocks/${r.symbol}`)} className="min-w-0 flex-1 mr-2 text-left">
                  <p className="text-sm font-bold text-gray-900">{r.symbol}</p>
                  <p className="text-[10px] text-gray-400 truncate">{r.name}</p>
                </button>
                {already ? (
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-600">✓ Added</span>
                ) : (
                  <button onClick={() => addToWatchlist(r.symbol)} disabled={adding === r.symbol}
                    className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition">
                    {adding === r.symbol ? "…" : "+ Add"}
                  </button>
                )}
              </div>
            );
          })
        ) : loading ? (
          <p className="text-xs text-gray-400 text-center py-8">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-8 space-y-1">
            <p className="text-xs text-gray-400">{names[activeList]} is empty</p>
            <Link href="/stocks" className="text-xs text-blue-500 hover:underline">Browse stocks →</Link>
          </div>
        ) : items.map((w, idx) => {
          const up = w.change >= 0;
          const isHovered = hovered === w.symbol;
          return (
            <div key={w.symbol}
              onMouseEnter={() => setHovered(w.symbol)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => router.push(`/stocks/${w.symbol}`)}
              className={`relative flex items-center justify-between px-3 py-2.5 cursor-pointer transition
                ${isHovered ? "bg-gray-50" : ""}
                ${idx !== items.length - 1 ? "" : ""}`}
            >
              {/* Symbol */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 leading-tight">{w.symbol}</p>
                {w.sinceAddedPercent != null && (
                  <p className={`text-[10px] mt-0.5 ${w.sinceAddedPercent >= 0 ? "text-green-500" : "text-red-400"}`}>
                    {w.sinceAddedPercent >= 0 ? "+" : ""}{w.sinceAddedPercent.toFixed(2)}% since added
                  </p>
                )}
              </div>

              {/* Price / change — hidden on hover */}
              {!isHovered ? (
                <div className="text-right shrink-0 ml-2">
                  <p className={`text-sm font-semibold tabular-nums flex items-center justify-end gap-0.5 ${up ? "text-green-600" : "text-red-500"}`}>
                    {w.price > 0 ? formatCurrency(w.price) : "—"}
                    <span className="text-[9px]">{up ? "▲" : "▼"}</span>
                  </p>
                  <p className={`text-[11px] tabular-nums mt-0.5 ${up ? "text-green-500" : "text-red-400"}`}>
                    {up ? "+" : ""}{formatCurrency(w.change)} ({up ? "+" : ""}{w.changePercent.toFixed(2)}%)
                  </p>
                </div>
              ) : (
                /* Hover actions */
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => router.push(`/stocks/${w.symbol}?action=buy`)}
                    className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center transition">B</button>
                  <button onClick={() => router.push(`/stocks/${w.symbol}?action=sell`)}
                    className="w-6 h-6 rounded bg-orange-500 hover:bg-orange-400 text-white text-[10px] font-bold flex items-center justify-center transition">S</button>
                  <button onClick={() => router.push(`/stocks/${w.symbol}`)}
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </button>
                  <button onClick={() => remove(w.symbol)} disabled={removing === w.symbol}
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition disabled:opacity-40">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
interface Position  { symbol: string; qty: number; avgEntryPrice: number; currentPrice: number; marketValue: number; costBasis: number; unrealizedPl: number; unrealizedPlPct: number; changeToday: number }

interface Props {
  indices: IndexData[];
  trending: LivePrice[];
  gainers: Mover[];
  losers: Mover[];
  cashBalance: number;
  userName: string;
  greeting: string;
  keysConfigured: boolean;
}

export function DashboardClient({ indices: initIndices, trending: initTrending, gainers: initGainers, losers: initLosers, cashBalance, userName, greeting, keysConfigured }: Props) {
  const router = useRouter();
  const [moversTab, setMoversTab] = useState<"gainers"|"losers">("gainers");

  // Live data
  const { data: indices }  = useSWR<IndexData[]>("/api/market/indices", fetcher, { fallbackData: initIndices, refreshInterval: 15000 });
  const { data: trending } = useSWR<LivePrice[]>(`/api/market/snapshots?symbols=${SYMBOLS}`, fetcher, { fallbackData: initTrending, refreshInterval: 15000 });
  const { data: gainers }  = useSWR<Mover[]>("/api/market/movers?type=gainers", fetcher, { fallbackData: initGainers, refreshInterval: 15000 });
  const { data: losers }   = useSWR<Mover[]>("/api/market/movers?type=losers",  fetcher, { fallbackData: initLosers,  refreshInterval: 15000 });
  const { data: rawPositions } = useSWR<Position[] | { error: string }>("/api/portfolio", fetcher, { refreshInterval: 30000 });

  const movers = (moversTab === "gainers" ? gainers : losers) ?? [];

  // Guard: API may return { error: "..." } when Alpaca is unavailable
  const positions: Position[] | undefined = Array.isArray(rawPositions) ? rawPositions : undefined;

  // Portfolio calculations
  const totalInvested   = positions?.reduce((s, p) => s + p.costBasis,    0) ?? 0;
  const totalMarketVal  = positions?.reduce((s, p) => s + p.marketValue,   0) ?? 0;
  const totalPL         = positions?.reduce((s, p) => s + p.unrealizedPl,  0) ?? 0;
  const todayPL         = positions?.reduce((s, p) => s + (p.changeToday * p.qty), 0) ?? 0;
  const totalPLPct      = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const portfolioTotal  = totalMarketVal + cashBalance;

  const initials = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <div className="space-y-5">

      {/* ── Greeting + status ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">{greeting}{userName ? `, ${userName.split(" ")[0]}` : ""}!</p>
            <p className="text-xs text-gray-400">Here's your market summary for today</p>
          </div>
        </div>
        <MarketStatusBadge />
      </div>

      {!keysConfigured && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
          <Icon d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" size={16}/>
          <span>Add <code className="bg-amber-100 px-1 rounded font-mono text-xs">FINNHUB_API_KEY</code> to <code className="bg-amber-100 px-1 rounded font-mono text-xs">.env.local</code> for live prices.</span>
        </div>
      )}

      {/* ── Portfolio summary strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Value",      value: formatCurrency(portfolioTotal), sub: `${positions?.length ?? 0} holdings + cash`, color: "text-gray-900" },
          { label: "Invested",         value: formatCurrency(totalInvested),  sub: formatCurrency(totalMarketVal) + " market val", color: "text-gray-900" },
          { label: "Overall P&L",      value: `${totalPL >= 0 ? "+" : ""}${formatCurrency(totalPL)}`, sub: `${totalPLPct >= 0 ? "+" : ""}${totalPLPct.toFixed(2)}%`, color: gainLossColor(totalPL) },
          { label: "Today's P&L",      value: `${todayPL >= 0 ? "+" : ""}${formatCurrency(todayPL)}`, sub: "Available cash: " + formatCurrency(cashBalance), color: gainLossColor(todayPL) },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Indices ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Array.isArray(indices) ? indices : initIndices).map((idx) => {
          const up = idx.changePercent >= 0;
          return (
            <div key={idx.symbol} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-400 font-medium">{idx.symbol}</p>
                  <p className="text-sm font-semibold text-gray-700">{idx.label}</p>
                </div>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {formatPercent(idx.changePercent)}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(idx.price)}</p>
              <p className={`text-xs mt-0.5 tabular-nums ${gainLossColor(idx.change)}`}>
                {idx.change >= 0 ? "+" : ""}{formatCurrency(idx.change)} today
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Popular ticker strip ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Popular</p>
          <Link href="/stocks" className="text-xs text-gray-400 hover:text-gray-700 transition">All stocks →</Link>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
            {(trending ?? initTrending).map((p) => (
              <Link key={p.symbol} href={`/stocks/${p.symbol}`}
                className="flex items-center gap-2.5 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 hover:border-gray-300 transition shrink-0">
                <span className="font-bold text-gray-900 text-sm">{p.symbol}</span>
                <span className="text-gray-600 text-sm tabular-nums">{formatCurrency(p.price)}</span>
                <span className={`text-xs font-semibold tabular-nums ${gainLossColor(p.changePercent)}`}>
                  {formatPercent(p.changePercent)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main 3-col grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Watchlist */}
        <DashboardWatchlist />

        {/* Top Movers */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Top Movers</p>
            <div className="flex gap-1">
              {(["gainers","losers"] as const).map(t => (
                <button key={t} onClick={() => setMoversTab(t)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    moversTab === t ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"
                  }`}>
                  {t === "gainers" ? "Gainers" : "Losers"}
                </button>
              ))}
            </div>
          </div>
          {movers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data — market may be closed</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {movers.slice(0, 8).map(m => (
                <Link key={m.symbol} href={`/stocks/${m.symbol}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition">
                  <span className="text-sm font-bold text-gray-900 w-16">{m.symbol}</span>
                  <span className="text-sm text-gray-600 tabular-nums">{formatCurrency(m.price)}</span>
                  <span className={`text-sm font-semibold tabular-nums ${gainLossColor(m.changePercent)}`}>
                    {formatPercent(m.changePercent)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Holdings + Quick Access */}
        <div className="space-y-4">
          {/* Holdings */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Holdings</p>
              <Link href="/portfolio" className="text-xs text-gray-400 hover:text-gray-700">View all →</Link>
            </div>
            {!positions ? (
              <div className="py-6 text-center text-xs text-gray-400">Loading…</div>
            ) : positions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                <p>No open positions</p>
                <Link href="/stocks" className="text-gray-600 underline mt-1 block">Start investing →</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {positions.slice(0, 5).map(p => (
                  <Link key={p.symbol} href={`/stocks/${p.symbol}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{p.symbol}</p>
                      <p className="text-[10px] text-gray-400 tabular-nums">{p.qty} shares</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(p.marketValue)}</p>
                      <p className={`text-xs tabular-nums ${gainLossColor(p.unrealizedPl)}`}>
                        {p.unrealizedPl >= 0 ? "+" : ""}{formatCurrency(p.unrealizedPl)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Access */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Quick Access</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
              {[
                { href: "/stocks",    label: "Search Stocks",  icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" },
                { href: "/portfolio", label: "Portfolio",       icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" },
                { href: "/orders",    label: "Order History",   icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                { href: "/funds",     label: "Add Funds",       icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex flex-col items-start gap-1.5 px-4 py-3.5 hover:bg-gray-50 transition">
                  <Icon d={item.icon} size={15}/>
                  <span className="text-xs font-medium text-gray-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TradingView Market Overview ──────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Market Overview</p>
        </div>
        <TradingViewMarketOverview />
      </div>

    </div>
  );
}
