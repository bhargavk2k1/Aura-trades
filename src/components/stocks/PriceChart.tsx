"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid
} from "recharts";
import type { ChartBar } from "@/types/market";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: ChartBar[];
  type?: "candlestick" | "line";
  height?: number;
}

function CandlestickBar(props: {
  x?: number; y?: number; width?: number; height?: number;
  open?: number; close?: number; high?: number; low?: number;
  index?: number;
}) {
  const { x = 0, y = 0, width = 0, open = 0, close = 0, high = 0, low = 0 } = props;
  if (!width || !open || !close) return null;
  const isGain = close >= open;
  const color = isGain ? "#10b981" : "#ef4444";
  const bodyTop = Math.min(open, close);
  const bodyHeight = Math.abs(close - open) || 1;
  return (
    <g>
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + (high - close)} stroke={color} strokeWidth={1} />
      <rect x={x + 1} y={y} width={width - 2} height={bodyHeight} fill={color} />
      <line x1={x + width / 2} y1={y + bodyHeight + (high - close)} x2={x + width / 2} y2={y + bodyHeight + (high - close) + (bodyTop - low)} stroke={color} strokeWidth={1} />
    </g>
  );
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ChartBar }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isGain = d.close >= d.open;
  return (
    <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-3 text-xs">
      <p className="text-gray-400 mb-1">{new Date(d.time).toLocaleDateString()}</p>
      <p className="text-white">O: {formatCurrency(d.open)}</p>
      <p className="text-white">H: {formatCurrency(d.high)}</p>
      <p className="text-white">L: {formatCurrency(d.low)}</p>
      <p className={`font-semibold ${isGain ? "text-emerald-400" : "text-red-400"}`}>C: {formatCurrency(d.close)}</p>
    </div>
  );
};

export function PriceChart({ data, type = "line", height = 300 }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-gray-500 text-sm" style={{ height }}>
        No chart data available
      </div>
    );
  }

  const prices = data.map((d) => d.close);
  const minPrice = Math.min(...prices) * 0.998;
  const maxPrice = Math.max(...prices) * 1.002;
  const lineColor = data[data.length - 1].close >= data[0].open ? "#10b981" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="time"
          tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={60}
        />
        <YAxis
          domain={[minPrice, maxPrice]}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        {type === "line" ? (
          <Line
            type="monotone"
            dataKey="close"
            stroke={lineColor}
            dot={false}
            strokeWidth={2}
          />
        ) : (
          <Bar dataKey="close" shape={<CandlestickBar />}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.close >= entry.open ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
