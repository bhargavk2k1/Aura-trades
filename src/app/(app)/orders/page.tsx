"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AlpacaOrder } from "@/lib/alpaca/orders";

type Tab = "all" | "open" | "filled" | "cancelled";

const TABS: { key: Tab; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "open",      label: "Open"      },
  { key: "filled",    label: "Filled"    },
  { key: "cancelled", label: "Cancelled" },
];

function statusBadge(status: string) {
  if (status === "filled") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        Filled
      </span>
    );
  }
  if (status === "partially_filled") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-600 border border-green-200">
        Partial
      </span>
    );
  }
  if (["new", "accepted", "pending_new"].includes(status)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
        Open
      </span>
    );
  }
  if (status === "cancelled" || status === "replaced") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
        Cancelled
      </span>
    );
  }
  if (status === "rejected" || status === "expired") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
      {status}
    </span>
  );
}

function orderValue(o: AlpacaOrder): string {
  const qty = parseFloat(o.filled_qty || o.qty || "0");
  const price = parseFloat(o.filled_avg_price || o.limit_price || "0");
  if (qty > 0 && price > 0) return formatCurrency(qty * price);
  return "—";
}

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [orders, setOrders] = useState<AlpacaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?status=${tab}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function cancel(id: string) {
    setCancelling(id);
    try {
      await fetch(`/api/orders/${id}`, { method: "DELETE" });
    } finally {
      setCancelling(null);
      load();
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:text-gray-900 hover:border-gray-400 transition disabled:opacity-50"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              tab === t.key
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded bg-white overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b border-gray-100 px-4 py-3 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-gray-400">No orders found</p>
            <Link
              href="/stocks"
              className="px-4 py-2 rounded text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition"
            >
              Browse Stocks
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Time
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Symbol
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Side
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Price
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Filled @
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Value
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(o.submitted_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/stocks/${o.symbol}`}
                        className="font-bold text-gray-900 hover:text-gray-600 transition"
                      >
                        {o.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          o.side === "buy"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {o.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize text-xs">{o.type}</td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {parseFloat(o.qty)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {o.limit_price ? formatCurrency(parseFloat(o.limit_price)) : "Market"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {o.filled_avg_price ? formatCurrency(parseFloat(o.filled_avg_price)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {orderValue(o)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(o.status)}</td>
                    <td className="px-4 py-3">
                      {["new", "accepted", "pending_new"].includes(o.status) && (
                        <button
                          onClick={() => cancel(o.id)}
                          disabled={cancelling === o.id}
                          className="px-3 py-1 rounded text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {cancelling === o.id ? "…" : "Cancel"}
                        </button>
                      )}
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
