import { fetchApi } from "@/config/api";
import { FOLIO_SERIE, matchesDocumentFolio, resolveDocumentFolio } from "@/utils/documentFolio";
import type { Orden, ServicioCatalogo, Usuario } from "./ordenesPageTypes";

export { compressImage } from "./ordenImageUpload";

export type {
  Orden,
  Usuario,
  ServicioCatalogo,
  FotosExtraMax,
} from "./ordenesPageTypes";
export {
  ORDEN_BASE_MAX_FOTOS,
  FOTOS_EXTRA_OPTIONS,
  normalizeFotosExtraFromOrden,
  getCurrentYearMonth,
} from "./ordenesPageTypes";

// ─── Constants ──────────────────────────────────────────────────────────────
export const ORDENES_PAGE_INIT_THROTTLE_MS = 800;

/** Folio visible de orden: respeta SERIE-n existente o formatea ODT-{idx}. */
export function displayOrdenFolio(
  orden: { folio?: string | null; idx?: number | string | null; id?: number | string | null },
  fallbackIndex?: number
): string {
  return resolveDocumentFolio(
    FOLIO_SERIE.orden,
    orden?.folio,
    orden?.idx ?? orden?.id ?? fallbackIndex,
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
export type AlertVariant = "success" | "error" | "warning" | "info";

export interface AlertState {
  show: boolean;
  variant: AlertVariant;
  title: string;
  message: string;
}

export const EMPTY_ALERT: AlertState = { show: false, variant: "success", title: "", message: "" };

// ─── Pure helpers ───────────────────────────────────────────────────────────

export const formatYmdToDMY = (ymd: string | null | undefined): string => {
  if (!ymd) return '-';
  const s = ymd.toString().slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '-';
  const dt = new Date(y, m - 1, d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

export const normalizeStatus = (value: unknown): string =>
  String(value || "").trim().toLowerCase();

type OrdenSearchInput = {
  idx?: number;
  folio?: string | null;
  cliente?: string;
  nombre_cliente?: string;
  telefono_cliente?: string;
  problematica?: string;
  nombre_encargado?: string;
  direccion?: string;
  status?: string;
  tecnico_asignado?: number | null;
  tecnico_asignado_full_name?: string;
  tecnico_asignado_username?: string;
};

/** Coincide con folio, cliente, técnico, estado y campos ya buscables. */
export function ordenMatchesSearch(
  orden: OrdenSearchInput,
  query: string,
  usuarios?: Pick<Usuario, "id" | "first_name" | "last_name" | "email" | "username">[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const folio = String(orden.folio ?? "").trim().toLowerCase();
  const idx = orden.idx != null ? String(orden.idx) : "";
  const folioLabel = displayOrdenFolio(orden).toLowerCase();

  let tecnicoText = "";
  const tecId = orden.tecnico_asignado != null ? Number(orden.tecnico_asignado) : null;
  if (tecId && Array.isArray(usuarios)) {
    const u = usuarios.find((x) => x.id === tecId);
    if (u) {
      tecnicoText = (
        u.first_name && u.last_name
          ? `${u.first_name} ${u.last_name}`
          : (u.username || u.email || "")
      ).toLowerCase();
    }
  }
  if (!tecnicoText && orden.tecnico_asignado_full_name) {
    tecnicoText = orden.tecnico_asignado_full_name.toLowerCase();
  }
  if (!tecnicoText && orden.tecnico_asignado_username) {
    tecnicoText = orden.tecnico_asignado_username.toLowerCase();
  }

  if (matchesDocumentFolio(folioLabel, q) || matchesDocumentFolio(folio, q) || matchesDocumentFolio(idx, q)) {
    return true;
  }

  const parts = [
    folio,
    idx,
    folioLabel,
    orden.cliente,
    orden.nombre_cliente,
    orden.telefono_cliente,
    orden.problematica,
    orden.nombre_encargado,
    orden.direccion,
    normalizeStatus(orden.status),
    tecnicoText,
  ];

  return parts.some((p) => p && String(p).toLowerCase().includes(q));
}

/** Órdenes cerradas: PDF sin vista previa, solo descarga. */
export const isOrdenPdfDirectDownload = (status: unknown): boolean => {
  const s = normalizeStatus(status);
  return s === "resuelto" || s === "completado" || s === "completada";
};

export async function downloadOrdenesMesPdf(
  yearMonth: string
): Promise<{ ok: boolean; message?: string }> {
  const mes = (yearMonth || "").trim();
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return { ok: false, message: "Mes inválido." };
  }
  try {
    const resp = await fetchApi(`/api/ordenes/listado-mes-pdf/?mes=${encodeURIComponent(mes)}`);
    if (!resp.ok) {
      let msg = `No se pudo generar el PDF (HTTP ${resp.status}).`;
      try {
        const ct = resp.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await resp.json();
          msg = (data as { detail?: string; mes?: string[] })?.detail || (data as { mes?: string[] })?.mes?.[0] || msg;
        } else {
          msg = (await resp.text()) || msg;
        }
      } catch {
        /* ignore */
      }
      return { ok: false, message: msg };
    }

    const ct = (resp.headers.get("content-type") || "").toLowerCase();
    const dispo = resp.headers.get("content-disposition") || "";
    const m = dispo.match(/filename="?([^";]+)"?/i);
    const filename = m?.[1]
      ? String(m[1])
      : ct.includes("application/pdf")
        ? `Ordenes_servicio_${mes}.pdf`
        : `Ordenes_servicio_${mes}.html`;

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, message: "No se pudo descargar el PDF del mes." };
  }
}

export async function downloadOrdenPdfById(
  ordenId: number
): Promise<{ ok: boolean; message?: string }> {
  try {
    const resp = await fetchApi(`/api/ordenes/${ordenId}/pdf/`);
    if (!resp.ok) {
      let msg = `No se pudo generar el PDF (HTTP ${resp.status}).`;
      try {
        const ct = resp.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await resp.json();
          msg = (data as { detail?: string })?.detail || msg;
        } else {
          msg = (await resp.text()) || msg;
        }
      } catch {
        /* ignore */
      }
      return { ok: false, message: msg };
    }

    const ct = (resp.headers.get("content-type") || "").toLowerCase();
    const dispo = resp.headers.get("content-disposition") || "";
    const m = dispo.match(/filename="?([^";]+)"?/i);
    const filename = m?.[1]
      ? String(m[1])
      : ct.includes("application/pdf")
        ? `Orden_Servicio_${ordenId}.pdf`
        : `Orden_Servicio_${ordenId}.html`;

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, message: "No se pudo descargar el PDF." };
  }
}

