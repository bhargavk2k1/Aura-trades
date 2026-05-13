import { formatCurrency, formatCompact } from "@/lib/utils";
import type { StockDetail } from "@/types/market";

export function StockStats({ stock }: { stock: StockDetail }) {
  const stats = [
    { label: "Open",       value: formatCurrency(stock.open) },
    { label: "High",       value: formatCurrency(stock.high) },
    { label: "Low",        value: formatCurrency(stock.low) },
    { label: "Prev Close", value: formatCurrency(stock.prevClose) },
    { label: "Volume",     value: formatCompact(stock.volume) },
  ];

  return (
    <div className="border border-gray-200 rounded p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Today&apos;s Stats
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
