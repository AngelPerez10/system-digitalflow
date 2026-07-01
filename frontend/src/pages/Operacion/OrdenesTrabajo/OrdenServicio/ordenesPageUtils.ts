export function formatYmdToDMY(ymd: string | null | undefined) {
  if (!ymd) return "-";
  const s = ymd.toString().slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "-";
  const dt = new Date(y, m - 1, d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

export function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function parseYearMonth(value: string) {
  const m = /^(\d{4})-(\d{2})$/.exec((value || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

export function isGoogleMapsUrl(value: string | null | undefined) {
  if (!value) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (!(s.startsWith("http://") || s.startsWith("https://"))) return false;
  try {
    const u = new URL(s);
    const host = (u.hostname || "").toLowerCase();
    const href = u.href.toLowerCase();
    if (host === "maps.app.goo.gl") return true;
    if (host.endsWith("google.com") && href.includes("/maps")) return true;
    return false;
  } catch {
    return false;
  }
}

export function getPublicIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const uploadIdx = parts.findIndex((p) => p === "upload");
    if (uploadIdx === -1) return null;
    const after = parts.slice(uploadIdx + 1);
    const startIdx = after.length && /^v\d+$/i.test(after[0]) ? 1 : 0;
    const pathParts = after.slice(startIdx);
    if (!pathParts.length) return null;
    const last = pathParts[pathParts.length - 1];
    const dot = last.lastIndexOf(".");
    pathParts[pathParts.length - 1] = dot > 0 ? last.substring(0, dot) : last;
    return pathParts.join("/");
  } catch {
    return null;
  }
}

export function getNowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function round2(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
