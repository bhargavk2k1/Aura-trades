"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import type { LivePrice } from "@/types/market";

const INTERVAL_MS = Number(process.env.NEXT_PUBLIC_POLLING_INTERVAL_MS) || 15000;
const DEFAULT_NAMES = Array.from({ length: 10 }, (_, i) => `Watchlist ${i + 1}`);

export default function WatchlistPage() {
  const [activeList, setActiveList] = useState(0);
  const [names, setNames]           = useState<string[]>(DEFAULT_NAMES);
  const [items, setItems]           = useState<LivePrice[]>([]);
  const [loading, setLoading]       = useState(true);
  const [removing, setRemoving]     = useState<string | null>(null);
  const [editingTab, setEditingTab] = useState<number | null>(null);
  const [editValue, setEditValue]   = useState("");
  const tabsRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/account/watchlist-names")
      .then(r => r.ok ? r.json() : DEFAULT_NAMES)
      .then(n => Array.isArray(n) && setNames(n))
      .catch(() => {});
  }, []);

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
    tabsRef.current?.scrollBy({ left: dir === "right" ? 160 : -160, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Watchlist</h1>
        <span className="text-xs text-gray-400">Refreshes every 15s</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        <button onClick={() => scrollTabs("left")}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div ref={tabsRef} className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
          {names.map((name, i) => (
            <div key={i}
              className={`shrink-0 flex items-center rounded-xl text-xs font-semibold transition group
                ${activeList === i ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"}`}>
              {editingTab === i ? (
                <input ref={inputRef} value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingTab(null); }}
                  maxLength={20}
                  className="bg-transparent outline-none text-center px-3 py-2 w-28"
                />
              ) : (
                <>
                  <button onClick={() => setActiveList(i)} className="px-3 py-2 whitespace-nowrap">{name}</button>
                  <button onClick={(e) => startEdit(i, e)} title="Rename"
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition pr-2">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => scrollTabs("right")}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">{names[activeList]} is empty.</p>
            <Link href="/stocks" className="mt-2 inline-block text-blue-500 hover:underline text-sm">
              Browse stocks to add →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Symbol</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Change</th>
                  <th className="px-5 py-3 text-right">Change %</th>
                  <th className="px-5 py-3 text-right">Since Added</th>
                  <th className="px-5 py-3 text-right">Volume</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.symbol} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-5 py-3">
                      <Link href={`/stocks/${item.symbol}`} className="font-bold text-gray-900 hover:text-blue-600 transition">
                        {item.symbol}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{formatCurrency(item.price)}</td>
                    <td className={`px-5 py-3 text-right font-medium ${gainLossColor(item.change)}`}>
                      {item.change >= 0 ? "+" : ""}{formatCurrency(item.change)}
                    </td>
                    <td className={`px-5 py-3 text-right font-medium ${gainLossColor(item.changePercent)}`}>
                      {formatPercent(item.changePercent)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {item.sinceAddedPercent != null ? (
                        <span className={`inline-flex flex-col items-end ${gainLossColor(item.sinceAddedPercent)}`}
                          title={`Added${item.addedAt ? ` on ${new Date(item.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}${item.priceAtAdd ? ` at ${formatCurrency(item.priceAtAdd)}` : ""}`}>
                          <span className="font-semibold">
                            {item.sinceAddedPercent >= 0 ? "+" : ""}{item.sinceAddedPercent.toFixed(2)}%
                          </span>
                          {item.priceAtAdd != null && (
                            <span className="text-[10px] text-gray-400 font-normal">from {formatCurrency(item.priceAtAdd)}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">
                      {item.volume > 0 ? item.volume.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => remove(item.symbol)} disabled={removing === item.symbol}
                        className="text-xs text-gray-400 hover:text-red-500 transition disabled:opacity-40">
                        {removing === item.symbol ? "..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
