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

/** Fecha y hora locales (es-MX) desde ISO; para metadatos de auditoría en listados. */
export function formatIsoDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

/** Nombre legible de usuario a partir de campos de la API de órdenes. */
export function displayOrdenUserName(orden: {
  creado_por_full_name?: string | null;
  creado_por_username?: string | null;
  actualizado_por_full_name?: string | null;
  actualizado_por_username?: string | null;
}, role: "creado" | "actualizado"): string {
  if (role === "creado") {
    return (
      String(orden.creado_por_full_name || "").trim() ||
      String(orden.creado_por_username || "").trim() ||
      "—"
    );
  }
  return (
    String(orden.actualizado_por_full_name || "").trim() ||
    String(orden.actualizado_por_username || "").trim() ||
    "—"
  );
}

export function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

/** Aplana un error de validación DRF (`{campo: ["msg"]}` o `{detail: "msg"}`) a texto legible. */
export function formatOrdenErrorMessage(raw: unknown, fallback: string): string {
  if (!raw || typeof raw !== "object") {
    return typeof raw === "string" && raw.trim() ? raw : fallback;
  }
  const rec = raw as Record<string, unknown>;
  if (typeof rec.detail === "string" && rec.detail.trim()) return rec.detail;

  const parts: string[] = [];
  for (const [field, value] of Object.entries(rec)) {
    const text = Array.isArray(value) ? value.filter(Boolean).join(" ") : String(value ?? "");
    if (!text.trim()) continue;
    parts.push(field === "non_field_errors" ? text : `${field}: ${text}`);
  }
  return parts.length ? parts.join(" · ") : fallback;
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

/** Ventana de resalte admin: 48 horas desde status_changed_at. */
export const ORDEN_STATUS_CHANGE_RECENT_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Resalte solo si la orden está en resuelto y el status cambió hace < 48h.
 * Si vuelve a pendiente, no resalta aunque status_changed_at sea reciente.
 */
export function isOrdenStatusChangeRecent(
  orden: { status?: string | null; status_changed_at?: string | null } | null | undefined,
  now: Date | number = Date.now(),
): boolean {
  if (normalizeStatus(orden?.status) !== "resuelto") return false;
  const raw = orden?.status_changed_at;
  if (!raw) return false;
  const ts = new Date(raw).getTime();
  if (!Number.isFinite(ts)) return false;
  const nowMs = typeof now === "number" ? now : now.getTime();
  return nowMs - ts < ORDEN_STATUS_CHANGE_RECENT_MS && nowMs - ts >= 0;
}

/**
 * Prioridad de la bolsa (`prioridad_pool`) resuelta a etiqueta + clases de pastilla.
 * La asigna el admin y es obligatoria al crear/guardar. `""` / null = sin asignar
 * (solo órdenes antiguas previas a la obligatoriedad).
 */
export type OrdenPrioridadPool = "alta" | "media" | "baja" | "" | (string & {}) | null | undefined;

export function prioridadPoolBadge(value: OrdenPrioridadPool): {
  key: "alta" | "media" | "baja" | "none";
  label: string;
  className: string;
} {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap";
  switch (normalizeStatus(value)) {
    case "alta":
      return {
        key: "alta",
        label: "Alta",
        className: `${base} border-rose-300/80 bg-rose-100 text-rose-800 dark:border-rose-400/35 dark:bg-rose-500/20 dark:text-rose-100`,
      };
    case "media":
      return {
        key: "media",
        label: "Media",
        className: `${base} border-amber-300/80 bg-amber-100 text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/20 dark:text-amber-100`,
      };
    case "baja":
      return {
        key: "baja",
        label: "Baja",
        className: `${base} border-sky-300/80 bg-sky-100 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/20 dark:text-sky-100`,
      };
    default:
      return {
        key: "none",
        label: "Sin prioridad",
        className: `${base} border-dashed border-[#D3D3D8] bg-transparent text-[#6E6E77] dark:border-[#3A4661] dark:text-[#8EA0B8]`,
      };
  }
}

/** Clases de fila/card para resalte de resuelto reciente (admin). */
export const ORDEN_RECIEN_RESUELTA_ROW_CLASS =
  "relative bg-emerald-50/80 shadow-[inset_3px_0_0_0_#10b981] dark:bg-emerald-500/10 dark:shadow-[inset_3px_0_0_0_#34d399]";

export const ORDEN_RECIEN_RESUELTA_BADGE_CLASS =
  "inline-flex items-center gap-1 rounded-md border border-emerald-300/80 bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100";
