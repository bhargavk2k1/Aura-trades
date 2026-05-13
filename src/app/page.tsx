import Link from "next/link";
import { getQuotes, quotesToMovers } from "@/lib/finnhub/market";
import { POPULAR_TICKERS, INDEX_SYMBOLS, INDEX_LABELS } from "@/lib/constants";

export const revalidate = 15;

const HERO_SYMBOLS = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "TSLA", "AMZN", "JPM"];

const MOVER_POOL = [
  ...POPULAR_TICKERS,
  "AMD", "INTC", "NFLX", "PYPL", "COIN", "PLTR", "SNAP", "CVS", "WBA", "PFE",
];

const NAV_LINKS = [
  { label: "Stocks",       href: "/"             },
  { label: "ETFs & Funds", href: "/etfs-funds"   },
  { label: "Market News",  href: "/market-news"  },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctStr(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default async function LandingPage() {
  const empty: Record<string, import("@/lib/finnhub/market").FinnhubQuote> = {};
  const allLandingSymbols = [...new Set([...HERO_SYMBOLS, ...INDEX_SYMBOLS, ...MOVER_POOL])];
  const allQuotes = await getQuotes(allLandingSymbols).catch(() => empty);
  const { gainers, losers } = quotesToMovers(allQuotes, 5);

  const heroRows = HERO_SYMBOLS.map((sym) => {
    const q = allQuotes[sym];
    return { sym, price: q?.c ?? 0, chg: q?.d ?? 0, pct: q?.dp ?? 0 };
  }).filter((r) => r.price > 0);

  const indexRows = INDEX_SYMBOLS.map((sym) => ({
    sym,
    label: INDEX_LABELS[sym],
    price: allQuotes[sym]?.c  ?? 0,
    pct:   allQuotes[sym]?.dp ?? 0,
    up:    (allQuotes[sym]?.dp ?? 0) >= 0,
  })).filter((r) => r.price > 0);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      {/* ── Primary nav ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 md:px-10 py-3 gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-gray-900 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="text-base font-bold text-gray-900 hidden sm:block tracking-tight">Aura Trade</span>
          </Link>

          <div className="flex-1 max-w-sm">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search stocks, ETFs…"
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/login" className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition">
              Log in
            </Link>
            <Link href="/signup" className="px-4 py-1.5 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded font-medium transition">
              Open account
            </Link>
          </div>
        </div>

        {/* Secondary nav */}
        <div className="border-t border-gray-100 px-6 md:px-10 overflow-x-auto">
          <nav className="flex items-center gap-0 text-sm whitespace-nowrap">
            {NAV_LINKS.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 ${
                  i === 0
                    ? "text-gray-900 border-gray-900"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Index bar ── */}
      {indexRows.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 md:px-10 py-2 overflow-x-auto">
          <div className="flex items-center gap-8 text-xs whitespace-nowrap">
            {indexRows.map((idx) => (
              <div key={idx.sym} className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">{idx.label}</span>
                <span className="font-semibold text-gray-900">${fmt(idx.price)}</span>
                <span className={`font-medium ${idx.up ? "text-green-600" : "text-red-600"}`}>
                  {pctStr(idx.pct)}
                </span>
              </div>
            ))}
            <span className="text-gray-300 select-none">|</span>
            <span className="text-gray-400">Prices delayed 15 min</span>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="px-6 md:px-10 py-12 border-b border-gray-200">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

          {/* Left */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
              Trade US stocks<br />with your own broker
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-sm">
              Connect your Alpaca account, search 8,000+ US equities, place market and limit orders,
              and track your portfolio — all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mb-4 max-w-sm">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500 text-sm"
              />
              <Link
                href="/signup"
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded font-medium text-sm transition whitespace-nowrap"
              >
                Get started
              </Link>
            </div>
            <p className="text-xs text-gray-400">Free paper trading account · No credit card required</p>

            <div className="flex items-center gap-8 mt-10 pt-10 border-t border-gray-100">
              {[
                { value: "8,000+", label: "US stocks & ETFs" },
                { value: "$0",     label: "Paper trading commission" },
                { value: "15s",    label: "Price refresh interval" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — live stock table */}
          <div className="border border-gray-200 rounded overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">US Stocks</span>
              <span className="text-xs text-gray-400">Delayed 15 min</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Symbol</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Price</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Chg%</th>
                </tr>
              </thead>
              <tbody>
                {heroRows.length > 0 ? heroRows.map((s, i) => (
                  <tr
                    key={s.sym}
                    className={`hover:bg-gray-50 transition ${i < heroRows.length - 1 ? "border-b border-gray-100" : ""}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{s.sym}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-800 tabular-nums">${fmt(s.price)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${s.pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {pctStr(s.pct)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                      Market data unavailable
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <Link href="/signup" className="text-xs font-medium text-gray-700 hover:text-gray-900 transition">
                View all 8,000+ stocks →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Today's movers ── */}
      {(gainers.length > 0 || losers.length > 0) && (
        <section className="px-6 md:px-10 py-12 border-b border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Today&apos;s movers</h2>
              <p className="text-xs text-gray-400 mt-0.5">NYSE + NASDAQ · Prices delayed 15 min</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Gainers */}
              <div className="border border-gray-200 rounded overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2 bg-gray-50">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Top Gainers</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {gainers.map((s, i) => (
                      <tr key={s.symbol} className={`hover:bg-gray-50 transition ${i < gainers.length - 1 ? "border-b border-gray-100" : ""}`}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{s.symbol}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700 tabular-nums">${fmt(s.price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600 tabular-nums">{pctStr(s.changePercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Losers */}
              <div className="border border-gray-200 rounded overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2 bg-gray-50">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Top Losers</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {losers.map((s, i) => (
                      <tr key={s.symbol} className={`hover:bg-gray-50 transition ${i < losers.length - 1 ? "border-b border-gray-100" : ""}`}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{s.symbol}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700 tabular-nums">${fmt(s.price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600 tabular-nums">{pctStr(s.changePercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── What's included ── */}
      <section className="px-6 md:px-10 py-12 border-b border-gray-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8">What&apos;s included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-8">
            {[
              {
                title: "Stock screener",
                desc: "Search 8,000+ US equities by symbol or name. Filter by exchange — NYSE, NASDAQ, AMEX. Browse the full A–Z list with live prices.",
              },
              {
                title: "TradingView charts",
                desc: "Full Advanced Chart with candlesticks, drawing tools, and indicators. Multiple timeframes from 1 minute to 1 month.",
              },
              {
                title: "Market and limit orders",
                desc: "Place market and limit orders through your connected Alpaca account. Day and GTC time-in-force supported.",
              },
              {
                title: "Portfolio tracking",
                desc: "Live positions from Alpaca with unrealized P&L, average entry price, market value, and cost basis.",
              },
              {
                title: "Watchlist",
                desc: "Save stocks to a watchlist. Prices refresh every 15 seconds automatically.",
              },
              {
                title: "Paper trading",
                desc: "Start with $100,000 virtual cash. Deposit or withdraw virtual funds from Settings. Switch to a live Alpaca account when ready.",
              },
            ].map((f) => (
              <div key={f.title}>
                <p className="font-semibold text-gray-900 text-sm mb-1.5">{f.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-6 md:px-10 py-12 border-b border-gray-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Pricing</h2>
          <p className="text-sm text-gray-400 mb-8">
            Aura Trade charges nothing. Alpaca&apos;s own fee schedule applies to live brokerage accounts.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Aura Trade platform",   price: "$0",     note: "Always free to use" },
              { label: "Paper trading orders",   price: "$0",     note: "No real money involved" },
              { label: "Live orders via Alpaca", price: "Varies", note: "See alpaca.markets for details" },
            ].map((p) => (
              <div key={p.label} className="border border-gray-200 rounded p-5">
                <p className="text-xs text-gray-400 mb-2">{p.label}</p>
                <p className="text-3xl font-bold text-gray-900">{p.price}</p>
                <p className="text-xs text-gray-400 mt-2">{p.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 md:px-10 py-14 border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Open a free account</h2>
            <p className="text-sm text-gray-400 mt-1">
              Starts in paper trading mode. Connect your Alpaca API keys to go live.
            </p>
          </div>
          <Link
            href="/signup"
            className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded font-medium text-sm transition whitespace-nowrap"
          >
            Get started →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 md:px-10 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-gray-500 mb-10">
            {[
              { heading: "Platform", links: ["Dashboard", "Stocks", "Portfolio", "Orders", "Watchlist", "Settings"] },
              { heading: "Account",  links: ["Sign up", "Log in", "Paper Trading", "Connect Broker"] },
              { heading: "Legal",    links: ["Privacy Policy", "Terms of Use", "Disclaimer"] },
              { heading: "Data",     links: ["Alpaca Markets", "Finnhub", "TradingView"] },
            ].map((col) => (
              <div key={col.heading}>
                <p className="font-semibold text-gray-700 mb-3 text-xs uppercase tracking-wide">{col.heading}</p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <Link href="/signup" className="hover:text-gray-700 transition">{l}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <span className="font-bold text-gray-800 text-sm">Aura Trade</span>
            </div>
            <p className="text-xs text-gray-400 max-w-lg">
              Aura Trade is not a registered broker-dealer. Trading is executed through Alpaca Securities LLC,
              member FINRA/SIPC. Paper trading does not involve real money. Prices shown are delayed and for
              illustration only. Not financial advice.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
