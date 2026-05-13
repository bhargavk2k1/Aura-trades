import Link from "next/link";
import { getPositions } from "@/lib/alpaca/positions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import { redirect } from "next/navigation";

export const revalidate = 30;

export default async function PortfolioPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userAccount = await prisma.userAccount.findUnique({ where: { userId: session.sub } });
  const cashBalance = userAccount?.cashBalance ?? 0;
  const available   = cashBalance - (userAccount?.reservedCash ?? 0);

  let positions: {
    symbol: string; qty: number; avgEntryPrice: number; currentPrice: number;
    marketValue: number; unrealizedPl: number; unrealizedPlPct: number;
  }[] = [];

  try {
    const pos = await getPositions("live");
    positions = pos.map((p) => ({
      symbol:          p.symbol,
      qty:             parseFloat(p.qty),
      avgEntryPrice:   parseFloat(p.avg_entry_price),
      currentPrice:    parseFloat(p.current_price),
      marketValue:     parseFloat(p.market_value),
      unrealizedPl:    parseFloat(p.unrealized_pl),
      unrealizedPlPct: parseFloat(p.unrealized_plpc) * 100
    }));
  } catch {}

  const totalInvested = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalPnl      = positions.reduce((sum, p) => sum + p.unrealizedPl, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Portfolio</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Cash Balance",  value: formatCurrency(cashBalance) },
          { label: "Invested",      value: formatCurrency(totalInvested) },
          { label: "Available",     value: formatCurrency(available) },
          { label: "Unrealized P&L", value: formatCurrency(totalPnl), color: gainLossColor(totalPnl) }
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-gray-200 rounded p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums ${color ?? "text-gray-900"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Holdings */}
      {positions.length === 0 ? (
        <div className="border border-gray-200 rounded p-10 text-center">
          <p className="text-gray-400 text-sm">No open positions.</p>
          <Link href="/stocks" className="mt-3 inline-block text-gray-700 underline text-sm hover:text-gray-900">
            Browse stocks
          </Link>
        </div>
      ) : (
        <div className="border border-gray-200 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium">Symbol</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Avg Cost</th>
                  <th className="px-4 py-3 text-right font-medium">Current</th>
                  <th className="px-4 py-3 text-right font-medium">Market Value</th>
                  <th className="px-4 py-3 text-right font-medium">P&L</th>
                  <th className="px-4 py-3 text-right font-medium">P&L %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {positions.map((p) => (
                  <tr key={p.symbol} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <Link href={`/stocks/${p.symbol}`} className="font-bold text-gray-900 hover:underline">
                        {p.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{p.qty}</td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{formatCurrency(p.avgEntryPrice)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium tabular-nums">{formatCurrency(p.currentPrice)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{formatCurrency(p.marketValue)}</td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${gainLossColor(p.unrealizedPl)}`}>
                      {p.unrealizedPl >= 0 ? "+" : ""}{formatCurrency(p.unrealizedPl)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${gainLossColor(p.unrealizedPlPct)}`}>
                      {formatPercent(p.unrealizedPlPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
