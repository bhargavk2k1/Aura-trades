"use client";

import { useEffect, useRef } from "react";

const MIC_TO_TV: Record<string, string> = {
  XNAS: "NASDAQ",
  XNYS: "NYSE",
  ARCX: "AMEX",
  XASE: "AMEX",
};

interface Props {
  symbol: string;
  mic?: string;
  height?: number;
}

export function TradingViewChart({ symbol, mic, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const exchange = MIC_TO_TV[mic ?? ""] ?? "NASDAQ";

    el.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.cssText = "height:100%;width:100%";
    el.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type  = "text/javascript";
    script.src   = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize:            true,
      symbol:              `${exchange}:${symbol}`,
      interval:            "D",
      timezone:            "America/New_York",
      theme:               "light",
      style:               "1",
      locale:              "en",
      allow_symbol_change: false,
      hide_side_toolbar:   false,
      withdateranges:      true,
      hide_volume:         false,
      calendar:            false,
      support_host:        "https://www.tradingview.com",
    });
    el.appendChild(script);

    return () => { el.innerHTML = ""; };
  }, [symbol, mic]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container border border-gray-200 rounded"
      style={{ height: height ?? "100%", width: "100%", minWidth: 0 }}
    />
  );
}
