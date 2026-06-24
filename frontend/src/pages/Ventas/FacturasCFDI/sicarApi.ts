import { fetchApi } from "@/config/api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reintenta ante 502 cuando SICAR/MySQL tarda en responder (VPN o red intermitente). Solo en GET/HEAD. */
export async function fetchSicarApi(
  path: string,
  init?: RequestInit,
  options?: { retries?: number; retryDelayMs?: number }
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  const canRetry = method === "GET" || method === "HEAD";
  const retries = canRetry ? (options?.retries ?? 2) : 0;
  const retryDelayMs = options?.retryDelayMs ?? 600;
  let last: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetchApi(path, init);
    if (res.ok || (res.status !== 502 && res.status !== 503) || attempt >= retries) {
      return res;
    }
    last = res;
    await sleep(retryDelayMs * (attempt + 1));
  }

  return last!;
}
