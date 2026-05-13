const BASE = "https://finnhub.io/api/v1";

function token() {
  return process.env.FINNHUB_API_KEY ?? "";
}

export async function finnhub(path: string, revalidate = 15): Promise<Response> {
  const sep = path.includes("?") ? "&" : "?";
  return fetch(`${BASE}${path}${sep}token=${token()}`, {
    redirect: "follow",
    next: { revalidate }
  });
}
