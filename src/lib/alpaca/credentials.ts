import type { AlpacaMode } from "./client";

// BD license architecture: all users trade through Aura's master Alpaca account.
// No per-user API keys — credentials come from server env vars only.
export async function getMasterMode(): Promise<AlpacaMode> {
  return "live";
}
