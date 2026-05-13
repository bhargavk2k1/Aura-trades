"use client";

import { cn } from "@/lib/utils";
import { CHART_TIMEFRAMES } from "@/lib/constants";

interface Props {
  active: string;
  onChange: (label: string) => void;
  chartType: "line" | "candlestick";
  onTypeChange: (t: "line" | "candlestick") => void;
}

export function ChartControls({ active, onChange, chartType, onTypeChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex gap-1">
        {CHART_TIMEFRAMES.map((tf) => (
          <button
            key={tf.label}
            onClick={() => onChange(tf.label)}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition",
              active === tf.label
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {(["line", "candlestick"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTypeChange(t)}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition",
              chartType === t
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            )}
          >
            {t === "line" ? "Line" : "Candle"}
          </button>
        ))}
      </div>
    </div>
  );
}
