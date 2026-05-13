import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import type { IndexData } from "@/types/market";

export function IndexCard({ data }: { data: IndexData }) {
  const isGain = data.changePercent >= 0;
  return (
    <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs text-gray-400">{data.label}</p>
          <p className="text-sm font-semibold text-gray-300">{data.symbol}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${isGain ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
          {formatPercent(data.changePercent)}
        </span>
      </div>
      <p className="text-2xl font-bold text-white mt-2">{formatCurrency(data.price)}</p>
      <p className={`text-sm mt-0.5 ${gainLossColor(data.change)}`}>
        {data.change >= 0 ? "+" : ""}{formatCurrency(data.change)}
      </p>
    </div>
  );
}
