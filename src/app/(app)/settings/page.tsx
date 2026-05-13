"use client";

import { useState, useEffect } from "react";

interface UserSettings {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  kycStatus: string;
  theme: string;
}

interface AccountBalance {
  balance: number;
  reserved: number;
  available: number;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    reference: string;
    note: string;
    createdAt: string;
  }>;
}

export default function SettingsPage() {
  const [settings, setSettings]       = useState<UserSettings | null>(null);
  const [name, setName]               = useState("");
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");

  const [account, setAccount]         = useState<AccountBalance | null>(null);
  const [depositAmt, setDepositAmt]   = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [funding, setFunding]         = useState(false);
  const [fundMsg, setFundMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  const [kycTab, setKycTab]           = useState<"status" | "submit">("status");
  const [kycForm, setKycForm]         = useState({
    fullName: "", dateOfBirth: "", address: "", idType: "passport" as string, idNumber: ""
  });
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycMsg, setKycMsg]           = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      setSettings(d);
      setName(d.name ?? "");
    });
    loadBalance();
  }, []);

  async function loadBalance() {
    const res = await fetch("/api/account/balance");
    const data = await res.json();
    setAccount(data);
  }

  async function doFund(type: "deposit" | "withdrawal") {
    const raw = type === "deposit" ? depositAmt : withdrawAmt;
    const amount = parseFloat(raw.replace(/,/g, ""));
    if (!amount || amount <= 0) return;

    setFunding(true);
    setFundMsg(null);
    const res = await fetch("/api/account/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, type })
    });
    const data = await res.json();
    setFunding(false);
    if (!res.ok) {
      setFundMsg({ ok: false, text: data.error ?? "Failed" });
    } else {
      setFundMsg({ ok: true, text: `${type === "deposit" ? "Deposit" : "Withdrawal"} of $${amount.toLocaleString()} applied.` });
      if (type === "deposit") setDepositAmt(""); else setWithdrawAmt("");
      loadBalance();
    }
  }

  async function submitKyc(e: React.FormEvent) {
    e.preventDefault();
    setKycSubmitting(true);
    setKycMsg(null);
    const res = await fetch("/api/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kycForm)
    });
    const data = await res.json();
    setKycSubmitting(false);
    if (!res.ok) {
      setKycMsg({ ok: false, text: data.error ?? "Submission failed" });
    } else {
      setKycMsg({ ok: true, text: data.message });
      setSettings(prev => prev ? { ...prev, kycStatus: data.kycStatus ?? "pending" } : prev);
      setKycTab("status");
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    setSaving(false);
    setSaveMsg(res.ok ? "Saved." : "Failed.");
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  const kycBadge = {
    approved: { label: "Verified", cls: "border-green-200 bg-green-50 text-green-700" },
    pending:  { label: "Under review", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    rejected: { label: "Rejected", cls: "border-red-200 bg-red-50 text-red-700" },
  }[settings.kycStatus] ?? { label: "Not submitted", cls: "border-gray-200 bg-gray-50 text-gray-500" };

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {/* ── Account balance & funds ── */}
      <section className="border border-gray-200 rounded">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Account Balance</h2>
            <p className="text-xs text-gray-400 mt-0.5">Your Aura Trade cash account</p>
          </div>
          {account && (
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                ${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              {account.reserved > 0 && (
                <p className="text-xs text-gray-400">${account.available.toLocaleString()} available</p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Deposit */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Deposit funds</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" min="1" value={depositAmt}
                  onChange={e => setDepositAmt(e.target.value)}
                  placeholder="Amount"
                  className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition"
                />
              </div>
              <button
                onClick={() => doFund("deposit")}
                disabled={funding || !depositAmt}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm rounded transition"
              >
                Deposit
              </button>
            </div>
          </div>

          {/* Withdraw */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Withdraw funds</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" min="1" value={withdrawAmt}
                  onChange={e => setWithdrawAmt(e.target.value)}
                  placeholder="Amount"
                  className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition"
                />
              </div>
              <button
                onClick={() => doFund("withdrawal")}
                disabled={funding || !withdrawAmt}
                className="px-4 py-2 border border-gray-200 hover:border-red-300 hover:text-red-600 disabled:opacity-40 text-gray-700 text-sm rounded transition"
              >
                Withdraw
              </button>
            </div>
          </div>

          {fundMsg && (
            <p className={`text-xs ${fundMsg.ok ? "text-green-600" : "text-red-600"}`}>{fundMsg.text}</p>
          )}

          {/* Transaction history */}
          {account && account.transactions.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Recent transactions</p>
              <div className="space-y-1">
                {account.transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 text-sm border-b border-gray-50 last:border-0">
                    <div>
                      <span className={`font-medium capitalize ${tx.type === "withdrawal" || tx.type === "trade_debit" ? "text-red-600" : "text-green-600"}`}>
                        {tx.type === "deposit" ? "↑ Deposit" : tx.type === "withdrawal" ? "↓ Withdrawal" : tx.type === "trade_debit" ? "↓ Trade" : "↑ Trade proceeds"}
                      </span>
                      {tx.reference && <span className="text-gray-400 ml-1 text-xs">{tx.reference}</span>}
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold tabular-nums ${tx.type === "withdrawal" || tx.type === "trade_debit" ? "text-red-600" : "text-green-600"}`}>
                        {tx.type === "withdrawal" || tx.type === "trade_debit" ? "-" : "+"}${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-400 tabular-nums">
                        bal: ${tx.balanceAfter.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── KYC Verification ── */}
      <section className="border border-gray-200 rounded">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Identity Verification (KYC)</h2>
            <p className="text-xs text-gray-400 mt-0.5">Required to trade on Aura</p>
          </div>
          <span className={`text-xs border px-2 py-0.5 rounded ${kycBadge.cls}`}>{kycBadge.label}</span>
        </div>

        {settings.kycStatus === "approved" ? (
          <div className="px-5 py-4 text-sm text-gray-600">
            Your identity has been verified. You are cleared to trade.
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {settings.kycStatus === "pending" && (
              <div className="text-xs px-3 py-2 border border-amber-200 bg-amber-50 text-amber-700 rounded">
                Your verification is under review. We will notify you within 1-2 business days.
              </div>
            )}
            {settings.kycStatus === "rejected" && (
              <div className="text-xs px-3 py-2 border border-red-200 bg-red-50 text-red-700 rounded">
                Your previous submission was rejected. Please resubmit with valid documents.
              </div>
            )}

            {settings.kycStatus !== "pending" && (
              <>
                <div className="flex gap-3 border-b border-gray-100 pb-3">
                  {(["status", "submit"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setKycTab(t)}
                      className={`text-xs font-medium pb-1 border-b-2 transition ${kycTab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                    >
                      {t === "status" ? "Status" : "Submit verification"}
                    </button>
                  ))}
                </div>

                {kycTab === "submit" && (
                  <form onSubmit={submitKyc} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Full legal name</label>
                        <input
                          required value={kycForm.fullName}
                          onChange={e => setKycForm(f => ({ ...f, fullName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date of birth</label>
                        <input
                          required type="date" value={kycForm.dateOfBirth}
                          onChange={e => setKycForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400 transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                      <input
                        required value={kycForm.address}
                        onChange={e => setKycForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="Street, City, State, ZIP"
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400 transition"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">ID type</label>
                        <select
                          value={kycForm.idType}
                          onChange={e => setKycForm(f => ({ ...f, idType: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400 transition bg-white"
                        >
                          <option value="passport">Passport</option>
                          <option value="drivers_license">Driver&apos;s license</option>
                          <option value="national_id">National ID</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">ID number</label>
                        <input
                          required value={kycForm.idNumber}
                          onChange={e => setKycForm(f => ({ ...f, idNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400 transition"
                        />
                      </div>
                    </div>

                    {kycMsg && (
                      <p className={`text-xs ${kycMsg.ok ? "text-green-600" : "text-red-600"}`}>{kycMsg.text}</p>
                    )}

                    <button
                      type="submit"
                      disabled={kycSubmitting}
                      className="w-full py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium rounded transition"
                    >
                      {kycSubmitting ? "Submitting…" : "Submit for verification"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Profile ── */}
      <section className="border border-gray-200 rounded">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
        </div>
        <form onSubmit={saveProfile} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              value={settings.email}
              disabled
              className="w-full px-3 py-2 border border-gray-100 rounded text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
          </div>
          {saveMsg && (
            <p className={`text-xs ${saveMsg === "Saved." ? "text-green-600" : "text-red-600"}`}>{saveMsg}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium rounded transition"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      {/* ── Account ── */}
      <section className="border border-gray-200 rounded">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Account</h2>
        </div>
        <div className="px-5 py-4">
          <button
            onClick={() => {
              fetch("/api/auth/logout", { method: "POST" }).then(() => {
                window.location.href = "/login";
              });
            }}
            className="px-4 py-2 border border-gray-200 hover:border-red-300 hover:text-red-600 text-sm text-gray-600 rounded transition"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* ── Support ── */}
      <section className="border border-gray-200 rounded">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Support</h2>
          <p className="text-xs text-gray-400 mt-0.5">Get help with your account or trades</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="mailto:support@auratrade.com"
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition group"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-9.75 6.75L2.25 6.75" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Email support</p>
                <p className="text-xs text-gray-400 mt-0.5">support@auratrade.com</p>
              </div>
            </a>

            <a
              href="https://discord.gg/auratrade"
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition group"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition">
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Community Discord</p>
                <p className="text-xs text-gray-400 mt-0.5">Chat with the community</p>
              </div>
            </a>
          </div>

          <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
            {[
              { q: "How do I deposit funds?", a: "Go to Settings → Account Balance and enter an amount in the Deposit field." },
              { q: "When does my KYC get approved?", a: "Identity verification typically takes 1–2 business days after submission." },
              { q: "Are my funds safe?", a: "Trading is executed through Alpaca Securities LLC, member FINRA/SIPC, which provides up to $500,000 in securities protection." },
              { q: "What markets can I trade?", a: "You can trade US stocks, ETFs, and commodity ETFs. Crypto and forex are coming soon." },
            ].map((item, i) => (
              <details key={i} className="group px-4 py-3 cursor-pointer">
                <summary className="text-sm font-medium text-gray-900 list-none flex items-center justify-between gap-2">
                  {item.q}
                  <svg className="w-4 h-4 text-gray-400 shrink-0 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-2 text-xs text-gray-500 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
