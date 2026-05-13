export interface Commodity {
  slug:            string;
  name:            string;
  symbol:          string;   // ETF ticker used for trading & price fetch
  tvSymbol:        string;   // TradingView full symbol for the chart
  unit:            string;
  description:     string;
  color:           string;
  textColor:       string;
  icon:            string;
  priceMultiplier: number;   // ETF price × multiplier = spot price
}

export const COMMODITIES: Commodity[] = [
  {
    slug:            "gold",
    name:            "Gold",
    symbol:          "GLD",
    tvSymbol:        "TVC:GOLD",
    unit:            "USD / troy oz",
    description:     "Gold is the world's premier safe-haven asset, a hedge against inflation and currency risk.",
    color:           "bg-yellow-50",
    textColor:       "text-yellow-700",
    icon:            "🟡",
    priceMultiplier: 10.87, // GLD ETF × 10.87 ≈ gold spot price (troy oz)
  },
  {
    slug:            "silver",
    name:            "Silver",
    symbol:          "SLV",
    tvSymbol:        "TVC:SILVER",
    unit:            "USD / troy oz",
    description:     "Silver serves dual roles as both a precious metal and an industrial commodity used in electronics and solar panels.",
    color:           "bg-gray-100",
    textColor:       "text-gray-700",
    icon:            "⚪",
    priceMultiplier: 1.07, // SLV ETF × 1.07 ≈ silver spot price (troy oz)
  },
  {
    slug:            "crude-oil",
    name:            "Crude Oil",
    symbol:          "USO",
    tvSymbol:        "TVC:USOIL",
    unit:            "USD / barrel (WTI)",
    description:     "West Texas Intermediate (WTI) crude oil is the benchmark for US oil prices, driven by OPEC decisions, geopolitics, and global demand.",
    color:           "bg-stone-100",
    textColor:       "text-stone-700",
    icon:            "🛢️",
    priceMultiplier: 0.71, // USO ETF × 0.71 ≈ WTI crude spot price (barrel)
  },
];

export function getCommodity(slug: string): Commodity | undefined {
  return COMMODITIES.find(c => c.slug === slug);
}
