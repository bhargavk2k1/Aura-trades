import { finnhub } from "@/lib/finnhub/client";

export const revalidate = 300;

interface NewsItem {
  id:       number;
  headline: string;
  summary:  string;
  source:   string;
  url:      string;
  image:    string;
  datetime: number;
  related:  string;
}

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() - unix * 1000) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default async function MarketNewsPage() {
  const res = await finnhub("/news?category=general", 300).catch(() => null);
  const allNews: NewsItem[] = res?.ok ? await res.json().catch(() => []) : [];
  const news = allNews.filter(n => n.headline && n.url).slice(0, 30);

  const [featured, ...rest] = news;

  return (
    <div className="max-w-6xl space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Market News</h1>
        <p className="text-sm text-gray-400 mt-1">Latest financial news from global markets · Updated every 5 minutes</p>
      </div>

      {news.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-lg font-medium">No news available right now</p>
          <p className="text-sm mt-1">Check back shortly — market news updates every 5 minutes.</p>
        </div>
      ) : (
        <>
          {/* Featured article */}
          {featured && (
            <a href={featured.url} target="_blank" rel="noreferrer"
              className="block group border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {featured.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featured.image} alt="" className="w-full h-56 md:h-full object-cover" />
                )}
                <div className="p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {featured.source} · {timeAgo(featured.datetime)}
                    </span>
                    <h2 className="text-xl font-bold text-gray-900 mt-2 mb-3 group-hover:underline leading-snug">
                      {featured.headline}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{featured.summary}</p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-gray-900">Read full story →</span>
                </div>
              </div>
            </a>
          )}

          {/* News grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map(item => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
                className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition flex flex-col bg-white">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="w-full h-40 object-cover" />
                )}
                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {item.source} · {timeAgo(item.datetime)}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 leading-snug group-hover:underline line-clamp-3 flex-1">
                    {item.headline}
                  </p>
                  {item.related && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.related.split(",").slice(0, 3).map(sym => sym.trim()).filter(Boolean).map(sym => (
                        <span key={sym} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">{sym}</span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
