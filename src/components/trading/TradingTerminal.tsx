"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { TradingViewChart } from "@/components/stocks/TradingViewChart";
import { OptionsChain } from "@/components/stocks/OptionsChain";
import { MarketDepth } from "@/components/stocks/MarketDepth";
import { StockStats } from "@/components/stocks/StockStats";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import type { StockDetail } from "@/types/market";

// ── tiny SVG icon ─────────────────────────────────────────────────────────────
function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const DEFAULT_NAMES = Array.from({ length: 10 }, (_, i) => `Watchlist ${i + 1}`);

const IC = {
  close:    "M6 18L18 6M6 6l12 12",
  watchlist:"M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
  positions:"M16 8v8m-4-5v5m-4-2v2M3 20h18",
  orders:   "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  depth:    "M3 12h18M3 6h18M3 18h18",
  options:  "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  more:     "M12 5v.01M12 12v.01M12 19v.01",
  search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  chart:    "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16",
};

type RightPanel = "watchlist" | "positions" | "orders" | "depth" | "options" | null;
type CenterTab  = "chart" | "overview";

interface WatchItem  { symbol: string; price: number; change: number; changePercent: number }
interface OrderItem  { id: string; symbol: string; side: string; qty: string; status: string; submitted_at: string; filled_avg_price: string | null; type: string }

// ── Quick order form (inline in chart header) ─────────────────────────────────
function QuickOrder({ ticker, price, side, onClose }: { ticker: string; price: number; side: "buy"|"sell"; onClose: () => void }) {
  const [qty, setQty]       = useState("1");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setLoading(true); setMsg(null);
    const res = await fetch("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: ticker, qty, side, type: "market", time_in_force: "day" })
    });
    const data = await res.json();
    setLoading(false);
    setMsg(res.ok ? { ok: true, text: `Order placed · ${data.id?.slice(0,8)}` } : { ok: false, text: data.error ?? "Failed" });
  }

  const est = price * (parseFloat(qty) || 0);
  const isBuy = side === "buy";

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 rounded-lg shadow-2xl w-72 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${isBuy ? "text-green-700" : "text-red-700"}`}>
          {isBuy ? "Buy" : "Sell"} {ticker} @ {formatCurrency(price)}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><Icon d={IC.close} size={16}/></button>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Quantity (Shares)</label>
        <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400"/>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Market Order</span>
        <span className="font-semibold text-gray-900">≈ {formatCurrency(est)}</span>
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
      <button onClick={submit} disabled={loading || !qty || parseFloat(qty) <= 0}
        className={`w-full py-2 rounded text-sm font-semibold text-white disabled:opacity-40 transition
          ${isBuy ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
        {loading ? "Placing…" : `${isBuy ? "Buy" : "Sell"} ${ticker}`}
      </button>
    </div>
  );
}

// ── Main terminal ─────────────────────────────────────────────────────────────
interface Props {
  ticker: string; mic?: string; stock: StockDetail; assetName: string; buyingPower: number;
}

