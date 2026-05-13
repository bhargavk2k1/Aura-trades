import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import type { StockDetail } from "@/types/market";

export function StockHeader({ stock, name }: { stock: StockDetail; name?: string }) {
  const up = stock.change >= 0;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{stock.symbol}</h1>
        {name && <p className="text-gray-500 text-sm">{name}</p>}
      </div>
      <div className="flex items-baseline gap-3 mt-1.5">
        <span className="text-3xl font-bold text-gray-900 tabular-nums">{formatCurrency(stock.price)}</span>
        <span className={`text-base font-semibold tabular-nums ${gainLossColor(stock.change)}`}>
          {up ? "+" : ""}{formatCurrency(stock.change)}&nbsp;({formatPercent(stock.changePercent)})
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-1 tabular-nums">
        O:&nbsp;{formatCurrency(stock.open)}&ensp;
        H:&nbsp;{formatCurrency(stock.high)}&ensp;
        L:&nbsp;{formatCurrency(stock.low)}&ensp;
        Prev:&nbsp;{formatCurrency(stock.prevClose)}
      </p>
    </div>
  );
}
