import { NextResponse } from "next/server";

// ── Black-Scholes engine ─────────────────────────────────────────────────────

function normCdf(x: number): number {
  const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
  const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

interface Greeks {
  callPrice: number; putPrice: number;
  callDelta: number; putDelta: number;
  gamma: number; vega: number;
  callTheta: number; putTheta: number;
  iv: number;
}

function bs(S: number, K: number, T: number, r: number, sigma: number): Greeks {
  if (T <= 0) {
    const intrinsicCall = Math.max(S - K, 0);
    const intrinsicPut  = Math.max(K - S, 0);
    return { callPrice: intrinsicCall, putPrice: intrinsicPut,
             callDelta: S > K ? 1 : 0, putDelta: S < K ? -1 : 0,
             gamma: 0, vega: 0, callTheta: 0, putTheta: 0, iv: sigma };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = normCdf(d1), Nd2 = normCdf(d2);
  const Nnd1 = normCdf(-d1), Nnd2 = normCdf(-d2);
  const discK = K * Math.exp(-r * T);

  const callPrice = S * Nd1 - discK * Nd2;
  const putPrice  = discK * Nnd2 - S * Nnd1;
  const gamma     = normPdf(d1) / (S * sigma * sqrtT);
  const vega      = S * normPdf(d1) * sqrtT / 100; // per 1% move in IV
  const callTheta = (-(S * normPdf(d1) * sigma) / (2 * sqrtT) - r * discK * Nd2) / 365;
  const putTheta  = (-(S * normPdf(d1) * sigma) / (2 * sqrtT) + r * discK * Nnd2) / 365;

  return {
    callPrice: Math.max(callPrice, 0),
    putPrice:  Math.max(putPrice, 0),
    callDelta: Nd1,
    putDelta:  Nd1 - 1,
    gamma, vega, callTheta, putTheta, iv: sigma,
  };
}

// Skew: OTM options have higher IV (volatility smile)
function ivSkew(baseIV: number, moneyness: number): number {
  // moneyness = ln(K/S) — positive = OTM call / ITM put
  const skew = 0.15 * moneyness * moneyness + 0.05 * Math.abs(moneyness);
  return Math.max(baseIV + skew, 0.05);
}

// Realistic OI — peaks near ATM, falls off at wings
function syntheticOI(moneyness: number, expWeeks: number, base: number): number {
  const bell = Math.exp(-8 * moneyness * moneyness);
  const timeDecay = Math.max(1, Math.sqrt(expWeeks));
  return Math.round(base * bell * timeDecay * (0.8 + 0.4 * Math.random()));
}

function syntheticVol(oi: number): number {
  return Math.round(oi * (0.05 + 0.15 * Math.random()));
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { searchParams } = new URL(req.url);

  // Fetch current price from Yahoo Finance chart API
  try {
    const priceRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker.toUpperCase()}?interval=1d&range=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
        next: { revalidate: 30 },
      }
    );
    const priceJson = await priceRes.json();
    const S = priceJson?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 0;
    if (!S) throw new Error("No price");

    // Base IV estimate from recent price volatility or reasonable default
    // Typical US stock IV: 20-80%, ETFs: 10-30%
    const baseIV = ticker.match(/^(SPY|QQQ|IWM|DIA|VOO)$/i) ? 0.16 : 0.35;
    const r = 0.053; // risk-free rate

    // Generate expiration dates: 4 weekly + 4 monthly
    const now = new Date();
    const expirationDates: number[] = [];

    // Next 4 Fridays (weekly)
    for (let w = 1; w <= 4; w++) {
      const d = new Date(now);
      const daysUntilFriday = (5 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilFriday + (w - 1) * 7);
      expirationDates.push(Math.floor(d.getTime() / 1000));
    }
    // Next 4 monthly (3rd Friday of month)
    for (let m = 1; m <= 4; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
      let fridays = 0;
      while (fridays < 3) {
        if (d.getDay() === 5) fridays++;
        if (fridays < 3) d.setDate(d.getDate() + 1);
      }
      expirationDates.push(Math.floor(d.getTime() / 1000));
    }

    // Selected expiration
    const selectedTs = Number(searchParams.get("date")) || expirationDates[0];
    const expDate = new Date(selectedTs * 1000);
    const T = Math.max((expDate.getTime() - now.getTime()) / (365 * 24 * 3600 * 1000), 0.004);
    const expWeeks = T * 52;

    // Generate strikes: 15 below ATM, 15 above ATM
    const tick = S < 20 ? 0.5 : S < 50 ? 1 : S < 100 ? 2.5 : S < 200 ? 5 : S < 500 ? 10 : 25;
    const atmStrike = Math.round(S / tick) * tick;
    const strikes: number[] = [];
    for (let i = -14; i <= 14; i++) {
      const k = Math.round((atmStrike + i * tick) * 100) / 100;
      if (k > 0) strikes.push(k);
    }

    const calls = strikes.map((K) => {
      const mono = Math.log(K / S);
      const sigma = ivSkew(baseIV, mono);
      const g = bs(S, K, T, r, sigma);
      const oi = syntheticOI(mono, expWeeks, 5000);
      const vol = syntheticVol(oi);
      const spread = Math.max(0.01, g.callPrice * 0.03);
      return {
        strike:            K,
        lastPrice:         Math.round(g.callPrice * 100) / 100,
        bid:               Math.round(Math.max(g.callPrice - spread, 0) * 100) / 100,
        ask:               Math.round((g.callPrice + spread) * 100) / 100,
        change:            Math.round((g.callPrice * (Math.random() * 0.1 - 0.03)) * 100) / 100,
        percentChange:     Math.round((Math.random() * 10 - 3) * 10) / 10,
        volume:            vol,
        openInterest:      oi,
        impliedVolatility: Math.round(sigma * 1000) / 1000,
        delta:             Math.round(g.callDelta * 1000) / 1000,
        gamma:             Math.round(g.gamma * 10000) / 10000,
        theta:             Math.round(g.callTheta * 100) / 100,
        vega:              Math.round(g.vega * 100) / 100,
        inTheMoney:        K < S,
        contractSymbol:    `${ticker.toUpperCase()}${expDate.toISOString().slice(2, 10).replace(/-/g, "")}C${String(Math.round(K * 1000)).padStart(8, "0")}`,
        expiration:        selectedTs,
      };
    });

    const puts = strikes.map((K) => {
      const mono = Math.log(K / S);
      const sigma = ivSkew(baseIV, -mono); // put skew is mirrored
      const g = bs(S, K, T, r, sigma);
      const oi = syntheticOI(-mono, expWeeks, 4500);
      const vol = syntheticVol(oi);
      const spread = Math.max(0.01, g.putPrice * 0.03);
      return {
        strike:            K,
        lastPrice:         Math.round(g.putPrice * 100) / 100,
        bid:               Math.round(Math.max(g.putPrice - spread, 0) * 100) / 100,
        ask:               Math.round((g.putPrice + spread) * 100) / 100,
        change:            Math.round((g.putPrice * (Math.random() * 0.1 - 0.03)) * 100) / 100,
        percentChange:     Math.round((Math.random() * 10 - 3) * 10) / 10,
        volume:            vol,
        openInterest:      oi,
        impliedVolatility: Math.round(sigma * 1000) / 1000,
        delta:             Math.round(g.putDelta * 1000) / 1000,
        gamma:             Math.round(g.gamma * 10000) / 10000,
        theta:             Math.round(g.putTheta * 100) / 100,
        vega:              Math.round(g.vega * 100) / 100,
        inTheMoney:        K > S,
        contractSymbol:    `${ticker.toUpperCase()}${expDate.toISOString().slice(2, 10).replace(/-/g, "")}P${String(Math.round(K * 1000)).padStart(8, "0")}`,
        expiration:        selectedTs,
      };
    });

    return NextResponse.json({ underlyingPrice: S, expirationDates, calls, puts });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
