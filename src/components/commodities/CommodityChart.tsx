"use client";

import { useEffect, useRef } from "react";

interface Props { tvSymbol: string }

export function CommodityChart({ tvSymbol }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.cssText = "height:100%;width:100%";
    el.appendChild(widget);

    const script = document.createElement("script");
    script.type  = "text/javascript";
    script.src   = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize:            true,
      symbol:              tvSymbol,
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
  }, [tvSymbol]);

  return (
    <div ref={ref} className="tradingview-widget-container" style={{ height: "100%", width: "100%", minWidth: 0 }} />
  );
}
