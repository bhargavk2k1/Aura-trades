"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CommodityChart } from "./CommodityChart";
import { MarketDepth } from "@/components/stocks/MarketDepth";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import type { Commodity } from "@/lib/commodities";

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const IC = {
  close:    "M6 18L18 6M6 6l12 12",
  depth:    "M3 12h18M3 6h18M3 18h18",
  orders:   "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  positions:"M16 8v8m-4-5v5m-4-2v2M3 20h18",
  more:     "M12 5v.01M12 12v.01M12 19v.01",
};

type RightPanel = "depth" | "orders" | "positions" | null;

interface Price { price: number; change: number; changePercent: number }
interface OrderItem { id: string; side: string; qty: string; status: string; submitted_at: string; filled_avg_price: string | null; type: string }

// ── Quick order popup ─────────────────────────────────────────────────────────
function QuickOrder({ commodity, price, side, onClose }: {
  commodity: Commodity; price: number; side: "buy"|"sell"; onClose: () => void;
}) {
  const [qty, setQty]         = useState("1");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const est = price * (parseFloat(qty) || 0);

  async function submit() {
    setLoading(true); setMsg(null);
    const res = await fetch("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: commodity.symbol, qty, side, type: "market", time_in_force: "day" }),
    });
    const data = await res.json();
    setLoading(false);
    setMsg(res.ok
      ? { ok: true,  text: `Order placed · ${data.id?.slice(0, 8)}` }
      : { ok: false, text: data.error ?? "Failed" });
  }

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 rounded-xl shadow-2xl w-72 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${side === "buy" ? "text-green-700" : "text-red-700"}`}>
          {side === "buy" ? "Buy" : "Sell"} {commodity.name}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><Icon d={IC.close} size={15}/></button>
      </div>
      <p className="text-xs text-gray-400">Via {commodity.symbol} ETF · Market order</p>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Units</label>
        <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"/>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Estimated {side === "buy" ? "cost" : "proceeds"}</span>
        <span className="font-semibold text-gray-900">≈ {formatCurrency(est)}</span>
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
      <button onClick={submit} disabled={loading || !qty || parseFloat(qty) <= 0}
        className={`w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition
          ${side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
        {loading ? "Placing…" : `${side === "buy" ? "Buy" : "Sell"} ${commodity.name}`}
      </button>
    </div>
  );
}

