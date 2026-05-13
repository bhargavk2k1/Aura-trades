const BASE = "https://query2.finance.yahoo.com";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
};

export async function yahoo(path: string, revalidate = 15): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    headers: HEADERS,
    redirect: "follow",
    next: { revalidate },
  });
}