export function TradingTerminal({ ticker, mic, stock, assetName, buyingPower }: Props) {
  const router = useRouter();

  const [rightPanel, setRightPanel]       = useState<RightPanel>(null);
  const [centerTab, setCenterTab]         = useState<CenterTab>("chart");
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [quickOrder, setQuickOrder]       = useState<"buy"|"sell"|null>(null);
  const [watchlist, setWatchlist]         = useState<WatchItem[]>([]);
  const [orders, setOrders]               = useState<OrderItem[]>([]);
  const [watchSearch, setWatchSearch]     = useState("");
  const [watchResults, setWatchResults]   = useState<{ symbol: string; name: string }[]>([]);
  const [watchSearching, setWatchSearching] = useState(false);
  const [watchAdding, setWatchAdding]     = useState<string | null>(null);
  const [watchHovered, setWatchHovered]   = useState<string | null>(null);
  const [watchQuickOrder, setWatchQuickOrder] = useState<{ symbol: string; price: number; side: "buy"|"sell" } | null>(null);

  // Multi-list state
  const [activeList, setActiveList]       = useState(0);
  const [listNames, setListNames]         = useState<string[]>(DEFAULT_NAMES);
  const [editingTab, setEditingTab]       = useState<number | null>(null);
  const [editValue, setEditValue]         = useState("");
  const tabsRef     = useRef<HTMLDivElement>(null);
  const tabInputRef = useRef<HTMLInputElement>(null);

  // Resizable watchlist panel — DOM-driven for zero-lag resize
  const watchlistPanelRef = useRef<HTMLDivElement>(null);
  const watchlistWidth    = useRef(240);

  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    const startX     = e.clientX;
    const startWidth = watchlistWidth.current;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(ev: MouseEvent) {
      const next = Math.min(400, Math.max(160, startWidth + ev.clientX - startX));
      watchlistWidth.current = next;
      if (watchlistPanelRef.current) watchlistPanelRef.current.style.width = `${next}px`;
    }
    function onUp() {
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }

  useEffect(() => {
    fetch("/api/account/watchlist-names")
      .then(r => r.ok ? r.json() : DEFAULT_NAMES)
      .then(n => Array.isArray(n) && setListNames(n))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editingTab !== null) tabInputRef.current?.focus();
  }, [editingTab]);

  const loadWatchlist = useCallback(async (list = activeList) => {
    try {
      const res = await fetch(`/api/watchlist?list=${list}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      if (Array.isArray(data)) setWatchlist(data);
    } catch { /* non-fatal */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeList]);

  const addToWatchlist = useCallback(async (sym: string) => {
    setWatchAdding(sym);
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: sym, listIndex: activeList }),
    }).catch(() => {});
    await loadWatchlist();
    setWatchAdding(null);
    setWatchSearch("");
    setWatchResults([]);
  }, [loadWatchlist, activeList]);

  const removeFromWatchlist = useCallback(async (sym: string) => {
    await fetch(`/api/watchlist/${sym}?list=${activeList}`, { method: "DELETE" }).catch(() => {});
    setWatchlist(prev => prev.filter(w => w.symbol !== sym));
  }, [activeList]);

  async function commitTabEdit() {
    if (editingTab === null) return;
    const trimmed = editValue.trim() || DEFAULT_NAMES[editingTab];
    const next = listNames.map((n, i) => (i === editingTab ? trimmed : n));
    setListNames(next);
    setEditingTab(null);
    await fetch("/api/account/watchlist-names", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  function scrollTabs(dir: "left" | "right") {
    tabsRef.current?.scrollBy({ left: dir === "right" ? 100 : -100, behavior: "smooth" });
  }

  // Debounced search for adding stocks to watchlist
  useEffect(() => {
    const q = watchSearch.trim();
    if (!q) { setWatchResults([]); return; }
    const t = setTimeout(async () => {
      setWatchSearching(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data: { symbol: string; name: string }[] = await res.json();
          const seen = new Set<string>();
          setWatchResults(data.filter(r => { if (seen.has(r.symbol)) return false; seen.add(r.symbol); return true; }));
        }
      } finally {
        setWatchSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [watchSearch]);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/orders?status=all&limit=20");
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => { loadWatchlist(activeList); }, [loadWatchlist, activeList]);
  useEffect(() => {
    if (rightPanel === "orders") loadOrders();
    if (rightPanel === "watchlist") loadWatchlist();
  }, [rightPanel, loadOrders, loadWatchlist]);

  function togglePanel(p: RightPanel) {
    setRightPanel(prev => prev === p ? null : p);
    setQuickOrder(null);
  }

  const up = stock.change >= 0;

  // Right icon bar items
  const rightItems: { key: RightPanel; icon: string; label: string }[] = [
    { key: "watchlist", icon: IC.watchlist, label: "Watchlist" },
    { key: "positions", icon: IC.positions, label: "Positions" },
    { key: "orders",    icon: IC.orders,    label: "Orders"    },
    { key: "depth",     icon: IC.depth,     label: "Market\nDepth" },
    { key: "options",   icon: IC.options,   label: "Option\nChain" },
  ];

  return (
    <div className="flex bg-white overflow-hidden" style={{ height: "calc(100vh - 96px)" }}>

      {/* ── LEFT: Watchlist panel ─────────────────────────────────────────── */}
      <div ref={watchlistPanelRef}
        className={`relative flex flex-col border-r border-gray-200 bg-white shrink-0 ${showWatchlist ? "" : "w-0 overflow-hidden"}`}
        style={showWatchlist ? { width: watchlistWidth.current } : undefined}>

        {/* Header */}
        <div className="px-3 pt-2.5 pb-1 flex items-center justify-between shrink-0">
          <span className="text-sm font-semibold text-gray-800">Watchlist</span>
          <button onClick={() => setShowWatchlist(false)} className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition">
            <Icon d={IC.close} size={14}/>
          </button>
        </div>

        {/* Tabs with scroll arrows */}
        <div className="flex items-center gap-0.5 px-1.5 pb-1.5 shrink-0">
          <button onClick={() => scrollTabs("left")}
            className="shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 transition">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div ref={tabsRef} className="flex gap-0 overflow-x-auto scrollbar-hide flex-1">
            {listNames.map((name, i) => (
              <div key={i} className={`shrink-0 flex items-center group text-[11px] font-semibold transition
                ${activeList === i ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-400 hover:text-gray-700"}`}>
                {editingTab === i ? (
                  <input ref={tabInputRef} value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitTabEdit}
                    onKeyDown={e => { if (e.key === "Enter") commitTabEdit(); if (e.key === "Escape") setEditingTab(null); }}
                    maxLength={20}
                    className="w-16 bg-blue-50 border border-blue-300 rounded px-1 py-0.5 text-[11px] outline-none text-gray-800"
                  />
                ) : (
                  <>
                    <button onClick={() => { setActiveList(i); setWatchSearch(""); setWatchResults([]); }}
                      className="px-1.5 py-0.5 whitespace-nowrap">{name}</button>
                    <button onClick={e => { e.stopPropagation(); setEditingTab(i); setEditValue(listNames[i]); }}
                      title="Rename" className="opacity-0 group-hover:opacity-60 hover:!opacity-100 pr-0.5 text-gray-400 transition">
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
            className="shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 transition">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Search / add */}
        <div className="px-2 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1.5 border border-gray-300 rounded bg-white focus-within:border-blue-400 transition">
            <Icon d={IC.search} size={12}/>
            <input value={watchSearch} onChange={e => setWatchSearch(e.target.value)}
              placeholder="Search & add stocks…"
              className="flex-1 text-xs bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"/>
            {watchSearch && (
              <button onClick={() => { setWatchSearch(""); setWatchResults([]); }}
                className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>
          {!watchSearch && (
            watchlist.find(w => w.symbol === ticker)
              ? <p className="text-[10px] text-blue-600 font-medium mt-1.5 px-1">★ {ticker} is in {listNames[activeList]}</p>
              : <button onClick={() => addToWatchlist(ticker)} disabled={watchAdding === ticker}
                  className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 rounded text-[11px] font-semibold border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition">
                  {watchAdding === ticker ? "Adding…" : `+ Add ${ticker} to watchlist`}
                </button>
          )}
        </div>

        {/* Content: search results or watchlist rows */}
        <div className="flex-1 overflow-y-auto">
          {watchSearch ? (
            watchSearching ? (
              <p className="text-xs text-gray-400 text-center py-6">Searching…</p>
            ) : watchResults.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No results</p>
            ) : watchResults.map(r => {
              const already = !!watchlist.find(w => w.symbol === r.symbol);
              return (
                <div key={r.symbol} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 hover:bg-gray-50 transition">
                  <button onClick={() => router.push(`/stocks/${r.symbol}`)} className="min-w-0 flex-1 mr-2 text-left">
                    <p className="text-xs font-bold text-gray-900">{r.symbol}</p>
                    <p className="text-[10px] text-gray-400 truncate">{r.name}</p>
                  </button>
                  {already ? (
                    <button onClick={() => removeFromWatchlist(r.symbol)}
                      className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition">
                      ★ Remove
                    </button>
                  ) : (
                    <button onClick={() => addToWatchlist(r.symbol)} disabled={watchAdding === r.symbol}
                      className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition">
                      {watchAdding === r.symbol ? "…" : "+ Add"}
                    </button>
                  )}
                </div>
              );
            })
          ) : watchlist.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-xs font-medium text-gray-500">Your watchlist is empty</p>
              <p className="text-[10px] text-gray-400 mt-1">Search above to add stocks</p>
            </div>
          ) : (
            watchlist.map(w => {
              const up = w.change >= 0;
              const isActive = w.symbol === ticker;
              const isHovered = watchHovered === w.symbol;
              return (
                <div key={w.symbol}
                  onMouseEnter={() => setWatchHovered(w.symbol)}
                  onMouseLeave={() => setWatchHovered(null)}
                  onClick={() => router.push(`/stocks/${w.symbol}`)}
                  className={`relative flex items-center justify-between px-3 py-2.5 border-b border-gray-50 cursor-pointer transition
                    ${isActive ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}
                    ${isHovered && !isActive ? "bg-gray-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-tight ${isActive ? "text-blue-700" : "text-gray-900"}`}>{w.symbol}</p>
                    <p className={`text-[10px] tabular-nums mt-0.5 ${up ? "text-green-500" : "text-red-400"}`}>
                      {up ? "+" : ""}{formatCurrency(w.change)} ({up ? "+" : ""}{w.changePercent.toFixed(2)}%)
                    </p>
                  </div>
                  {!isHovered ? (
                    <div className="text-right shrink-0 ml-1">
                      <p className={`text-xs font-semibold tabular-nums flex items-center justify-end gap-0.5 ${up ? "text-green-600" : "text-red-500"}`}>
                        {w.price > 0 ? formatCurrency(w.price) : "—"}
                        <span className="text-[8px]">{up ? "▲" : "▼"}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setWatchQuickOrder({ symbol: w.symbol, price: w.price, side: "buy" })}
                        className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center transition">B</button>
                      <button onClick={() => setWatchQuickOrder({ symbol: w.symbol, price: w.price, side: "sell" })}
                        className="w-6 h-6 rounded bg-orange-500 hover:bg-orange-400 text-white text-[10px] font-bold flex items-center justify-center transition">S</button>
                      <button onClick={() => router.push(`/stocks/${w.symbol}`)}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition">
                        <Icon d={IC.chart} size={11}/>
                      </button>
                      <button onClick={() => removeFromWatchlist(w.symbol)}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Options Quick List footer */}
        <div className="border-t border-gray-200 shrink-0">
          <button onClick={() => router.push("/fno")}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition">
            <span>OPTIONS QUICK LIST</span>
            <span className="text-gray-400">›</span>
          </button>
        </div>

        {/* Drag-to-resize handle */}
        <div
          onMouseDown={onResizeStart}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-10"
          title="Drag to resize"
        >
          <div className="absolute right-0 top-0 w-1 h-full bg-transparent group-hover:bg-blue-400 transition-colors duration-150"/>
        </div>
      </div>

      {/* ── CENTER: Chart area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Chart / Overview tab bar */}
        <div className="flex items-center border-b border-gray-200 bg-white px-3 shrink-0">
          <div className="flex">
            {(["chart", "overview"] as CenterTab[]).map(t => (
              <button key={t} onClick={() => setCenterTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition capitalize ${
                  centerTab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}>
                {t === "chart" ? "Chart" : "Overview"}
              </button>
            ))}
          </div>

          {/* Toggle watchlist when hidden */}
          {!showWatchlist && (
            <button onClick={() => setShowWatchlist(true)}
              title="Show Watchlist"
              className="ml-2 p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
              <Icon d={IC.watchlist} size={16}/>
            </button>
          )}
        </div>

        {/* OHLC info bar + BUY / SELL buttons */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-white shrink-0 flex-wrap">
          {/* Symbol + exchange */}
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="text-sm font-bold text-gray-900">{ticker}</span>
            <span className="text-[10px] text-gray-400 font-medium">· D · {mic ?? "NASDAQ"}</span>
          </div>
          {/* OHLC */}
          <div className="flex gap-2.5 text-xs tabular-nums text-gray-500 shrink-0">
            <span>O <span className="text-gray-700 font-medium">{formatCurrency(stock.open)}</span></span>
            <span>H <span className="text-green-600 font-medium">{formatCurrency(stock.high)}</span></span>
            <span>L <span className="text-red-600 font-medium">{formatCurrency(stock.low)}</span></span>
            <span>C <span className={`font-semibold ${gainLossColor(stock.change)}`}>{formatCurrency(stock.price)}</span></span>
            <span className={`font-medium ${gainLossColor(stock.change)}`}>
              {up ? "+" : ""}{formatCurrency(stock.change)} ({formatPercent(stock.changePercent)})
            </span>
          </div>

          {/* BUY / SELL — Angel One style: inline in header */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={() => setQuickOrder(v => v === "buy" ? null : "buy")}
              className={`px-5 py-1.5 rounded text-sm font-bold text-white transition shadow-sm
                ${quickOrder === "buy" ? "bg-green-700 ring-2 ring-green-300" : "bg-green-600 hover:bg-green-700"}`}>
              BUY @ {formatCurrency(stock.price)}
            </button>
            <button
              onClick={() => setQuickOrder(v => v === "sell" ? null : "sell")}
              className={`px-5 py-1.5 rounded text-sm font-bold text-white transition shadow-sm
                ${quickOrder === "sell" ? "bg-red-700 ring-2 ring-red-300" : "bg-red-600 hover:bg-red-700"}`}>
              SELL @ {formatCurrency(stock.price)}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-h-0 relative">
          {centerTab === "chart" && <TradingViewChart symbol={ticker} mic={mic} />}
          {centerTab === "overview" && (
            <div className="h-full overflow-y-auto p-4">
              <StockStats stock={stock} />
            </div>
          )}

          {/* Quick order popup — chart header buttons */}
          {quickOrder && (
            <QuickOrder
              ticker={ticker}
              price={stock.price}
              side={quickOrder}
              onClose={() => setQuickOrder(null)}
            />
          )}

          {/* Quick order popup — watchlist B/S buttons */}
          {watchQuickOrder && (
            <QuickOrder
              ticker={watchQuickOrder.symbol}
              price={watchQuickOrder.price}
              side={watchQuickOrder.side}
              onClose={() => setWatchQuickOrder(null)}
            />
          )}
        </div>
      </div>

      {/* ── RIGHT: slide-in panel ─────────────────────────────────────────── */}
      {rightPanel && (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {rightPanel === "depth"     ? "Market Depth"  :
               rightPanel === "options"  ? "Option Chain"  :
               rightPanel === "orders"   ? "Orders"        :
               rightPanel === "positions"? "Positions"     : "Watchlist"}
            </span>
            <button onClick={() => setRightPanel(null)} className="text-gray-400 hover:text-gray-700">
              <Icon d={IC.close} size={15}/>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rightPanel === "depth"     && <MarketDepth ticker={ticker} currentPrice={stock.price}/>}
            {rightPanel === "options"   && <OptionsChain ticker={ticker} currentPrice={stock.price}/>}
            {rightPanel === "orders"    && <OrdersList orders={orders} onRefresh={loadOrders}/>}
            {rightPanel === "positions" && <PositionsList ticker={ticker}/>}
            {rightPanel === "watchlist" && (
              <WatchlistPanel
                items={watchlist}
                current={ticker}
                onNavigate={sym => router.push(`/stocks/${sym}`)}
              />
            )}
          </div>
        </div>
      )}

      {/* ── FAR RIGHT: icon action bar (Angel One style) ──────────────────── */}
      <div className="w-[52px] border-l border-gray-200 bg-white flex flex-col items-center py-2 gap-0.5 shrink-0">
        {rightItems.map(({ key, icon, label }) => (
          <button key={key ?? "more"} title={label.replace("\n", " ")}
            onClick={() => togglePanel(key)}
            className={`w-11 flex flex-col items-center justify-center py-2.5 gap-1 rounded transition text-center
              ${rightPanel === key
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}>
            <Icon d={icon} size={17}/>
            {label.split("\n").map((line, i) => (
              <span key={i} className="text-[9px] font-medium leading-tight block">{line}</span>
            ))}
          </button>
        ))}

        {/* More / divider */}
        <div className="my-1 w-7 border-t border-gray-200"/>
        <button className="w-11 flex flex-col items-center justify-center py-2.5 gap-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
          <span className="text-lg font-bold leading-none">⋮</span>
          <span className="text-[9px] font-medium">More</span>
        </button>
      </div>
    </div>
  );
}

// ── Watchlist side panel ──────────────────────────────────────────────────────
function WatchlistPanel({ items, current, onNavigate }: {
  items: WatchItem[]; current: string; onNavigate: (sym: string) => void
}) {
  const [q, setQ] = useState("");
  const filtered = items.filter(w => !q || w.symbol.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded bg-gray-50">
          <Icon d={IC.search} size={13}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
            className="flex-1 text-xs bg-transparent focus:outline-none"/>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {filtered.map(w => (
          <button key={w.symbol} onClick={() => onNavigate(w.symbol)}
            className={`w-full flex justify-between items-center px-3 py-2.5 hover:bg-gray-50 transition text-left
              ${w.symbol === current ? "bg-blue-50" : ""}`}>
            <div>
              <p className={`text-xs font-bold ${w.symbol === current ? "text-blue-700" : "text-gray-800"}`}>{w.symbol}</p>
              <p className="text-[10px] text-gray-400">NSE</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-900 tabular-nums">{w.price > 0 ? formatCurrency(w.price) : "—"}</p>
              <p className={`text-[10px] tabular-nums ${gainLossColor(w.changePercent)}`}>
                {w.changePercent >= 0 ? "+" : ""}{w.changePercent.toFixed(2)}%
              </p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No items</p>}
      </div>
    </div>
  );
}

// ── Orders mini list ──────────────────────────────────────────────────────────
function OrdersList({ orders, onRefresh }: { orders: OrderItem[]; onRefresh: () => void }) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Last 20 orders</span>
        <button onClick={onRefresh} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-0.5">↺ Refresh</button>
      </div>
      {orders.length === 0
        ? <p className="text-xs text-gray-400 text-center py-8">No orders yet</p>
        : orders.map(o => (
          <div key={o.id} className="border border-gray-100 rounded p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${o.side === "buy" ? "text-green-600" : "text-red-600"}`}>{o.side.toUpperCase()}</span>
              <span className="text-xs font-semibold text-gray-900">{o.symbol}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                o.status === "filled"    ? "bg-green-50 text-green-700" :
                o.status === "cancelled" ? "bg-gray-100 text-gray-500"  : "bg-amber-50 text-amber-700"
              }`}>{o.status}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 tabular-nums">
              <span>{o.qty} shares · {o.type}</span>
              <span>{o.filled_avg_price ? formatCurrency(parseFloat(o.filled_avg_price)) : "—"}</span>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── Positions mini list ───────────────────────────────────────────────────────
function PositionsList({ ticker }: { ticker: string }) {
  const [positions, setPositions] = useState<Array<{
    symbol: string; qty: number; avgEntryPrice: number;
    currentPrice: number; unrealizedPl: number; unrealizedPlPct: number
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio").then(r => r.json()).then(d => {
      setPositions(Array.isArray(d) ? d : []); setLoading(false);
    });
  }, []);

  const current = positions.find(p => p.symbol === ticker);

  if (loading) return <div className="text-xs text-gray-400 text-center py-8">Loading…</div>;

  return (
    <div className="p-3 space-y-2">
      {current && (
        <div className="border border-blue-100 rounded p-3 bg-blue-50 mb-3">
          <p className="text-xs font-semibold text-blue-800 mb-2">{ticker} — Current Position</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Qty",      current.qty],
              ["Avg Cost", formatCurrency(current.avgEntryPrice)],
              ["LTP",      formatCurrency(current.currentPrice)],
              ["P&L",      `${current.unrealizedPl >= 0 ? "+" : ""}${formatCurrency(current.unrealizedPl)}`],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <p className="text-gray-400">{l}</p>
                <p className="font-semibold text-gray-900">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {positions.length === 0
        ? <p className="text-xs text-gray-400 text-center py-8">No open positions</p>
        : positions.filter(p => p.symbol !== ticker).map(p => (
          <div key={p.symbol} className="border border-gray-100 rounded p-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-900">{p.symbol}</span>
              <span className={`text-xs font-medium tabular-nums ${gainLossColor(p.unrealizedPl)}`}>
                {p.unrealizedPl >= 0 ? "+" : ""}{formatCurrency(p.unrealizedPl)}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 tabular-nums">
              <span>{p.qty} shares @ {formatCurrency(p.avgEntryPrice)}</span>
              <span>{p.unrealizedPlPct >= 0 ? "+" : ""}{p.unrealizedPlPct.toFixed(2)}%</span>
            </div>
          </div>
        ))
      }
    </div>
  );
}