export function handleOrdenPdfClick(
  orden: { id: number; status?: unknown },
  navigate: (path: string, options?: { state?: { from?: string } }) => void,
  returnPath: string,
  callbacks?: {
    onDownloading?: (id: number | null) => void;
    onError?: (message: string) => void;
  }
): void {
  if (isOrdenPdfDirectDownload(orden.status)) {
    callbacks?.onDownloading?.(orden.id);
    void downloadOrdenPdfById(orden.id).then((result) => {
      callbacks?.onDownloading?.(null);
      if (!result.ok && result.message) callbacks?.onError?.(result.message);
    });
    return;
  }
  navigate(`/ordenes/${orden.id}/pdf`, { state: { from: returnPath } });
}

/** Correo precargable: cliente.correo, si vacío el del contacto principal. */
export function resolveClienteCorreoSugerido(cliente: {
  correo?: string | null;
  contactos?: Array<{ correo?: string | null; is_principal?: boolean }>;
} | null | undefined): string {
  if (!cliente) return "";
  const propio = String(cliente.correo || "").trim();
  if (propio) return propio;
  const contactos = Array.isArray(cliente.contactos) ? cliente.contactos : [];
  const principal = contactos.find((c) => c.is_principal) || contactos[0];
  return String(principal?.correo || "").trim();
}

export function isOrdenResuelta(status: unknown): boolean {
  const s = String(status ?? "").trim().toLowerCase();
  return s === "resuelto" || s === "completado" || s === "completada";
}

