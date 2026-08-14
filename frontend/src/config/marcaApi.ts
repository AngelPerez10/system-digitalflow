import { fetchApi } from "@/config/api";
import { resolveApiFetchUrl } from "@/config/apiBase";
import { MARCA_NOMBRE_DEFAULT } from "@/config/marcaIniciales";

export type MarcaPayload = {
  nombre: string;
  logo_url: string;
};

export const MARCA_FALLBACK_LOGO = "/images/logo/intrax-logo.png";

export function parseMarcaPayload(data: unknown): MarcaPayload {
  if (!data || typeof data !== "object") {
    return { nombre: MARCA_NOMBRE_DEFAULT, logo_url: "" };
  }
  const row = data as { nombre?: unknown; logo_url?: unknown };
  const nombre =
    typeof row.nombre === "string" && row.nombre.trim()
      ? row.nombre.trim()
      : MARCA_NOMBRE_DEFAULT;
  const rawLogo = typeof row.logo_url === "string" ? row.logo_url.trim() : "";
  const logo_url =
    rawLogo && !rawLogo.toLowerCase().startsWith("data:") && /^https?:\/\//i.test(rawLogo)
      ? rawLogo
      : "";
  return { nombre, logo_url };
}

export async function fetchMarcaPublic(): Promise<MarcaPayload> {
  const res = await fetch(resolveApiFetchUrl("/api/v1/marca/"), {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (data && typeof data === "object" && "detail" in data
        ? String((data as { detail?: unknown }).detail)
        : "") || "No se pudo cargar la marca",
    );
  }
  return parseMarcaPayload(data);
}

export async function patchMarca(payload: {
  nombre?: string;
  clear_logo?: boolean;
}): Promise<MarcaPayload> {
  const res = await fetchApi("/api/v1/marca/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "nombre" in data
        ? String((data as { nombre?: unknown }).nombre)
        : data && typeof data === "object" && "detail" in data
          ? String((data as { detail?: unknown }).detail)
          : "";
    throw new Error(detail || "No se pudo guardar");
  }
  return parseMarcaPayload(data);
}

export async function uploadMarcaLogo(dataUrl: string): Promise<MarcaPayload> {
  const res = await fetchApi("/api/v1/marca/logo/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_url: dataUrl }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail?: unknown }).detail)
        : "";
    throw new Error(detail || "No se pudo subir el logo");
  }
  return parseMarcaPayload(data);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}
