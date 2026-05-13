import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuote, quoteToDetail, searchSymbols } from "@/lib/finnhub/market";
import { STATIC_SYMBOLS } from "@/lib/staticSymbols";
import { StockHeader } from "@/components/stocks/StockHeader";
import { OptionsChain } from "@/components/stocks/OptionsChain";
import { MarketDepth } from "@/components/stocks/MarketDepth";

export const revalidate = 15;

interface Props {
  params: Promise<{ ticker: string }>;
}

export default async function FnOSymbolPage({ params }: Props) {
  const { ticker: raw } = await params;
  const ticker = raw.toUpperCase();

  const quote = await getQuote(ticker).catch(() => null);
  if (!quote || quote.c === 0) notFound();

  const stock = quoteToDetail(ticker, quote);

  const staticEntry = STATIC_SYMBOLS.find((s) => s.symbol === ticker);
  let assetName = staticEntry?.name ?? "";

  if (!assetName) {
    const results = await searchSymbols(ticker).catch(() => []);
    assetName = results.find((r) => r.symbol === ticker)?.name ?? "";
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/fno" className="hover:text-gray-700 transition">
          F&amp;O
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{ticker}</span>
      </nav>

      {/* Stock header */}
      <div className="border border-gray-200 rounded p-4 bg-white">
        <StockHeader stock={stock} name={assetName} />
      </div>

      {/* Main layout: options chain left, market depth right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Options Chain — full width on mobile, 2/3 on desktop */}
        <div className="lg:col-span-2">
          <OptionsChain ticker={ticker} currentPrice={stock.price} />
        </div>

        {/* Market Depth — full width on mobile, 1/3 on desktop */}
        <div className="space-y-4">
          <MarketDepth ticker={ticker} currentPrice={stock.price} />

          {/* Quick info card */}
          <div className="border border-gray-200 rounded p-4 bg-white space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">About Options</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <p>
                <span className="font-medium text-gray-900">Contract size:</span> Each contract
                represents 100 shares of the underlying.
              </p>
              <p>
                <span className="font-medium text-gray-900">Settlement:</span> US equity options
                settle the next business day after exercise.
              </p>
              <p>
                <span className="font-medium text-gray-900">Expiry:</span> Standard options expire
                on the third Friday of the listed month.
              </p>
              <p>
                <span className="font-medium text-gray-900">Note:</span> Aura Trade currently
                supports equity trading only. Options execution is not available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
