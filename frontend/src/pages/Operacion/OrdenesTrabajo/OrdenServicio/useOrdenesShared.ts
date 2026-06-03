import { fetchApi } from "@/config/api";

// ─── Constants ──────────────────────────────────────────────────────────────
export const ORDEN_BASE_MAX_FOTOS = 5;
export const FOTOS_EXTRA_OPTIONS = [0, 2, 3, 4, 5] as const;
export const ORDENES_PAGE_INIT_THROTTLE_MS = 800;
export type FotosExtraMax = (typeof FOTOS_EXTRA_OPTIONS)[number];

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  activo?: boolean;
}

export interface Orden {
  id: number;
  idx: number;
  folio?: string | null;
  cliente_id: number | null;
  cliente: string;
  direccion: string;
  telefono_cliente: string;
  problematica: string;
  servicios_realizados: string[];
  status: 'pendiente' | 'resuelto';
  comentario_tecnico: string;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_finalizacion: string;
  hora_termino: string;
  nombre_encargado: string;
  nombre_cliente: string;
  tecnico_asignado?: number | null;
  tecnico_asignado_username?: string;
  tecnico_asignado_full_name?: string;
  quien_instalo?: number | null;
  quien_entrego?: number | null;
  firma_encargado_url: string;
  firma_cliente_url: string;
  fotos_urls: string[];
  fotos_extra_max?: number;
  pdf_url?: string;
  fecha_creacion: string;
  tipo_orden?: 'servicio_tecnico' | 'levantamiento' | string;
  creado_por?: number;
  creado_por_id?: number;
}

export interface Usuario {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export type AlertVariant = "success" | "error" | "warning" | "info";

export interface AlertState {
  show: boolean;
  variant: AlertVariant;
  title: string;
  message: string;
}

export const EMPTY_ALERT: AlertState = { show: false, variant: "success", title: "", message: "" };

// ─── Pure helpers ───────────────────────────────────────────────────────────

export function normalizeFotosExtraFromOrden(orden: {
  fotos_extra_max?: unknown;
  permitir_fotos_extra?: boolean;
} | null | undefined): FotosExtraMax {
  if (!orden) return 0;
  const v = Number(orden.fotos_extra_max);
  if (FOTOS_EXTRA_OPTIONS.includes(v as FotosExtraMax)) return v as FotosExtraMax;
  if (orden.permitir_fotos_extra === true) return 2;
  return 0;
}

export const getCurrentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

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

// ─── Image compression ─────────────────────────────────────────────────────

export const compressImage = async (
  file: File,
  maxSizeKB: number,
  maxWidth: number = 1400,
  maxHeight: number = 1400
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx?.drawImage(img, 0, 0, width, height);

        const minQuality = 0.1;
        const maxQuality = 0.95;
        let attempts = 0;
        const maxAttempts = 8;

        const binarySearchCompress = (low: number, high: number) => {
          if (attempts >= maxAttempts || high - low < 0.01) {
            const finalQuality = (low + high) / 2;
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Error al comprimir la imagen'));
                  return;
                }
                const r = new FileReader();
                r.readAsDataURL(blob);
                r.onloadend = () => resolve(r.result as string);
              },
              'image/jpeg',
              finalQuality
            );
            return;
          }

          attempts++;
          const midQuality = (low + high) / 2;
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al comprimir la imagen'));
                return;
              }
              const sizeKB = blob.size / 1024;
              if (Math.abs(sizeKB - maxSizeKB) < 5) {
                const r = new FileReader();
                r.readAsDataURL(blob);
                r.onloadend = () => resolve(r.result as string);
              } else if (sizeKB > maxSizeKB) {
                binarySearchCompress(low, midQuality);
              } else {
                binarySearchCompress(midQuality, high);
              }
            },
            'image/jpeg',
            midQuality
          );
        };

        binarySearchCompress(minQuality, maxQuality);
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
  });
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
      return Array.isArray(data) ? data : (data.results || []);
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
      return Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
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

    const results = Array.isArray((data as any)?.results) ? ((data as any).results as ServicioCatalogo[]) : [];
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
      return Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
    }
    return [];
  } catch (error) {
    console.error("Error al cargar órdenes:", error);
    return [];
  }
};
