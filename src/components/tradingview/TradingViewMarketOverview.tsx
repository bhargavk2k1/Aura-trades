"use client";

import { useEffect, useRef } from "react";

export function TradingViewMarketOverview() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    wrapper.style.height = "calc(100% - 32px)";
    wrapper.style.width = "100%";
    containerRef.current.appendChild(wrapper);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      dateRange: "1M",
      showChart: true,
      locale: "en",
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: "100%",
      height: "100%",
      plotLineColorGrowing: "rgba(16, 185, 129, 1)",
      plotLineColorFalling: "rgba(239, 68, 68, 1)",
      gridLineColor: "rgba(31, 41, 55, 0.6)",
      scaleFontColor: "rgba(107, 114, 128, 1)",
      belowLineFillColorGrowing: "rgba(16, 185, 129, 0.1)",
      belowLineFillColorFalling: "rgba(239, 68, 68, 0.1)",
      belowLineFillColorGrowingBottom: "rgba(16, 185, 129, 0)",
      belowLineFillColorFallingBottom: "rgba(239, 68, 68, 0)",
      symbolActiveColor: "rgba(59, 130, 246, 0.15)",
      tabs: [
        {
          title: "Indices",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "NASDAQ 100" },
            { s: "FOREXCOM:DJI",    d: "Dow Jones" },
            { s: "NASDAQ:NDX",      d: "NASDAQ Composite" },
            { s: "AMEX:IWM",        d: "Russell 2000" },
          ],
          originalTitle: "Indices",
        },
        {
          title: "Mega-Cap",
          symbols: [
            { s: "NASDAQ:AAPL",  d: "Apple" },
            { s: "NASDAQ:MSFT",  d: "Microsoft" },
            { s: "NASDAQ:NVDA",  d: "NVIDIA" },
            { s: "NASDAQ:GOOGL", d: "Alphabet" },
            { s: "NASDAQ:AMZN",  d: "Amazon" },
            { s: "NASDAQ:META",  d: "Meta" },
          ],
          originalTitle: "Mega-Cap",
        },
        {
          title: "Sectors",
          symbols: [
            { s: "AMEX:XLK",  d: "Technology" },
            { s: "AMEX:XLF",  d: "Financials" },
            { s: "AMEX:XLV",  d: "Healthcare" },
            { s: "AMEX:XLE",  d: "Energy" },
            { s: "AMEX:XLI",  d: "Industrials" },
            { s: "AMEX:XLC",  d: "Comm. Services" },
          ],
          originalTitle: "Sectors",
        },
      ],
    });
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full"
      style={{ height: 500 }}
    />
  );
}
