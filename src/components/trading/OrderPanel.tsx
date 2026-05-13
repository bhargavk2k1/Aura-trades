"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  ticker: string;
  currentPrice: number;
  buyingPower: number;
}

type Side      = "buy" | "sell";
type OrderType = "market" | "limit";

export function OrderPanel({ ticker, currentPrice, buyingPower }: Props) {
  const [side, setSide]           = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [qty, setQty]             = useState("1");
  const [limitPrice, setLimitPrice] = useState(currentPrice.toFixed(2));
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<{ success: boolean; message: string } | null>(null);

  const execPrice = orderType === "market" ? currentPrice : parseFloat(limitPrice) || 0;
  const estCost   = execPrice * (parseFloat(qty) || 0);

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, string> = {
        symbol: ticker, qty, side, type: orderType, time_in_force: "day",
      };
      if (orderType === "limit") body.limit_price = limitPrice;
      const res  = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error ?? "Order failed" });
      } else {
        setResult({ success: true, message: `Order placed · ID ${data.id?.slice(0, 8)}` });
        setQty("1");
      }
    } catch {
      setResult({ success: false, message: "Network error" });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Place Order</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Buy / Sell */}
        <div className="grid grid-cols-2 gap-2">
          {(["buy", "sell"] as Side[]).map((s) => (
            <button
              key={s}
              onClick={() => { setSide(s); setResult(null); }}
              className={`py-2 rounded text-sm font-semibold transition ${
                side === s
                  ? s === "buy"
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                  : "border border-gray-200 text-gray-500 hover:text-gray-800"
              }`}
            >
              {s === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>

        {/* Market / Limit */}
        <div className="grid grid-cols-2 gap-2">
          {(["market", "limit"] as OrderType[]).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`py-1.5 rounded text-xs font-medium transition ${
                orderType === t
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Shares */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Shares</label>
          <input
            type="number" min="1" value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition"
          />
        </div>

        {/* Limit price */}
        {orderType === "limit" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Limit Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number" step="0.01" value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition"
              />
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="pt-2 border-t border-gray-100 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Est. {side === "buy" ? "Cost" : "Proceeds"}</span>
            <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(estCost)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Buying Power</span>
            <span className="text-gray-600 tabular-nums">{formatCurrency(buyingPower)}</span>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`text-xs px-3 py-2 rounded border ${
            result.success
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {result.message}
          </div>
        )}

        {/* Submit / Confirm */}
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!qty || parseFloat(qty) <= 0}
            className={`w-full py-2.5 rounded font-semibold text-sm transition disabled:opacity-40 ${
              side === "buy"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {side === "buy" ? "Buy" : "Sell"} {ticker}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 text-center">
              Confirm {side.toUpperCase()} {qty} × {ticker} @ {formatCurrency(execPrice)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="py-2 rounded border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className={`py-2 rounded text-white text-sm font-semibold transition disabled:opacity-50 ${
                  side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading ? "Placing…" : "Confirm"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
