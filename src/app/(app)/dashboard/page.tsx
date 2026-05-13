import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuotes, quotesToMovers, quoteToLivePrice } from "@/lib/finnhub/market";
import { getIndexQuotes } from "@/lib/yahoo/indices";
import { POPULAR_TICKERS, INDEX_SYMBOLS, INDEX_LABELS } from "@/lib/constants";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { IndexData, LivePrice, Mover } from "@/types/market";

export const revalidate = 15;

const MOVER_POOL = [
  ...POPULAR_TICKERS,
  "AMD","INTC","NFLX","PYPL","SQ","SHOP","UBER","SNAP",
  "ROKU","CRWD","DDOG","NET","SNOW","PLTR","COIN",
];

async function fetchMarket() {
  const stockSymbols = [...new Set([...POPULAR_TICKERS.slice(0, 12), ...MOVER_POOL])];
  const [idxQuotes, stockQuotes] = await Promise.all([
    getIndexQuotes([...INDEX_SYMBOLS]).catch(() => ({} as Record<string, import("@/lib/yahoo/indices").YahooIndexQuote>)),
    getQuotes(stockSymbols),
  ]);

  const indices: IndexData[] = INDEX_SYMBOLS.map((sym) => {
    const q = idxQuotes[sym];
    if (!q || !q.price) return { symbol: sym, label: INDEX_LABELS[sym], price: 0, change: 0, changePercent: 0, volume: 0 };
    return { symbol: sym, label: INDEX_LABELS[sym], price: q.price, change: q.change, changePercent: q.changePercent, volume: 0 };
  });

  const trending: LivePrice[] = POPULAR_TICKERS.slice(0, 12).map((sym) => {
    const q = stockQuotes[sym];
    return q ? quoteToLivePrice(sym, q) : { symbol: sym, price: 0, change: 0, changePercent: 0, volume: 0 };
  });

  const { gainers, losers } = quotesToMovers(stockQuotes, 8);
  return { indices, trending, gainers, losers };
}

export default async function DashboardPage() {
  const keysConfigured = !!process.env.FINNHUB_API_KEY;

  const empty = {
    indices: INDEX_SYMBOLS.map((s) => ({ symbol: s, label: INDEX_LABELS[s], price: 0, change: 0, changePercent: 0, volume: 0 })),
    trending: [] as LivePrice[],
    gainers:  [] as Mover[],
    losers:   [] as Mover[],
  };

  const { indices, trending, gainers, losers } = keysConfigured
    ? await fetchMarket().catch(() => empty)
    : empty;

  // Portfolio / account data
  let cashBalance = 0;
  let userName = "";
  const session = await getSession();
  if (session) {
    userName = session.name ?? "";
    const account = await prisma.userAccount.findUnique({ where: { userId: session.sub } });
    if (account) cashBalance = account.cashBalance;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <DashboardClient
      indices={indices}
      trending={trending}
      gainers={gainers}
      losers={losers}
      cashBalance={cashBalance}
      userName={userName}
      greeting={greeting}
      keysConfigured={keysConfigured}
    />
  );
}
