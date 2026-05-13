"use client";

import { useState } from "react";

export function AddToWatchlistButton({ symbol }: { symbol: string }) {
  const [added, setAdded]     = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      if (added) {
        await fetch(`/api/watchlist/${symbol}`, { method: "DELETE" });
        setAdded(false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol }),
        });
        setAdded(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-2 rounded border text-sm font-medium transition disabled:opacity-50 ${
        added
          ? "border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-600"
          : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900"
      }`}
    >
      {added ? "★ Watchlisted" : "☆ Add to Watchlist"}
    </button>
  );
}
