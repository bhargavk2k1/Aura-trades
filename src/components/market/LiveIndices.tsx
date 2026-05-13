"use client";

import useSWR from "swr";
import { formatCurrency, formatPercent, gainLossColor } from "@/lib/utils";
import type { IndexData } from "@/types/market";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function IndexSkeleton() {
  return (
    <div className="border border-gray-200 rounded p-4 animate-pulse">
      <div className="h-3 w-20 bg-gray-100 rounded mb-3" />
      <div className="h-6 w-28 bg-gray-100 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-100 rounded" />
    </div>
  );
}

export function LiveIndices({ initial }: { initial: IndexData[] }) {
  const { data } = useSWR<IndexData[]>("/api/market/indices", fetcher, {
    fallbackData: initial,
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  const indices = data ?? initial;

  if (!indices.length) {
    return <>{[0, 1, 2].map((i) => <IndexSkeleton key={i} />)}</>;
  }

  return (
    <>
      {indices.map((idx) => {
        const up = idx.changePercent >= 0;
        return (
          <div key={idx.symbol} className="border border-gray-200 rounded p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400">{idx.symbol}</p>
                <p className="text-sm font-medium text-gray-700">{idx.label}</p>
              </div>
              <span className={`text-xs font-medium tabular-nums ${up ? "text-green-600" : "text-red-600"}`}>
                {formatPercent(idx.changePercent)}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{formatCurrency(idx.price)}</p>
            <p className={`text-xs mt-0.5 tabular-nums ${gainLossColor(idx.change)}`}>
              {idx.change >= 0 ? "+" : ""}{formatCurrency(idx.change)} today
            </p>
          </div>
        );
      })}
    </>
  );
}
