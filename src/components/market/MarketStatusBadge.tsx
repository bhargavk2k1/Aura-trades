import { isMarketOpen } from "@/lib/utils";

export function MarketStatusBadge() {
  const open = isMarketOpen();
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${open ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
      {open ? "Market Open" : "Market Closed"}
    </span>
  );
}
