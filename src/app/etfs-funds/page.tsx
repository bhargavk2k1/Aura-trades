import Link from "next/link";
import { getQuotes } from "@/lib/finnhub/market";

export const revalidate = 30;

const ETF_LIST = [
  { symbol: "SPY",  name: "SPDR S&P 500 ETF",           category: "Broad Market" },
  { symbol: "QQQ",  name: "Invesco NASDAQ 100 ETF",      category: "Broad Market" },
  { symbol: "VTI",  name: "Vanguard Total Market ETF",   category: "Broad Market" },
  { symbol: "IVV",  name: "iShares Core S&P 500 ETF",    category: "Broad Market" },
  { symbol: "VOO",  name: "Vanguard S&P 500 ETF",        category: "Broad Market" },
  { symbol: "DIA",  name: "SPDR Dow Jones ETF",          category: "Broad Market" },
  { symbol: "IWM",  name: "iShares Russell 2000 ETF",    category: "Small Cap"    },
  { symbol: "XLK",  name: "Technology Select SPDR",      category: "Sector"       },
  { symbol: "XLF",  name: "Financial Select SPDR",       category: "Sector"       },
  { symbol: "XLE",  name: "Energy Select SPDR",          category: "Sector"       },
  { symbol: "XLV",  name: "Health Care Select SPDR",     category: "Sector"       },
  { symbol: "ARKK", name: "ARK Innovation ETF",          category: "Thematic"     },
  { symbol: "GLD",  name: "SPDR Gold Shares",            category: "Commodity"    },
  { symbol: "SLV",  name: "iShares Silver Trust",        category: "Commodity"    },
  { symbol: "TLT",  name: "iShares 20+ Year Treasury",   category: "Bond"         },
  { symbol: "BND",  name: "Vanguard Total Bond Market",  category: "Bond"         },
];

const MUTUAL_FUND_LIST = [
  { symbol: "VFIAX", name: "Vanguard 500 Index Fund",        category: "Index"    },
  { symbol: "FXAIX", name: "Fidelity 500 Index Fund",        category: "Index"    },
  { symbol: "VTSAX", name: "Vanguard Total Stock Market",    category: "Index"    },
  { symbol: "FCNTX", name: "Fidelity Contrafund",            category: "Growth"   },
  { symbol: "AGTHX", name: "American Funds Growth Fund",     category: "Growth"   },
  { symbol: "VBTLX", name: "Vanguard Total Bond Market",     category: "Bond"     },
];

const CATEGORIES = ["All", "Broad Market", "Sector", "Thematic", "Commodity", "Bond", "Small Cap"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function EtfsFundsPage() {
  const etfSymbols = ETF_LIST.map(e => e.symbol);
  const quotes = await getQuotes(etfSymbols).catch(() => ({} as Record<string, { c: number; d: number; dp: number }>));

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 md:px-10 py-3 gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-gray-900 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="text-base font-bold text-gray-900 hidden sm:block">Aura Trade</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition">Log in</Link>
            <Link href="/signup" className="px-4 py-1.5 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded font-medium transition">Open account</Link>
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 md:px-10 overflow-x-auto">
          <nav className="flex items-center gap-0 text-sm whitespace-nowrap">
            {[{ label: "Stocks", href: "/" }, { label: "ETFs & Funds", href: "/etfs-funds" }, { label: "Market News", href: "/market-news" }].map((item, i) => (
              <Link key={item.label} href={item.href}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 ${i === 1 ? "text-gray-900 border-gray-900" : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"}`}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-12">

        {/* Hero */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ETFs & Mutual Funds</h1>
          <p className="text-gray-500 text-sm">Browse and trade exchange-traded funds and mutual funds. <Link href="/signup" className="text-gray-900 font-medium underline">Create an account</Link> to start trading.</p>
        </div>

        {/* Login prompt banner */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Ready to invest?</p>
            <p className="text-xs text-gray-500 mt-0.5">Log in or create a free account to buy and sell ETFs & funds.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/login" className="px-4 py-2 text-sm border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition">Log in</Link>
            <Link href="/signup" className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition">Open account</Link>
          </div>
        </div>

        {/* ETFs section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Exchange-Traded Funds (ETFs)</h2>
            <span className="text-xs text-gray-400">Prices delayed 15 min</span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Name</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Change</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ETF_LIST.map((etf, i) => {
                  const q = quotes[etf.symbol];
                  const price = q?.c ?? 0;
                  const chg = q?.d ?? 0;
                  const pct = q?.dp ?? 0;
                  const up = pct >= 0;
                  return (
                    <tr key={etf.symbol} className={`hover:bg-gray-50 transition ${i < ETF_LIST.length - 1 ? "border-b border-gray-100" : ""}`}>
                      <td className="px-4 py-3 font-bold text-gray-900">{etf.symbol}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{etf.name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{etf.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-gray-900">
                        {price > 0 ? `$${fmt(price)}` : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${up ? "text-green-600" : "text-red-600"}`}>
                        {price > 0 ? `${up ? "+" : ""}${pct.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href="/signup"
                          className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition">
                          Trade
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mutual Funds section */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Mutual Funds</h2>
            <p className="text-xs text-gray-400 mt-0.5">Mutual fund prices update once daily after market close (NAV)</p>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Name</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {MUTUAL_FUND_LIST.map((fund, i) => (
                  <tr key={fund.symbol} className={`hover:bg-gray-50 transition ${i < MUTUAL_FUND_LIST.length - 1 ? "border-b border-gray-100" : ""}`}>
                    <td className="px-4 py-3 font-bold text-gray-900">{fund.symbol}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{fund.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{fund.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href="/signup"
                        className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition">
                        Invest
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Difference explainer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: "ETFs", color: "border-l-4 border-green-500", points: ["Trade like stocks throughout the day", "Low expense ratios (typically 0.03%–0.75%)", "No minimum investment beyond one share", "Instant diversification across hundreds of stocks"] },
            { title: "Mutual Funds", color: "border-l-4 border-blue-500", points: ["Price set once daily at market close (NAV)", "Often require a minimum investment ($1,000+)", "Managed actively or passively by a fund manager", "Available through brokerage or direct from fund company"] },
          ].map(item => (
            <div key={item.title} className={`bg-gray-50 rounded-xl p-5 ${item.color}`}>
              <p className="font-bold text-gray-900 mb-3">{item.title}</p>
              <ul className="space-y-2">
                {item.points.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gray-900 text-white rounded-2xl px-8 py-10 text-center">
          <h2 className="text-2xl font-bold mb-2">Start investing today</h2>
          <p className="text-gray-400 text-sm mb-6">Open a free paper trading account. No real money required to get started.</p>
          <Link href="/signup" className="inline-block px-8 py-3 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-100 transition">
            Open free account →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 md:px-10 py-6 mt-10">
        <p className="text-xs text-gray-400 text-center max-w-2xl mx-auto">
          Aura Trade is not a registered broker-dealer. Trading is executed through Alpaca Securities LLC, member FINRA/SIPC.
          Prices shown are delayed and for illustration only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