/** Solo órdenes de servicio técnico (no levantamiento / instalación). */
export function isOrdenServicioTecnico(tipo: unknown): boolean {
  const t = String(tipo ?? "").trim().toLowerCase();
  return !t || t === "servicio_tecnico" || t === "servicio";
}

export const parseYearMonth = (value: string): { year: number; month: number } | null => {
  const m = /^(\d{4})-(\d{2})$/.exec((value || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
};

export const isGoogleMapsUrl = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (!(s.startsWith('http://') || s.startsWith('https://'))) return false;
  try {
    const u = new URL(s);
    const host = (u.hostname || '').toLowerCase();
    const href = u.href.toLowerCase();
    if (host === 'maps.app.goo.gl') return true;
    if (host.endsWith('google.com') && href.includes('/maps')) return true;
    return false;
  } catch {
    return false;
  }
};

export const getNowHHMM = (): string => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const round2 = (v: number): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

// ─── Cloudinary helpers ─────────────────────────────────────────────────────

export const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const uploadIdx = parts.findIndex(p => p === 'upload');
    if (uploadIdx === -1) return null;
    const after = parts.slice(uploadIdx + 1);
    const startIdx = after.length && /^v\d+$/i.test(after[0]) ? 1 : 0;
    const pathParts = after.slice(startIdx);
    if (!pathParts.length) return null;
    const last = pathParts[pathParts.length - 1];
    const dot = last.lastIndexOf('.');
    pathParts[pathParts.length - 1] = dot > 0 ? last.substring(0, dot) : last;
    return pathParts.join('/');
  } catch {
    return null;
  }
};

export const uploadImageToCloudinary = async (
  compressed: string,
  folder: string = 'ordenes/fotos'
): Promise<string | null> => {
  try {
    const resp = await fetchApi('/api/ordenes/upload-image/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_url: compressed, folder }),
    });
    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    return data?.url ? String(data.url) : null;
  } catch {
    return null;
  }
};

export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  await fetchApi('/api/ordenes/delete-image/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_id: publicId }),
  });
};

// ─── API fetchers ───────────────────────────────────────────────────────────

// ─── API helpers ────────────────────────────────────────────────────────────

function unwrapListResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const results = (data as { results?: T[] } | null)?.results;
  return Array.isArray(results) ? results : [];
}

export const fetchClientesApi = async (search = "") => {
  try {
    const query = new URLSearchParams({
      search: search.trim(),
      page_size: '20',
    });
    const response = await fetchApi(`/api/clientes/?${query.toString()}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      return unwrapListResults(data);
    }
    return [];
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    return [];
  }
};

export const fetchUsuariosApi = async () => {
  try {
    const commonHeaders = { "Content-Type": "application/json" } as HeadersInit;
    let response = await fetchApi("/api/ordenes/tecnico-opciones/", { headers: commonHeaders });
    if (!response.ok) {
      response = await fetchApi("/api/users/accounts/", { headers: commonHeaders });
    }
    if (response.ok) {
      const data = await response.json();
      return unwrapListResults<Usuario>(data);
    }
    return [];
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    return [];
  }
};

export const fetchServiciosApi = async (fallbackServicios: string[] = []) => {
  try {
    const res = await fetchApi('/api/servicios/?page=1&page_size=500&ordering=idx', {
      method: 'GET',
      cache: 'no-store' as RequestCache,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return fallbackServicios;

    const results = unwrapListResults<ServicioCatalogo>(data);
    const names = results
      .filter((s) => s && typeof s.nombre === 'string' && s.nombre.trim() && s.activo !== false)
      .map((s) => s.nombre.trim());

    return Array.from(new Set([...(names.length ? names : fallbackServicios)]));
  } catch {
    return fallbackServicios;
  }
};

export const fetchOrdenesApi = async (canView: boolean) => {
  if (!canView) return [];
  try {
    const response = await fetchApi(`/api/ordenes/?_ts=${Date.now()}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store" as RequestCache,
    });
    if (response.ok) {
      const data = await response.json();
      return unwrapListResults<Orden>(data);
    }
    return [];
  } catch (error) {
    console.error("Error al cargar órdenes:", error);
    return [];
  }
};
