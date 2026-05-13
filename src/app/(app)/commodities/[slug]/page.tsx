import { notFound } from "next/navigation";
import { getQuote, quoteToLivePrice } from "@/lib/finnhub/market";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCommodity } from "@/lib/commodities";
import { CommodityTerminal } from "@/components/commodities/CommodityTerminal";

export const revalidate = 15;

interface Props { params: Promise<{ slug: string }> }

export default async function CommodityPage({ params }: Props) {
  const { slug } = await params;
  const commodity = getCommodity(slug);
  if (!commodity) notFound();

  // Fetch ETF price and apply spot-price multiplier
  const quote = await getQuote(commodity.symbol).catch(() => null);
  const raw = quote
    ? quoteToLivePrice(commodity.symbol, quote)
    : { symbol: commodity.symbol, price: 0, change: 0, changePercent: 0, volume: 0 };
  const m = commodity.priceMultiplier;
  const price = { ...raw, price: raw.price * m, change: raw.change * m };

  let buyingPower = 0;
  const session = await getSession();
  if (session) {
    const account = await prisma.userAccount.findUnique({ where: { userId: session.sub } });
    if (account) buyingPower = account.cashBalance - account.reservedCash;
  }

  return (
    <div className="-m-4 md:-m-6 -mb-20 md:-mb-6">
      <CommodityTerminal
        commodity={commodity}
        initialPrice={{ price: price.price, change: price.change, changePercent: price.changePercent }}
        buyingPower={buyingPower}
      />
    </div>
  );
}
