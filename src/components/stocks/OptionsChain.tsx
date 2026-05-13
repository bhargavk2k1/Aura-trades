"use client";

import { useState, useEffect, useCallback } from "react";

interface OptionContract {
  strike: number; lastPrice: number; bid: number; ask: number;
  change: number; percentChange: number; volume: number; openInterest: number;
  impliedVolatility: number; delta: number; gamma: number; theta: number; vega: number;
  inTheMoney: boolean; contractSymbol: string; expiration: number;
}
interface OptionsData {
  underlyingPrice: number; expirationDates: number[];
  calls: OptionContract[]; puts: OptionContract[];
}
type ViewMode = "Calls" | "Both" | "Puts";

const f = (n: number, d = 2) => n == null || isNaN(n) ? "—" : n.toFixed(d);
const fv = (n: number) => !n ? "—" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : String(n);
const fiv = (n: number) => !n ? "—" : (n * 100).toFixed(1) + "%";
const fExp = (ts: number) => new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function Skeleton() {
  return <div className="space-y-1 p-4">{Array.from({length:12}).map((_,i)=><div key={i} className="h-7 bg-gray-100 rounded animate-pulse"/>)}</div>;
}

export function OptionsChain({ ticker, currentPrice }: { ticker: string; currentPrice: number }) {
  const [data, setData]               = useState<OptionsData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [view, setView]               = useState<ViewMode>("Both");
  const [orderModal, setOrderModal]   = useState<{ type: "call"|"put"; side: "buy"|"sell"; contract: OptionContract } | null>(null);

  const load = useCallback(async (date?: number | null) => {
    setLoading(true); setError(null);
    try {
      const url = date ? `/api/stocks/${ticker}/options?date=${date}` : `/api/stocks/${ticker}/options`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setData(json);
      if (!date && json.expirationDates?.[0]) setSelectedDate(json.expirationDates[0]);
    } catch(e) { setError(String(e)); } finally { setLoading(false); }
  }, [ticker]);

  useEffect(() => { load(null); }, [load]);

  const underlying = data?.underlyingPrice ?? currentPrice;
  const strikes = Array.from(new Set([...(data?.calls.map(c=>c.strike)??[]), ...(data?.puts.map(p=>p.strike)??[])])).sort((a,b)=>a-b);
  const byStrikeC = Object.fromEntries((data?.calls??[]).map(c=>[c.strike,c]));
  const byStrikeP = Object.fromEntries((data?.puts??[]).map(p=>[p.strike,p]));
  const isAtm = (k: number) => Math.abs(k - underlying) / underlying <= 0.015;

  return (
    <div className="border border-gray-200 rounded bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Options Chain</h2>
          <span className="text-xs text-gray-500">Underlying <span className="font-semibold text-gray-900">${underlying.toFixed(2)}</span></span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {data && data.expirationDates.length > 0 && (
            <select
              value={selectedDate ?? ""}
              onChange={e => { const d = Number(e.target.value); setSelectedDate(d); load(d); }}
              className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-gray-400 bg-white"
            >
              {data.expirationDates.map(ts => <option key={ts} value={ts}>{fExp(ts)}</option>)}
            </select>
          )}
          <div className="flex border border-gray-200 rounded overflow-hidden">
            {(["Calls","Both","Puts"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium transition ${view===v ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? <Skeleton/> : error ? (
        <div className="p-8 text-center"><p className="text-sm text-red-600">{error}</p></div>
      ) : strikes.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-400">No data</div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[520px]">

          {/* ── BOTH view ── */}
          {view === "Both" && (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-green-50 border-b border-gray-200">
                  <th colSpan={7} className="px-2 py-1.5 text-center text-green-700 font-semibold text-xs tracking-wide border-r border-gray-200">CALLS</th>
                  <th className="px-3 py-1.5 text-center text-gray-900 font-bold text-xs bg-gray-100 border-x border-gray-300">STRIKE</th>
                  <th colSpan={7} className="px-2 py-1.5 text-center text-red-700 font-semibold text-xs tracking-wide border-l border-gray-200 bg-red-50">PUTS</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                  <th className="px-2 py-1.5 text-right">Delta</th>
                  <th className="px-2 py-1.5 text-right">IV</th>
                  <th className="px-2 py-1.5 text-right">OI</th>
                  <th className="px-2 py-1.5 text-right">Vol</th>
                  <th className="px-2 py-1.5 text-right">LTP</th>
                  <th className="px-2 py-1.5 text-right">Bid</th>
                  <th className="px-2 py-1.5 text-right border-r border-gray-200">Ask</th>
                  <th className="px-3 py-1.5 text-center bg-gray-100 border-x border-gray-300 font-bold text-gray-700">—</th>
                  <th className="px-2 py-1.5 text-left border-l border-gray-200">Bid</th>
                  <th className="px-2 py-1.5 text-left">Ask</th>
                  <th className="px-2 py-1.5 text-left">LTP</th>
                  <th className="px-2 py-1.5 text-left">Vol</th>
                  <th className="px-2 py-1.5 text-left">OI</th>
                  <th className="px-2 py-1.5 text-left">IV</th>
                  <th className="px-2 py-1.5 text-left">Delta</th>
                </tr>
              </thead>
              <tbody>
                {strikes.map(strike => {
                  const c = byStrikeC[strike], p = byStrikeP[strike];
                  const atm = isAtm(strike);
                  return (
                    <tr key={strike} className={`border-b border-gray-100 hover:brightness-95 transition-all ${atm ? "ring-1 ring-inset ring-gray-400" : ""}`}>
                      {/* Calls */}
                      <td className={`px-2 py-1.5 text-right tabular-nums ${c?.inTheMoney?"bg-green-50":""}`}>{c?f(c.delta,3):"—"}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${c?.inTheMoney?"bg-green-50":""}`}>{c?fiv(c.impliedVolatility):"—"}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${c?.inTheMoney?"bg-green-50":""}`}>{c?fv(c.openInterest):"—"}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${c?.inTheMoney?"bg-green-50":""}`}>{c?fv(c.volume):"—"}</td>
                      <td className={`px-2 py-1.5 text-right font-semibold tabular-nums ${c?.inTheMoney?"bg-green-50 text-green-700":"text-gray-800"}`}>{c?f(c.lastPrice):"—"}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${c?.inTheMoney?"bg-green-50":""}`}>{c?f(c.bid):"—"}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums border-r border-gray-200 ${c?.inTheMoney?"bg-green-50":""}`}>
                        {c && <button onClick={()=>setOrderModal({type:"call",side:"buy",contract:c})} className="hover:text-green-700 font-medium">{f(c.ask)}</button>}
                        {!c && "—"}
                      </td>
                      {/* Strike */}
                      <td className={`px-3 py-1.5 text-center font-bold border-x border-gray-300 bg-gray-100 whitespace-nowrap ${atm?"text-gray-900":"text-gray-500"}`}>
                        {strike}{atm&&<span className="ml-1 text-[10px] text-gray-400 font-normal">ATM</span>}
                      </td>
                      {/* Puts */}
                      <td className={`px-2 py-1.5 text-left tabular-nums border-l border-gray-200 ${p?.inTheMoney?"bg-red-50":""}`}>
                        {p && <button onClick={()=>setOrderModal({type:"put",side:"buy",contract:p})} className="hover:text-red-700 font-medium">{f(p.bid)}</button>}
                        {!p && "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-left tabular-nums ${p?.inTheMoney?"bg-red-50":""}`}>{p?f(p.ask):"—"}</td>
                      <td className={`px-2 py-1.5 text-left font-semibold tabular-nums ${p?.inTheMoney?"bg-red-50 text-red-700":"text-gray-800"}`}>{p?f(p.lastPrice):"—"}</td>
                      <td className={`px-2 py-1.5 text-left tabular-nums ${p?.inTheMoney?"bg-red-50":""}`}>{p?fv(p.volume):"—"}</td>
                      <td className={`px-2 py-1.5 text-left tabular-nums ${p?.inTheMoney?"bg-red-50":""}`}>{p?fv(p.openInterest):"—"}</td>
                      <td className={`px-2 py-1.5 text-left tabular-nums ${p?.inTheMoney?"bg-red-50":""}`}>{p?fiv(p.impliedVolatility):"—"}</td>
                      <td className={`px-2 py-1.5 text-left tabular-nums ${p?.inTheMoney?"bg-red-50":""}`}>{p?f(p.delta,3):"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ── CALLS / PUTS single view ── */}
          {(view === "Calls" || view === "Puts") && (() => {
            const list = view === "Calls" ? (data?.calls??[]) : (data?.puts??[]);
            const isCall = view === "Calls";
            return (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr className="text-gray-500 font-medium">
                    <th className="px-3 py-2 text-left">Strike</th>
                    <th className="px-3 py-2 text-right">LTP</th>
                    <th className="px-3 py-2 text-right">Bid</th>
                    <th className="px-3 py-2 text-right">Ask</th>
                    <th className="px-3 py-2 text-right">Chg%</th>
                    <th className="px-3 py-2 text-right">Vol</th>
                    <th className="px-3 py-2 text-right">OI</th>
                    <th className="px-3 py-2 text-right">IV</th>
                    <th className="px-3 py-2 text-right">Delta</th>
                    <th className="px-3 py-2 text-right">Gamma</th>
                    <th className="px-3 py-2 text-right">Theta</th>
                    <th className="px-3 py-2 text-right">Vega</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(opt => {
                    const atm = isAtm(opt.strike);
                    return (
                      <tr key={opt.contractSymbol}
                        className={`border-b border-gray-100 ${atm?"bg-yellow-50 font-semibold":opt.inTheMoney?(isCall?"bg-green-50":"bg-red-50"):""}`}>
                        <td className="px-3 py-1.5 font-bold text-gray-900">
                          {opt.strike}{atm&&<span className="ml-1 text-[10px] text-gray-400 font-normal">ATM</span>}
                        </td>
                        <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${isCall?"text-green-700":"text-red-700"}`}>{f(opt.lastPrice)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">{f(opt.bid)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">{f(opt.ask)}</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${opt.percentChange>=0?"text-green-600":"text-red-600"}`}>
                          {opt.percentChange>=0?"+":""}{f(opt.percentChange,1)}%
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">{fv(opt.volume)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">{fv(opt.openInterest)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">{fiv(opt.impliedVolatility)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{f(opt.delta,3)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{f(opt.gamma,4)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{f(opt.theta,3)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{f(opt.vega,3)}</td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={()=>setOrderModal({type:isCall?"call":"put",side:"buy",contract:opt})}
                              className="px-2 py-0.5 rounded text-xs bg-green-600 text-white hover:bg-green-700 font-medium">B</button>
                            <button onClick={()=>setOrderModal({type:isCall?"call":"put",side:"sell",contract:opt})}
                              className="px-2 py-0.5 rounded text-xs bg-red-600 text-white hover:bg-red-700 font-medium">S</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <p className="text-xs text-gray-400">Priced via Black-Scholes · Greeks included · ATM = ±1.5% · Click Ask/Bid to trade</p>
        <button onClick={()=>load(selectedDate)} className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-0.5">Refresh</button>
      </div>

      {/* Order modal */}
      {orderModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setOrderModal(null)}>
          <div className="bg-white rounded-lg border border-gray-200 p-5 w-full max-w-sm shadow-xl" onClick={e=>e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">
              {orderModal.side.toUpperCase()} {orderModal.type.toUpperCase()} — Strike ${orderModal.contract.strike}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{fExp(orderModal.contract.expiration)} · {orderModal.contract.contractSymbol}</p>
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              {[
                ["LTP",   f(orderModal.contract.lastPrice)],
                ["Bid",   f(orderModal.contract.bid)],
                ["Ask",   f(orderModal.contract.ask)],
                ["IV",    fiv(orderModal.contract.impliedVolatility)],
                ["Delta", f(orderModal.contract.delta,3)],
                ["Theta", f(orderModal.contract.theta,3)],
              ].map(([l,v])=>(
                <div key={l} className="flex justify-between border border-gray-100 rounded px-2 py-1">
                  <span className="text-gray-500">{l}</span><span className="font-medium text-gray-900">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
              Options trading requires KYC approval and sufficient margin. This is for informational purposes.
            </p>
            <div className="flex gap-2">
              <button onClick={()=>setOrderModal(null)} className="flex-1 py-2 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button className={`flex-1 py-2 rounded text-sm font-semibold text-white ${orderModal.side==="buy"?"bg-green-600 hover:bg-green-700":"bg-red-600 hover:bg-red-700"}`}>
                {orderModal.side==="buy"?"Buy":"Sell"} {orderModal.type}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
