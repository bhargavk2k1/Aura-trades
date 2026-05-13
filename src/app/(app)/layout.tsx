import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { TradingViewTickerTape } from "@/components/tradingview/TradingViewTickerTape";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Topbar userName={user.name} />
      <div className="border-b border-gray-200 bg-white">
        <TradingViewTickerTape />
      </div>
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto bg-gray-50">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
