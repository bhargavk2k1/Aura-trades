"use client";

import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { formatCurrency } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Transaction { id: string; type: string; amount: number; balanceAfter: number; status: string; createdAt: string; reference?: string }
interface BalanceData  { balance: number; reserved: number; available: number; transactions: Transaction[] }
interface SavedCard    { id: string; cardholderName: string; last4: string; cardType: string; expiryMonth: number; expiryYear: number; nickname: string }
interface BankAccount  { id: string; bankName: string; accountType: string; last4: string; status: string; nickname: string }

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripeReady = stripePublicKey && stripePublicKey !== "pk_test_REPLACE_ME";
const stripePromise = stripeReady ? loadStripe(stripePublicKey) : null;

const QUICK = [500, 1000, 5000, 10000, 25000];

function Icon({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d}/>
    </svg>
  );
}
function fmtDate(s: string) {
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Add Card Modal ────────────────────────────────────────────────────────────
function AddCardModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ cardholderName: "", cardNumber: "", expiryMonth: "", expiryYear: "", cvv: "", nickname: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function formatCardNumber(val: string) {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/account/cards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardholderName: form.cardholderName,
        cardNumber: form.cardNumber.replace(/\s/g, ""),
        expiryMonth: parseInt(form.expiryMonth),
        expiryYear: parseInt(form.expiryYear),
        cvv: form.cvv,
        nickname: form.nickname,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to add card."); return; }
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gray-900"/>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900">Add a Card</p>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <Icon d="M6 18L18 6M6 6l12 12"/>
            </button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Cardholder Name</label>
              <input required value={form.cardholderName} onChange={e => set("cardholderName", e.target.value)}
                placeholder="John Smith"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Card Number</label>
              <input required value={form.cardNumber}
                onChange={e => set("cardNumber", formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456" inputMode="numeric"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-gray-900 transition tracking-wider"/>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Month</label>
                <input required value={form.expiryMonth} onChange={e => set("expiryMonth", e.target.value)}
                  placeholder="MM" maxLength={2} inputMode="numeric"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-900 transition"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Year</label>
                <input required value={form.expiryYear} onChange={e => set("expiryYear", e.target.value)}
                  placeholder="YYYY" maxLength={4} inputMode="numeric"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-900 transition"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">CVV</label>
                <input required value={form.cvv} onChange={e => set("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="•••" inputMode="numeric"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-900 transition"/>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Nickname <span className="font-normal text-gray-400">(optional)</span></label>
              <input value={form.nickname} onChange={e => set("nickname", e.target.value)}
                placeholder="e.g. My Visa"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"/>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={12} className="text-green-600"/>
              <p className="text-[10px] text-gray-500">Card validated via Luhn algorithm. Not stored in plaintext.</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold disabled:opacity-40 transition">
              {loading ? "Adding…" : "Add Card"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Edit Card Modal ───────────────────────────────────────────────────────────
function EditCardModal({ card, onClose, onSaved }: {
  card: SavedCard; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    cardholderName: card.cardholderName,
    expiryMonth: String(card.expiryMonth),
    expiryYear: String(card.expiryYear),
    nickname: card.nickname,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch(`/api/account/cards/${card.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardholderName: form.cardholderName,
        expiryMonth: parseInt(form.expiryMonth),
        expiryYear: parseInt(form.expiryYear),
        nickname: form.nickname,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to update card."); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gray-900"/>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Edit Card</p>
              <p className="text-xs text-gray-400">{card.cardType.toUpperCase()} •••• {card.last4}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <Icon d="M6 18L18 6M6 6l12 12"/>
            </button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Cardholder Name</label>
              <input required value={form.cardholderName} onChange={e => set("cardholderName", e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Expiry Month</label>
                <input required value={form.expiryMonth} onChange={e => set("expiryMonth", e.target.value)}
                  placeholder="MM" maxLength={2} inputMode="numeric"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-900 transition"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Expiry Year</label>
                <input required value={form.expiryYear} onChange={e => set("expiryYear", e.target.value)}
                  placeholder="YYYY" maxLength={4} inputMode="numeric"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:border-gray-900 transition"/>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Nickname <span className="font-normal text-gray-400">(optional)</span></label>
              <input value={form.nickname} onChange={e => set("nickname", e.target.value)}
                placeholder="e.g. My Visa"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"/>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold disabled:opacity-40 transition">
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Add Bank Modal ────────────────────────────────────────────────────────────
function AddBankModal({ onClose, onAdded }: { onClose: () => void; onAdded: (demoAmounts?: [number, number]) => void }) {
  const [form, setForm] = useState({ bankName: "", accountType: "checking" as "checking"|"savings", accountNumber: "", routingNumber: "", nickname: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/account/banks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to add bank."); return; }
    onAdded(data.demoAmounts);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-1.5 w-full bg-blue-600"/>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Add Bank Account</p>
              <p className="text-xs text-gray-400 mt-0.5">Two micro-deposits will be sent to verify</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><Icon d="M6 18L18 6M6 6l12 12"/></button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Bank Name</label>
              <input required value={form.bankName} onChange={e => set("bankName", e.target.value)}
                placeholder="e.g. Chase, Bank of America"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Account Type</label>
              <div className="flex gap-2">
                {(["checking", "savings"] as const).map(t => (
                  <button key={t} type="button" onClick={() => set("accountType", t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition capitalize ${form.accountType === t ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Account Number</label>
              <input required value={form.accountNumber} onChange={e => set("accountNumber", e.target.value.replace(/\D/g, "").slice(0, 17))}
                placeholder="4–17 digits" inputMode="numeric"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-gray-900 transition"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Routing Number (ABA)</label>
              <input required value={form.routingNumber} onChange={e => set("routingNumber", e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="9 digits" inputMode="numeric"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-gray-900 transition"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Nickname <span className="font-normal text-gray-400">(optional)</span></label>
              <input value={form.nickname} onChange={e => set("nickname", e.target.value)}
                placeholder="e.g. My Chase Checking"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 transition"/>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
              Two small deposits (under $1 each) will be sent. Enter those amounts to verify your account.
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold disabled:opacity-40 transition">
              {loading ? "Adding…" : "Add Bank Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Verify Bank Modal ─────────────────────────────────────────────────────────
function VerifyBankModal({ bank, demoAmounts, onClose, onVerified }: {
  bank: BankAccount & { hasMicroDeposits?: boolean };
  demoAmounts?: [number, number];
  onClose: () => void;
  onVerified: () => void;
}) {
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch(`/api/account/banks/${bank.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount1: parseFloat(a1), amount2: parseFloat(a2) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Verification failed."); return; }
    onVerified();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-1.5 w-full bg-green-500"/>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Verify Bank Account</p>
              <p className="text-xs text-gray-400">{bank.bankName} •••• {bank.last4}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><Icon d="M6 18L18 6M6 6l12 12"/></button>
          </div>

          {demoAmounts && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-amber-700 mb-1">Demo Mode — your micro-deposit amounts:</p>
              <p className="text-lg font-bold text-amber-900 font-mono">${demoAmounts[0].toFixed(2)} &nbsp;&amp;&nbsp; ${demoAmounts[1].toFixed(2)}</p>
              <p className="text-[10px] text-amber-600 mt-1">In production these arrive in your bank within 1–2 business days</p>
            </div>
          )}

          {!demoAmounts && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
              Check your bank statement for two small deposits under $1.00 sent by Aura Trade. Enter the exact amounts below.
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[["First deposit", a1, setA1], ["Second deposit", a2, setA2]].map(([label, val, setter]) => (
                <div key={String(label)}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">{String(label)}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                    <input required type="number" step="0.01" min="0.01" max="0.99"
                      value={String(val)} onChange={e => (setter as (v: string) => void)(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-gray-900 transition"/>
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-40 transition">
              {loading ? "Verifying…" : "Verify Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── OTP input screen ──────────────────────────────────────────────────────────
function OtpScreen({ otpId, demoCode, email, purpose, amount, label, onSuccess, onCancel }: {
  otpId: string; demoCode?: string; email: string;
  purpose: "deposit"|"withdrawal"; amount: number; label: string;
  onSuccess: (newBalance: number) => void; onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  async function verify() {
    if (code.length !== 6) { setError("Enter the 6-digit OTP."); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/account/otp", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otpId, code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Verification failed."); return; }
    onSuccess(data.newBalance);
  }

  const isBuy = purpose === "deposit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Top bar */}
        <div className={`h-1.5 w-full ${isBuy ? "bg-green-500" : "bg-red-500"}`}/>
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isBuy ? "bg-green-50" : "bg-red-50"}`}>
              <Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                size={26} className={isBuy ? "text-green-600" : "text-red-600"}/>
            </div>
            <p className="text-base font-bold text-gray-900">Confirm {isBuy ? "Deposit" : "Withdrawal"}</p>
            <p className="text-sm text-gray-500">{formatCurrency(amount)} · {label}</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">OTP sent to</p>
            <p className="text-sm font-semibold text-gray-900">{email}</p>
            <p className="text-xs text-gray-400 mt-1">Valid for 10 minutes</p>
          </div>

          {/* Demo mode: show the OTP */}
          {demoCode && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-700 font-semibold mb-1">Demo Mode — your OTP:</p>
              <p className="text-2xl font-bold tracking-[0.4em] text-amber-900 font-mono">{demoCode}</p>
              <p className="text-[10px] text-amber-600 mt-1">In production this is sent via email/SMS</p>
            </div>
          )}

          {/* 6-digit OTP boxes */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2 text-center">Enter 6-digit OTP</label>
            <div className="flex gap-2 justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <input key={i} type="text" maxLength={1} inputMode="numeric"
                  value={code[i] ?? ""}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "");
                    const arr = code.split("");
                    arr[i] = val;
                    const next = arr.join("").slice(0, 6);
                    setCode(next);
                    if (val && i < 5) {
                      const inputs = document.querySelectorAll<HTMLInputElement>(".otp-input");
                      inputs[i + 1]?.focus();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === "Backspace" && !code[i] && i > 0) {
                      const inputs = document.querySelectorAll<HTMLInputElement>(".otp-input");
                      inputs[i - 1]?.focus();
                    }
                  }}
                  className="otp-input w-10 h-12 border-2 rounded-xl text-center text-lg font-bold font-mono focus:outline-none focus:border-gray-900 transition border-gray-200"
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600 text-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button onClick={verify} disabled={loading || code.length !== 6}
            className={`w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition
              ${isBuy ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
            {loading ? "Verifying…" : `Confirm ${isBuy ? "Deposit" : "Withdrawal"}`}
          </button>
          <button onClick={onCancel} className="w-full text-xs text-gray-400 hover:text-gray-700 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stripe card payment form ──────────────────────────────────────────────────
function StripePayForm({ amount, onSuccess, onCancel }: {
  amount: number; onSuccess: () => void; onCancel: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError("");

    const { error: stripeErr } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/funds?payment=success` },
      redirect: "if_required",
    });

    setLoading(false);
    if (stripeErr) { setError(stripeErr.message ?? "Payment failed."); return; }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm flex flex-col max-h-[90vh]">
        <div className="h-1.5 w-full bg-green-500 rounded-t-2xl sm:rounded-t-2xl shrink-0"/>
        {/* Sticky header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-bold text-gray-900">Pay via Card</p>
            <p className="text-xs text-gray-400">Deposit {formatCurrency(amount)} to Aura Trade</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 p-1">
            <Icon d="M6 18L18 6M6 6l12 12"/>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={13} className="text-green-600"/>
            <p className="text-xs text-green-700">Secured by Stripe · 3D Secure OTP if required by your bank</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <PaymentElement options={{ layout: "accordion" }}/>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            {/* Sticky pay button */}
            <div className="pt-2 pb-2">
              <button type="submit" disabled={!stripe || loading}
                className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-40 transition shadow-sm">
                {loading ? "Processing…" : `Pay ${formatCurrency(amount)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Step = "select" | "otp" | "stripe" | "done";
type Mode = "deposit" | "withdrawal";

export default function FundsPage() {
  const [data,     setData]     = useState<BalanceData | null>(null);
  const [cards,    setCards]    = useState<SavedCard[]>([]);
  const [banks,    setBanks]    = useState<BankAccount[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [mode,     setMode]     = useState<Mode>("deposit");
  const [method,   setMethod]   = useState<"card"|"bank">("card");
  const [selCard,  setSelCard]  = useState("");
  const [selBank,  setSelBank]  = useState("");
  const [amount,   setAmount]   = useState("");

  const [step,     setStep]     = useState<Step>("select");
  const [otpData,  setOtpData]  = useState<{ id: string; demoCode?: string; email: string } | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editCard, setEditCard] = useState<SavedCard | null>(null);
  const [showAddBank, setShowAddBank] = useState(false);
  const [verifyBank, setVerifyBank] = useState<(BankAccount & { demoAmounts?: [number, number] }) | null>(null);

  const verifiedBanks = banks.filter(b => b.status === "verified");

  const load = useCallback(async () => {
    const [bRes, cRes, bankRes] = await Promise.all([
      fetch("/api/account/balance"),
      fetch("/api/account/cards"),
      fetch("/api/account/banks"),
    ]);
    if (bRes.ok)    setData(await bRes.json());
    if (cRes.ok)    setCards(await cRes.json());
    if (bankRes.ok) setBanks(await bankRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!selCard && cards.length > 0)           setSelCard(cards[0].id); },           [cards, selCard]);
  useEffect(() => { if (!selBank && verifiedBanks.length > 0)   setSelBank(verifiedBanks[0].id); },  [verifiedBanks, selBank]);

  // Handle Stripe 3D-Secure redirect return
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const piId   = params.get("payment_intent");
    const status = params.get("redirect_status");
    if (!piId) return;
    window.history.replaceState({}, "", window.location.pathname);
    if (status !== "succeeded") {
      setMsg({ ok: false, text: "Payment was not completed. Please try again." });
      return;
    }
    fetch("/api/account/stripe-deposit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: piId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.newBalance !== undefined) {
          setMsg({ ok: true, text: `Deposit successful! New balance: ${formatCurrency(data.newBalance)}` });
        } else {
          setMsg({ ok: false, text: data.error ?? "Payment received but balance update failed." });
        }
        load();
      })
      .catch(() => setMsg({ ok: false, text: "Payment received but could not update balance. Contact support." }));
  }, [load]);

  async function handleProceed() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setMsg({ ok: false, text: "Enter a valid amount." }); return; }
    setMsg(null);

    if (mode === "deposit" && method === "card") {
      // Stripe card payment
      if (!stripeReady) { setMsg({ ok: false, text: "Stripe not configured. Add STRIPE keys to .env.local." }); return; }
      const res = await fetch("/api/account/payment-intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: data.error ?? "Payment service error. Please restart the dev server." }); return; }
      if (!data.clientSecret) { setMsg({ ok: false, text: "No client secret returned. Check Stripe keys and restart the server." }); return; }
      setClientSecret(data.clientSecret);
      // Extract payment intent ID from client secret (format: pi_xxx_secret_xxx)
      setPaymentIntentId(data.clientSecret.split("_secret_")[0]);
      setStep("stripe");
      return;
    }

    // Bank deposit or any withdrawal → OTP flow
    if (method === "bank" && !selBank) { setMsg({ ok: false, text: "Select a verified bank account." }); return; }
    if (mode === "withdrawal" && method === "card" && !selCard) { setMsg({ ok: false, text: "Select a card." }); return; }

    const bankObj = verifiedBanks.find(b => b.id === selBank);
    const cardObj = cards.find(c => c.id === selCard);
    const label   = method === "bank"
      ? `${bankObj?.bankName ?? "Bank"} •••• ${bankObj?.last4}`
      : `${cardObj?.cardType?.toUpperCase() ?? "Card"} •••• ${cardObj?.last4}`;

    const res = await fetch("/api/account/otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: mode, amount: amt,
        meta: JSON.stringify({ method, label, cardId: selCard, bankAccountId: selBank }),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ ok: false, text: data.error ?? "Failed to send OTP." }); return; }
    setOtpData({ id: data.otpId, demoCode: data.demoCode, email: data.email });
    setStep("otp");
  }

  function onOtpSuccess(newBalance: number) {
    setStep("done");
    setMsg({ ok: true, text: `${mode === "deposit" ? "Deposit" : "Withdrawal"} of ${formatCurrency(parseFloat(amount))} confirmed! New balance: ${formatCurrency(newBalance)}` });
    setAmount("");
    setStep("select");
    load();
  }

  async function deleteCard(id: string) {
    if (!confirm("Remove this card?")) return;
    await fetch(`/api/account/cards/${id}`, { method: "DELETE" });
    if (selCard === id) setSelCard("");
    load();
  }

  async function deleteBank(id: string) {
    if (!confirm("Remove this bank account?")) return;
    await fetch(`/api/account/banks/${id}`, { method: "DELETE" });
    if (selBank === id) setSelBank("");
    load();
  }

  async function onStripeSuccess() {
    const depositedAmt = parseFloat(amount);
    setStep("select");
    setAmount("");
    try {
      const res = await fetch("/api/account/stripe-deposit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: `Deposit of ${formatCurrency(depositedAmt)} successful! New balance: ${formatCurrency(data.newBalance)}` });
      } else {
        setMsg({ ok: false, text: data.error ?? "Payment received but balance update failed. Contact support." });
      }
    } catch {
      setMsg({ ok: false, text: "Payment received but could not update balance. Contact support." });
    }
    load();
  }

  const selCardObj = cards.find(c => c.id === selCard);
  const selBankObj = verifiedBanks.find(b => b.id === selBank);
  const amt = parseFloat(amount) || 0;
  const canProceed = amt > 0 && (method === "card" ? !!selCard : !!selBank);

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse"/>)}
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Funds</h1>
        <p className="text-sm text-gray-400 mt-0.5">Deposit or withdraw money from your Aura Trade account</p>
      </div>

      {/* Balance row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Balance", value: data?.balance   ?? 0, color: "text-gray-900"   },
          { label: "Available",     value: data?.available ?? 0, color: "text-green-600"  },
          { label: "Reserved",      value: data?.reserved  ?? 0, color: "text-gray-400"   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      {msg && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${msg.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          <Icon d={msg.ok ? "M20 6L9 17l-5-5" : "M6 18L18 6M6 6l12 12"} size={14}/>
          {msg.text}
        </div>
      )}

      {/* Stripe not configured warning */}
      {!stripeReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <Icon d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" size={15} className="text-amber-600 shrink-0 mt-0.5"/>
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Stripe not configured — card payments disabled</p>
            <p>To enable real card payments: <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noreferrer" className="underline font-medium">get free test keys at stripe.com</a>, then add <code className="bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code> and <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to <code className="bg-amber-100 px-1 rounded">.env.local</code>.</p>
            <p>Bank transfers via OTP work without Stripe.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Left: payment form ── */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl overflow-hidden space-y-0">

          {/* Deposit / Withdraw toggle */}
          <div className="grid grid-cols-2 border-b border-gray-100">
            {(["deposit", "withdrawal"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`py-3.5 text-sm font-semibold transition flex items-center justify-center gap-2
                  ${mode === m ? `border-b-2 ${m === "deposit" ? "border-green-600 text-green-700 bg-green-50" : "border-red-600 text-red-700 bg-red-50"}` : "text-gray-400 hover:text-gray-700"}`}>
                <Icon d={m === "deposit" ? "M12 4v16m-8-8h16" : "M20 12H4"} size={15}/>
                {m === "deposit" ? "Deposit" : "Withdraw"}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5">
            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400 font-semibold">$</span>
                <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-xl font-bold focus:outline-none focus:border-gray-900 transition tabular-nums"/>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {QUICK.map(q => (
                  <button key={q} onClick={() => setAmount(String(q))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${amount === String(q) ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}>
                    ${q >= 1000 ? `${q / 1000}K` : q}
                  </button>
                ))}
              </div>
              {mode === "withdrawal" && (
                <p className="text-xs text-gray-400 mt-2">Available: <span className="font-semibold text-gray-700">{formatCurrency(data?.available ?? 0)}</span></p>
              )}
            </div>

            {/* Payment method tabs */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">
                {mode === "deposit" ? "Pay from" : "Send to"}
              </label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-3">
                {([["card", "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", "Card"], ["bank", "M3 5h18M3 12h18M3 19h12", "Bank Account"]] as [string, string, string][]).map(([key, icon, label]) => (
                  <button key={key} onClick={() => setMethod(key as "card"|"bank")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition ${method === key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                    <Icon d={icon} size={14}/>
                    {label}
                  </button>
                ))}
              </div>

              {/* Card selector */}
              {method === "card" && (
                <div className="space-y-2">
                  {cards.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 mb-2">No saved cards</p>
                      <button onClick={() => setShowAddCard(true)} className="text-xs text-gray-900 font-semibold underline">+ Add a card</button>
                    </div>
                  ) : (
                    <>
                      {cards.map(c => (
                        <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border transition ${selCard === c.id ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}>
                          <input type="radio" name="card" value={c.id} checked={selCard === c.id} onChange={() => setSelCard(c.id)} className="accent-gray-900 cursor-pointer"/>
                          <label className="flex-1 cursor-pointer" onClick={() => setSelCard(c.id)}>
                            <p className="text-sm font-semibold text-gray-900">{c.nickname || c.cardType.toUpperCase()} <span className="text-gray-400 font-normal text-xs">•••• {c.last4}</span></p>
                            <p className="text-xs text-gray-400">{c.cardholderName} · {String(c.expiryMonth).padStart(2,"0")}/{String(c.expiryYear).slice(-2)}</p>
                          </label>
                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-lg ${c.cardType==="visa"?"bg-blue-100 text-blue-700":c.cardType==="mastercard"?"bg-red-100 text-red-700":"bg-gray-100 text-gray-700"}`}>{c.cardType}</span>
                          <button onClick={() => setEditCard(c)} title="Edit card"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                            <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" size={13}/>
                          </button>
                          <button onClick={() => deleteCard(c.id)} title="Remove card"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                            <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" size={13}/>
                          </button>
                        </div>
                      ))}
                      <button onClick={() => setShowAddCard(true)} className="text-xs text-gray-500 hover:text-gray-900 underline transition">+ Add another card</button>
                    </>
                  )}
                  {mode === "deposit" && !stripeReady && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">⚠ Card deposits require Stripe keys. Use bank transfer instead.</p>
                  )}
                </div>
              )}

              {/* Bank selector */}
              {method === "bank" && (
                <div className="space-y-2">
                  {banks.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 mb-2">No bank accounts added</p>
                      <p className="text-[10px] text-gray-400 mb-3">Add a bank account and complete micro-deposit verification</p>
                      <button onClick={() => setShowAddBank(true)} className="text-xs text-gray-900 font-semibold underline">+ Add a bank account</button>
                    </div>
                  ) : (
                    <>
                      {banks.map(b => (
                        <div key={b.id} className={`flex items-center gap-3 p-3 rounded-xl border transition ${b.status === "verified" && selBank === b.id ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}>
                          {b.status === "verified" ? (
                            <input type="radio" name="bank" value={b.id} checked={selBank === b.id} onChange={() => setSelBank(b.id)} className="accent-gray-900 cursor-pointer"/>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0"/>
                          )}
                          <div className="flex-1 min-w-0" onClick={() => b.status === "verified" && setSelBank(b.id)}>
                            <p className="text-sm font-semibold text-gray-900 truncate">{b.nickname || b.bankName} <span className="text-gray-400 font-normal text-xs">•••• {b.last4}</span></p>
                            <p className="text-xs text-gray-400 capitalize">{b.accountType}</p>
                          </div>
                          {b.status === "verified" ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium shrink-0">✓ Verified</span>
                          ) : (
                            <button onClick={() => setVerifyBank(b)} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0 hover:bg-amber-200 transition">
                              Verify →
                            </button>
                          )}
                          <button onClick={() => deleteBank(b.id)} title="Remove bank"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition shrink-0">
                            <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" size={13}/>
                          </button>
                        </div>
                      ))}
                      <button onClick={() => setShowAddBank(true)} className="text-xs text-gray-500 hover:text-gray-900 underline transition">+ Add another bank account</button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Selected summary */}
            {amt > 0 && canProceed && (
              <div className={`rounded-xl p-3 border ${mode === "deposit" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">{mode === "deposit" ? "Depositing" : "Withdrawing"}</span>
                  <span className="font-bold text-gray-900">{formatCurrency(amt)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                  <span>{method === "card" ? `${selCardObj?.cardType?.toUpperCase()} •••• ${selCardObj?.last4}` : `${selBankObj?.bankName} •••• ${selBankObj?.last4}`}</span>
                  <span>{method === "card" && mode === "deposit" && stripeReady ? "3D Secure if required" : "OTP via email"}</span>
                </div>
              </div>
            )}

            {/* CTA */}
            <button onClick={handleProceed} disabled={!canProceed}
              className={`w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition shadow-sm
                ${mode === "deposit" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
              {mode === "deposit" ? `Deposit ${amt > 0 ? formatCurrency(amt) : ""}` : `Withdraw ${amt > 0 ? formatCurrency(amt) : ""}`}
              {method === "card" && mode === "deposit" && stripeReady ? " · Pay now" : " · Get OTP"}
            </button>
          </div>
        </div>

        {/* ── Right: how it works ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
            <p className="text-sm font-semibold text-gray-800">How it works</p>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">1</div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Card — Stripe 3D Secure</p>
                  <p className="text-xs text-gray-400 leading-relaxed">Your bank automatically sends an OTP to your phone for verification. Powered by Stripe — no card details stored on our servers.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">2</div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Bank — Email OTP</p>
                  <p className="text-xs text-gray-400 leading-relaxed">A 6-digit code is sent to your registered email. Enter it to authorize the transfer. Withdrawals also confirmed via OTP.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0">3</div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Instant credit</p>
                  <p className="text-xs text-gray-400 leading-relaxed">Once verified, your Aura Trade balance updates immediately and you can start trading.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={14} className="text-green-600"/>
              Security
            </p>
            <ul className="space-y-2">
              {[
                "Stripe PCI-DSS Level 1 certified",
                "3D Secure / OTP for every transaction",
                "Card numbers never stored on our servers",
                "Bank accounts verified via micro-deposits",
                "OTP expires in 10 minutes",
                "256-bit TLS encryption",
              ].map(t => (
                <li key={t} className="flex items-center gap-2 text-xs text-gray-500">
                  <Icon d="M20 6L9 17l-5-5" size={11} className="text-green-500 shrink-0"/>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Transaction History</p>
        </div>
        {!data?.transactions?.length ? (
          <div className="py-10 text-center text-sm text-gray-400">No transactions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Type</th>
                <th className="px-4 py-2.5 text-left">Method</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5 text-right">Balance After</th>
                <th className="px-4 py-2.5 text-left">Status</th>
              </tr></thead>
              <tbody>
                {data.transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(tx.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tx.type==="deposit"?"bg-green-50 text-green-700 border-green-200":"bg-red-50 text-red-700 border-red-200"}`}>
                        {tx.type==="deposit"?"↓ Deposit":"↑ Withdraw"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{tx.reference || "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${tx.type==="deposit"?"text-green-600":"text-red-600"}`}>
                      {tx.type==="deposit"?"+":"-"}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{formatCurrency(tx.balanceAfter)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.status==="completed"?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>{tx.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OTP overlay */}
      {step === "otp" && otpData && (
        <OtpScreen
          otpId={otpData.id}
          demoCode={otpData.demoCode}
          email={otpData.email}
          purpose={mode}
          amount={amt}
          label={method === "card" ? `${selCardObj?.cardType?.toUpperCase()} •••• ${selCardObj?.last4}` : `${selBankObj?.bankName} •••• ${selBankObj?.last4}`}
          onSuccess={onOtpSuccess}
          onCancel={() => setStep("select")}
        />
      )}

      {/* Stripe payment overlay */}
      {step === "stripe" && clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
          <StripePayForm
            amount={amt}
            onSuccess={onStripeSuccess}
            onCancel={() => setStep("select")}
          />
        </Elements>
      )}

      {/* Add Card modal */}
      {showAddCard && (
        <AddCardModal
          onClose={() => setShowAddCard(false)}
          onAdded={() => { load(); setShowAddCard(false); }}
        />
      )}

      {/* Edit Card modal */}
      {editCard && (
        <EditCardModal
          card={editCard}
          onClose={() => setEditCard(null)}
          onSaved={() => { load(); setEditCard(null); }}
        />
      )}

      {/* Add Bank modal */}
      {showAddBank && (
        <AddBankModal
          onClose={() => setShowAddBank(false)}
          onAdded={(demoAmounts) => {
            load().then(() => {
              // After load, find the newest pending bank and open verify modal
              fetch("/api/account/banks").then(r => r.json()).then((freshBanks: BankAccount[]) => {
                const pending = freshBanks.find(b => b.status !== "verified");
                if (pending) setVerifyBank({ ...pending, demoAmounts });
              });
            });
            setShowAddBank(false);
          }}
        />
      )}

      {/* Verify Bank modal */}
      {verifyBank && (
        <VerifyBankModal
          bank={verifyBank}
          demoAmounts={verifyBank.demoAmounts}
          onClose={() => setVerifyBank(null)}
          onVerified={() => { load(); setVerifyBank(null); }}
        />
      )}
    </div>
  );
}
