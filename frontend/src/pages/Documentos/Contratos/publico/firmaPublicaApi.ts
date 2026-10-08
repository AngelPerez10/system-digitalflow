/**
 * Cliente HTTP del link público de firma. No usa `fetchApi` (exige sesión del
 * sistema) ni cookies: las credenciales viajan solo en cabeceras.
 *
 * - El token del link llega en el fragmento (`#t=…`), que el navegador nunca
 *   manda al servidor ni a terceros por `Referer`. Se lee una vez, se borra de
 *   la barra de direcciones y se guarda en `sessionStorage` (solo esta pestaña)
 *   para sobrevivir a una recarga.
 * - La sesión de firma (tras el código OTP) vive solo en memoria.
 */
import { apiUrl } from "@/config/apiBase";

const BASE = "/api/v1/contratos-firma/";
const STORAGE_KEY = "contrato-firma-token";
const TOKEN_RE = /^[A-Za-z0-9_-]{40,64}$/;

export class FirmaApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** Token del fragmento `#t=`; lo quita de la URL. Si no hay, usa el de esta pestaña. */
export function tomarTokenDeUrl(loc: Pick<Location, "hash" | "pathname" | "search"> = window.location): string {
  const params = new URLSearchParams(loc.hash.replace(/^#/, ""));
  const desdeHash = params.get("t") || "";
  if (desdeHash) {
    window.history.replaceState(null, "", `${loc.pathname}${loc.search}`);
    if (TOKEN_RE.test(desdeHash)) {
      try {
        sessionStorage.setItem(STORAGE_KEY, desdeHash);
      } catch {
        /* modo privado: queda solo en memoria */
      }
      return desdeHash;
    }
    return "";
  }
  try {
    const guardado = sessionStorage.getItem(STORAGE_KEY) || "";
    return TOKEN_RE.test(guardado) ? guardado : "";
  } catch {
    return "";
  }
}

export function olvidarToken() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada */
  }
}

type Creds = { token: string; sesion?: string };

function headers(c: Creds, extra: Record<string, string> = {}): HeadersInit {
  return {
    "X-Firma-Token": c.token,
    ...(c.sesion ? { "X-Firma-Sesion": c.sesion } : {}),
    ...extra,
  };
}

async function llamar(path: string, c: Creds, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`${BASE}${path}`), {
      ...init,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: headers(c, (init.headers as Record<string, string>) || {}),
    });
  } catch {
    throw new FirmaApiError("No hay conexión. Revisa tu internet e intenta de nuevo.", 0);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const msg = typeof data.detail === "string" ? data.detail : "Ocurrió un error. Intenta de nuevo.";
    throw new FirmaApiError(msg, res.status, data);
  }
  return res;
}

const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export type EstadoFirma = {
  folio: string;
  prestador: string;
  marca: string;
  correo: string;
  expira_at: string;
  bloqueado: boolean;
  codigo_vigente: boolean;
  reenviar_en: number;
};

export const obtenerEstado = async (token: string) =>
  (await (await llamar("estado/", { token })).json()) as EstadoFirma;

export const enviarCodigo = async (token: string) =>
  (await (await llamar("otp/enviar/", { token }, postJson({}))).json()) as {
    correo: string;
    expira_at: string;
    reenviar_en: number;
  };

export const verificarCodigo = async (token: string, codigo: string) =>
  (await (await llamar("otp/verificar/", { token }, postJson({ codigo }))).json()) as {
    sesion: string;
    expira_at: string;
  };

export async function obtenerDocumento(token: string, sesion: string): Promise<{ blob: Blob; sha256: string }> {
  const res = await llamar("documento/", { token, sesion });
  return { blob: await res.blob(), sha256: res.headers.get("X-Documento-Sha256") || "" };
}

export const firmar = async (
  token: string,
  sesion: string,
  body: { firma: string; nombre: string; acepta: boolean; documento_sha256: string },
) => (await (await llamar("firmar/", { token, sesion }, postJson(body))).json()) as { completado: boolean; folio: string };

export async function descargarPdfFinal(token: string, sesion: string): Promise<Blob> {
  return (await llamar("pdf-final/", { token, sesion })).blob();
}
