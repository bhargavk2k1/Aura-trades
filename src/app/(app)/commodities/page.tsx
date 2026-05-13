import Link from "next/link";
import { getQuotes, quoteToLivePrice } from "@/lib/finnhub/market";
import { COMMODITIES } from "@/lib/commodities";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";

export const revalidate = 15;

export default async function CommoditiesPage() {
  const symbols = COMMODITIES.map(c => c.symbol);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotes: any  = await getQuotes(symbols).catch(() => ({}));

  const prices = COMMODITIES.map(c => {
    const q = quotes[c.symbol];
    if (!q) return { symbol: c.symbol, price: 0, change: 0, changePercent: 0, volume: 0 };
    const raw = quoteToLivePrice(c.symbol, q);
    const m = c.priceMultiplier;
    return { ...raw, price: raw.price * m, change: raw.change * m };
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Commodities</h1>
        <p className="text-sm text-gray-400 mt-0.5">Trade Gold, Silver, and Crude Oil via ETF proxies — real-time charts, market depth, and instant orders.</p>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div className="text-xs text-amber-800">
          <p className="font-semibold mb-0.5">Trading via ETF proxies</p>
          <p>Commodity positions are held through exchange-traded funds — <strong>GLD</strong> (Gold), <strong>SLV</strong> (Silver), <strong>USO</strong> (Crude Oil) — which closely track spot prices. Charts show the underlying commodity price.</p>
        </div>
      </div>

      {/* Commodity cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COMMODITIES.map((c, i) => {
          const p = prices[i];
          const up = p.changePercent >= 0;
          return (
            <Link key={c.slug} href={`/commodities/${c.slug}`}
              className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-300 transition-all">
              {/* Color accent top bar */}
              <div className={`h-1.5 w-full ${c.slug === "gold" ? "bg-yellow-400" : c.slug === "silver" ? "bg-gray-400" : "bg-stone-500"}`}/>
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{c.icon}</span>
                    <div>
                      <p className="text-base font-bold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.unit}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {formatPercent(p.changePercent)}
                  </span>
                </div>

                <div>
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">
                    {p.price > 0 ? formatCurrency(p.price) : "—"}
                  </p>
                  <p className={`text-sm font-medium tabular-nums mt-0.5 ${gainLossColor(p.change)}`}>
                    {up ? "▲" : "▼"} {formatCurrency(Math.abs(p.change))} today
                  </p>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{c.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">ETF: <span className="font-semibold text-gray-700">{c.symbol}</span></span>
                  <span className="text-xs font-semibold text-gray-900 group-hover:underline">Trade →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Why commodities */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Why trade commodities?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
              title: "Inflation hedge", body: "Gold and silver have historically preserved purchasing power during inflationary periods." },
            { icon: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16",
              title: "Diversification", body: "Commodities often move independently of stocks and bonds, reducing overall portfolio risk." },
            { icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
              title: "Global demand", body: "Oil and industrial metals are driven by real-world supply/demand from the global economy." },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <path d={icon}/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
