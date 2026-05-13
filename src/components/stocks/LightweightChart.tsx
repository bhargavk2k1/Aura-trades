"use client";

import { useEffect, useRef } from "react";
import type { ChartBar } from "@/types/market";

interface Props {
  data: ChartBar[];
  type: "line" | "candlestick";
  height?: number;
}

export function LightweightChart({ data, type, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    let resizeObserver: ResizeObserver;

    import("lightweight-charts").then((lc) => {
      if (!containerRef.current) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = lc.createChart(containerRef.current, {
        layout: {
          background: { type: lc.ColorType.Solid, color: "#ffffff" },
          textColor: "#6b7280",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "#f3f4f6" },
          horzLines: { color: "#f3f4f6" },
        },
        rightPriceScale: {
          borderColor: "#e5e7eb",
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: "#e5e7eb",
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: { mode: 1 },
        width: containerRef.current.clientWidth,
        height,
      });

      chartRef.current = chart;

      // lightweight-charts v5: time must be 'YYYY-MM-DD' for daily, Unix seconds for intraday
      const isIntraday = data[0]?.time.includes("T");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function toTime(iso: string): any {
        return isIntraday
          ? Math.floor(new Date(iso).getTime() / 1000)
          : iso.slice(0, 10);
      }

      if (type === "candlestick") {
        const series = chart.addSeries(lc.CandlestickSeries, {
          upColor:         "#16a34a",
          downColor:       "#dc2626",
          borderUpColor:   "#16a34a",
          borderDownColor: "#dc2626",
          wickUpColor:     "#16a34a",
          wickDownColor:   "#dc2626",
        });
        series.setData(
          data.map((d) => ({
            time:  toTime(d.time),
            open:  d.open,
            high:  d.high,
            low:   d.low,
            close: d.close,
          }))
        );
      } else {
        const up = data[data.length - 1].close >= data[0].open;
        const series = chart.addSeries(lc.LineSeries, {
          color:             up ? "#16a34a" : "#dc2626",
          lineWidth:         2,
          priceLineVisible:  false,
          lastValueVisible:  true,
        });
        series.setData(
          data.map((d) => ({ time: toTime(d.time), value: d.close }))
        );
      }

      chart.timeScale().fitContent();

      resizeObserver = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      resizeObserver.observe(containerRef.current);
    });

    return () => {
      resizeObserver?.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, type, height]);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height }}
      >
        No chart data
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
