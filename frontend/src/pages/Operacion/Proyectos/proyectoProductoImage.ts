import { resolveMediaUrl } from "@/config/api";
import { getProductoImageUrl, getTvcProductoImageUrl } from "@/pages/ProductosYServicios/syscomCatalog";

/**
 * Resuelve miniatura de producto para Proyectos:
 * URL absoluta, media/Cloudinary (manual) o path de portada Syscom/TVC.
 */
export function resolveProyectoProductoImageUrl(url?: string | null): string | null {
  const s = String(url || "").trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) return s;

  const media = resolveMediaUrl(s);
  if (media && (s.startsWith("/") || s.includes("cloudinary") || s.startsWith("productos/"))) {
    return media;
  }

  // Paths relativos TVC suelen venir con cdn / productos TVC.
  if (s.includes("tvc") || s.startsWith("cdn/")) {
    const tvc = getTvcProductoImageUrl(s);
    if (tvc) return tvc;
  }

  const syscom = getProductoImageUrl(s);
  if (syscom) return syscom;

  return media || null;
}
