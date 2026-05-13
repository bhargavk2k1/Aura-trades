"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { SearchResult } from "@/types/market";

const NAV = [
  { href: "/dashboard",   label: "Home"        },
  { href: "/stocks",      label: "Markets"     },
  { href: "/commodities", label: "Commodities" },
  { href: "/portfolio",   label: "Portfolio"   },
  { href: "/orders",      label: "Orders"      },
  { href: "/fno",         label: "F&O"         },
  { href: "/watchlist",   label: "Watchlist"   },
  { href: "/funds",       label: "Funds"       },
];

export function Topbar({ userName }: { userName: string }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef  = useRef<NodeJS.Timeout>();
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef   = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
      if (menuRef.current  && !menuRef.current.contains(e.target as Node))    setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/market/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setResults(data); setOpen(true);
      } finally { setLoading(false); }
    }, 300);
  }

  function select(symbol: string) {
    setQuery(""); setOpen(false);
    router.push(`/stocks/${symbol}`);
  }

  const initials = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-50 flex items-center h-12 px-4 border-b border-gray-200 bg-white gap-3">

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-2">
        <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="font-bold text-gray-900 text-sm tracking-tight hidden sm:block">Aura Trade</span>
      </Link>

      {/* Search */}
      <div ref={searchRef} className="relative w-52 shrink-0">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
        </svg>
        <input
          value={query} onChange={handleChange}
          placeholder="Search for Anything"
          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 bg-gray-50 transition"
        />
        {loading && (
          <div className="absolute right-2.5 top-2.5 w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        )}
        {open && results.length > 0 && (
          <div className="absolute top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {results.map(r => (
              <button key={r.symbol} onClick={() => select(r.symbol)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition text-left border-b border-gray-100 last:border-0">
                <span className="font-bold text-gray-900 text-sm w-14 shrink-0">{r.symbol}</span>
                <span className="text-gray-500 text-xs truncate">{r.name}</span>
                <span className="ml-auto text-[10px] text-gray-400 shrink-0">{r.exchange}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav links — desktop */}
      <nav className="hidden lg:flex items-center gap-0.5 flex-1">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap
                ${active ? "text-gray-900 bg-gray-100 font-semibold" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right: notifications + user */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {/* Bell */}
        <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>

        {/* User avatar + dropdown */}
        <div ref={menuRef} className="relative">
          <button onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold hover:bg-gray-700 transition">
            {initials}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
              </div>
              {[
                { href: "/portfolio", label: "Portfolio"  },
                { href: "/orders",    label: "Orders"     },
                { href: "/settings",  label: "Settings"   },
              ].map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                  className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-gray-100">
                <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile hamburger — shows remaining nav */}
        <button onClick={() => setMenuOpen(v => !v)}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
