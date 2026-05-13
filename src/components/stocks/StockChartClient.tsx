"use client";

import { useState, useEffect, useCallback } from "react";
import { LightweightChart } from "@/components/stocks/LightweightChart";
import { ChartControls } from "@/components/stocks/ChartControls";
import { CHART_TIMEFRAMES } from "@/lib/constants";
import type { ChartBar } from "@/types/market";

interface Props { ticker: string }

const DEFAULT_TF = "1M";

export function StockChartClient({ ticker }: Props) {
  const [activeLabel, setActiveLabel] = useState(DEFAULT_TF);
  const [chartType, setChartType] = useState<"line" | "candlestick">("line");
  const [bars, setBars] = useState<ChartBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBars = useCallback(async (label: string) => {
    const tf = CHART_TIMEFRAMES.find((t) => t.label === label) ?? CHART_TIMEFRAMES[2];
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - tf.days);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/stocks/${ticker}/bars?timeframe=${tf.timeframe}` +
        `&start=${start.toISOString().slice(0, 10)}` +
        `&end=${end.toISOString().slice(0, 10)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setBars(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e));
      setBars([]);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => { loadBars(activeLabel); }, [activeLabel, loadBars]);

  function handleTimeframe(label: string) {
    setActiveLabel(label);
  }

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <div className="px-4 pt-3 pb-3 border-b border-gray-100">
        <ChartControls
          active={activeLabel}
          onChange={handleTimeframe}
          chartType={chartType}
          onTypeChange={setChartType}
        />
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          </div>
        )}
        {error ? (
          <div className="flex items-center justify-center h-[420px] text-sm text-red-500">
            {error}
          </div>
        ) : (
          <LightweightChart data={bars} type={chartType} height={420} />
        )}
      </div>
    </div>
  );
}
