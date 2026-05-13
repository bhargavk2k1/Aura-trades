import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In the BD license architecture, users do not connect their own broker accounts.
// All trading is executed through Aura's master Alpaca account.
// This route is kept for compatibility but returns a deprecation notice.
export async function GET() {
  return NextResponse.json({ deprecated: true, message: "Credentials are managed by Aura Trade." });
}
