import { NextResponse } from "next/server";
import { finnhub } from "@/lib/finnhub/client";

export const dynamic = "force-dynamic";

export const revalidate = 300; // 5 minutes

interface NewsItem {
  id:       number;
  headline: string;
  summary:  string;
  source:   string;
  url:      string;
  image:    string;
  datetime: number;
  category: string;
  related:  string;
}

export async function GET() {
  try {
    const res = await finnhub("/news?category=general", 300);
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const all: NewsItem[] = await res.json().catch(() => []);
    const news = all.filter(n => n.headline && n.url).slice(0, 10);
    return NextResponse.json(news);
  } catch {
    return NextResponse.json([]);
  }
}
