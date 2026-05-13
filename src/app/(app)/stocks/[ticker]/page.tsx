import { notFound } from "next/navigation";
import { getQuote, quoteToDetail, searchSymbols } from "@/lib/finnhub/market";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATIC_SYMBOLS } from "@/lib/staticSymbols";
import { TradingTerminal } from "@/components/trading/TradingTerminal";

export const revalidate = 15;

interface Props { params: Promise<{ ticker: string }> }

export default async function StockDetailPage({ params }: Props) {
  const { ticker: raw } = await params;
  const ticker = raw.toUpperCase();

  let buyingPower = 0;
  let assetName = "";

  const quote = await getQuote(ticker).catch(() => null);
  if (!quote || quote.c === 0) notFound();

  const stock = quoteToDetail(ticker, quote);

  const staticEntry = STATIC_SYMBOLS.find((s) => s.symbol === ticker);
  const mic = staticEntry?.mic ?? "XNAS";
  assetName = staticEntry?.name ?? "";

  if (!assetName) {
    const results = await searchSymbols(ticker).catch(() => []);
    assetName = results.find((r) => r.symbol === ticker)?.name ?? "";
  }

  const session = await getSession();
  if (session) {
    const account = await prisma.userAccount.findUnique({ where: { userId: session.sub } });
    if (account) buyingPower = account.cashBalance - account.reservedCash;
  }

  return (
    <div className="-m-4 md:-m-6 -mb-20 md:-mb-6">
      <TradingTerminal
        ticker={ticker}
        mic={mic}
        stock={stock}
        assetName={assetName}
        buyingPower={buyingPower}
      />
    </div>
  );
}
