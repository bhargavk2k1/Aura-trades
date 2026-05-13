const BASE = "https://api.twelvedata.com";

function token() {
  return process.env.TWELVE_DATA_API_KEY ?? "";
}

export async function twelvedata(path: string, revalidate = 15): Promise<Response> {
  const sep = path.includes("?") ? "&" : "?";
  return fetch(`${BASE}${path}${sep}apikey=${token()}`, {
    redirect: "follow",
    next: { revalidate },
  });
}