// ── Orders panel ──────────────────────────────────────────────────────────────
function OrdersPanel({ symbol, onRefresh }: { symbol: string; onRefresh: () => void }) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const load = useCallback(async () => {
    const res = await fetch(`/api/orders?status=all&limit=20`);
    if (res.ok) setOrders((await res.json()).filter((o: OrderItem & { symbol: string }) => o.symbol === symbol));
  }, [symbol]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Recent orders</span>
        <button onClick={load} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-0.5">↺</button>
      </div>
      {orders.length === 0 ? <p className="text-xs text-gray-400 text-center py-6">No orders for {symbol}</p>
        : orders.map(o => (
          <div key={o.id} className="border border-gray-100 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${o.side === "buy" ? "text-green-600" : "text-red-600"}`}>{o.side.toUpperCase()}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${o.status==="filled"?"bg-green-50 text-green-700":o.status==="cancelled"?"bg-gray-100 text-gray-500":"bg-amber-50 text-amber-700"}`}>{o.status}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 tabular-nums">
              <span>{o.qty} units · {o.type}</span>
              <span>{o.filled_avg_price ? formatCurrency(parseFloat(o.filled_avg_price)) : "—"}</span>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── Position panel ────────────────────────────────────────────────────────────
function PositionPanel({ symbol, name }: { symbol: string; name: string }) {
  const [pos, setPos] = useState<{ qty: number; avgEntryPrice: number; currentPrice: number; unrealizedPl: number; unrealizedPlPct: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio").then(r => r.json()).then((d: Array<{ symbol: string; qty: number; avgEntryPrice: number; currentPrice: number; unrealizedPl: number; unrealizedPlPct: number }>) => {
      if (Array.isArray(d)) setPos(d.find(p => p.symbol === symbol) ?? null);
      setLoading(false);
    });
  }, [symbol]);

  if (loading) return <div className="text-xs text-gray-400 text-center py-6">Loading…</div>;
  if (!pos) return <p className="text-xs text-gray-400 text-center py-6">No open position in {name}</p>;

  return (
    <div className="p-4">
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-700">{name} ({symbol}) Position</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            ["Units",    pos.qty],
            ["Avg Cost", formatCurrency(pos.avgEntryPrice)],
            ["LTP",      formatCurrency(pos.currentPrice)],
            ["P&L",      `${pos.unrealizedPl >= 0 ? "+" : ""}${formatCurrency(pos.unrealizedPl)}`],
            ["P&L %",    `${pos.unrealizedPlPct >= 0 ? "+" : ""}${pos.unrealizedPlPct.toFixed(2)}%`],
            ["Value",    formatCurrency(pos.qty * pos.currentPrice)],
          ].map(([l, v]) => (
            <div key={String(l)}>
              <p className="text-gray-400">{l}</p>
              <p className="font-semibold text-gray-900">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main terminal ─────────────────────────────────────────────────────────────
export function CommodityTerminal({ commodity, initialPrice, buyingPower }: {
  commodity: Commodity; initialPrice: Price; buyingPower: number;
}) {
  const router = useRouter();
  const [price, setPrice] = useState<Price>(initialPrice);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [quickOrder, setQuickOrder] = useState<"buy"|"sell"|null>(null);

  // Refresh price every 15s and apply spot-price multiplier
  useEffect(() => {
    const tick = async () => {
      const res = await fetch(`/api/market/snapshots?symbols=${commodity.symbol}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          const m = commodity.priceMultiplier;
          const raw = data[0] as Price;
          setPrice({ price: raw.price * m, change: raw.change * m, changePercent: raw.changePercent });
        }
      }
    };
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [commodity]);

  const up = price.change >= 0;

  const rightItems: { key: RightPanel; icon: string; label: string }[] = [
    { key: "depth",     icon: IC.depth,     label: "Market\nDepth" },
    { key: "orders",    icon: IC.orders,    label: "Orders"        },
    { key: "positions", icon: IC.positions, label: "Positions"     },
  ];

  return (
    <div className="flex bg-white overflow-hidden" style={{ height: "calc(100vh - 96px)" }}>

      {/* ── Left info panel ───────────────────────────────────────────── */}
      <div className="w-56 border-r border-gray-200 flex flex-col shrink-0 bg-white">
        {/* Commodity identity */}
        <div className="p-4 border-b border-gray-100 space-y-1">
          <div className="text-3xl mb-2">{commodity.icon}</div>
          <p className="text-base font-bold text-gray-900">{commodity.name}</p>
          <p className="text-xs text-gray-400">{commodity.unit}</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums mt-2">{formatCurrency(price.price)}</p>
          <p className={`text-sm font-semibold tabular-nums ${gainLossColor(price.change)}`}>
            {up ? "▲" : "▼"} {formatCurrency(Math.abs(price.change))} ({formatPercent(price.changePercent)})
          </p>
        </div>

        {/* ETF info */}
        <div className="p-4 border-b border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ETF Proxy</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">{commodity.symbol}</span>
            <span className="text-xs text-gray-400">Listed on NYSE</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">{commodity.description}</p>
        </div>

        {/* Quick facts */}
        <div className="p-4 space-y-2 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">About</p>
          {commodity.slug === "gold" && (
            <ul className="text-[10px] text-gray-500 space-y-1.5">
              <li>• Safe-haven asset during market stress</li>
              <li>• Hedge against inflation &amp; USD weakness</li>
              <li>• Central banks hold gold reserves</li>
              <li>• Supply driven by mining output</li>
            </ul>
          )}
          {commodity.slug === "silver" && (
            <ul className="text-[10px] text-gray-500 space-y-1.5">
              <li>• 50%+ demand from industrial use</li>
              <li>• Key input in solar panels &amp; EVs</li>
              <li>• More volatile than gold</li>
              <li>• Gold/Silver ratio tracked by traders</li>
            </ul>
          )}
          {commodity.slug === "crude-oil" && (
            <ul className="text-[10px] text-gray-500 space-y-1.5">
              <li>• WTI benchmark for US crude</li>
              <li>• OPEC production decisions key driver</li>
              <li>• Highly sensitive to geopolitics</li>
              <li>• Correlated with global growth outlook</li>
            </ul>
          )}
        </div>

        {/* Available cash */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 mb-0.5">Available to trade</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(buyingPower)}</p>
          <button onClick={() => router.push("/funds")} className="text-[10px] text-gray-400 hover:text-gray-700 mt-1">Add funds →</button>
        </div>
      </div>

      {/* ── Center: chart ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header bar with OHLC + BUY/SELL */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 bg-white shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">{commodity.name}</span>
            <span className="text-[10px] text-gray-400">· {commodity.tvSymbol} · D</span>
          </div>
          <div className="flex gap-3 text-xs tabular-nums text-gray-400">
            <span className={`font-semibold ${gainLossColor(price.change)}`}>{formatCurrency(price.price)}</span>
            <span className={gainLossColor(price.change)}>{up ? "+" : ""}{formatCurrency(price.change)} ({formatPercent(price.changePercent)})</span>
          </div>
          <div className="ml-auto flex gap-2 shrink-0">
            <button
              onClick={() => setQuickOrder(v => v === "buy" ? null : "buy")}
              className={`px-5 py-1.5 rounded-lg text-sm font-bold text-white transition shadow-sm
                ${quickOrder === "buy" ? "bg-green-700 ring-2 ring-green-300" : "bg-green-600 hover:bg-green-700"}`}>
              BUY @ {formatCurrency(price.price)}
            </button>
            <button
              onClick={() => setQuickOrder(v => v === "sell" ? null : "sell")}
              className={`px-5 py-1.5 rounded-lg text-sm font-bold text-white transition shadow-sm
                ${quickOrder === "sell" ? "bg-red-700 ring-2 ring-red-300" : "bg-red-600 hover:bg-red-700"}`}>
              SELL @ {formatCurrency(price.price)}
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 relative">
          <CommodityChart tvSymbol={commodity.tvSymbol} />
          {quickOrder && (
            <QuickOrder
              commodity={commodity}
              price={price.price}
              side={quickOrder}
              onClose={() => setQuickOrder(null)}
            />
          )}
        </div>
      </div>

      {/* ── Right slide-in panel ──────────────────────────────────────── */}
      {rightPanel && (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {rightPanel === "depth" ? "Market Depth" : rightPanel === "orders" ? "Orders" : "Positions"}
            </span>
            <button onClick={() => setRightPanel(null)} className="text-gray-400 hover:text-gray-700">
              <Icon d={IC.close} size={14}/>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rightPanel === "depth"     && <MarketDepth ticker={commodity.symbol} currentPrice={price.price}/>}
            {rightPanel === "orders"    && <OrdersPanel symbol={commodity.symbol} onRefresh={() => {}}/>}
            {rightPanel === "positions" && <PositionPanel symbol={commodity.symbol} name={commodity.name}/>}
          </div>
        </div>
      )}

      {/* ── Far-right icon bar ────────────────────────────────────────── */}
      <div className="w-[52px] border-l border-gray-200 bg-white flex flex-col items-center py-2 gap-0.5 shrink-0">
        {rightItems.map(({ key, icon, label }) => (
          <button key={key} title={label.replace("\n", " ")}
            onClick={() => setRightPanel(prev => prev === key ? null : key)}
            className={`w-11 flex flex-col items-center justify-center py-2.5 gap-1 rounded transition text-center
              ${rightPanel === key ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`}>
            <Icon d={icon} size={17}/>
            {label.split("\n").map((l, i) => <span key={i} className="text-[9px] font-medium leading-tight block">{l}</span>)}
          </button>
        ))}
        <div className="my-1 w-7 border-t border-gray-200"/>
        <button className="w-11 flex flex-col items-center justify-center py-2.5 gap-1 rounded text-gray-400 hover:bg-gray-100 transition">
          <span className="text-lg font-bold leading-none">⋮</span>
          <span className="text-[9px] font-medium">More</span>
        </button>
      </div>
    </div>
  );
}
