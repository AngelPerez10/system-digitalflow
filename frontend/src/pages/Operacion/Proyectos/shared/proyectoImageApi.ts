import { fetchApi } from "@/config/api";

export type ProyectoImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/** Upload de imágenes de proyectos (evidencias / bitácora / firmas). */
export async function uploadProyectoImageToCloudinary(
  compressed: string,
  folder: string = "proyectos/evidencias"
): Promise<ProyectoImageUploadResult> {
  try {
    const resp = await fetchApi("/api/proyectos/upload-image/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_url: compressed, folder }),
    });
    if (!resp.ok) {
      const body = (await resp.json().catch(() => null)) as { detail?: unknown } | null;
      const detail = body?.detail;
      const message =
        typeof detail === "string" && detail.trim()
          ? detail.trim()
          : resp.status === 502
            ? "No se pudo subir la imagen al servidor de archivos."
            : resp.status >= 500
              ? "El servidor no pudo guardar la imagen. Intenta de nuevo."
              : "No se pudo subir la imagen. Revisa el formato e inténtalo otra vez.";
      return { ok: false, message };
    }
    const data = (await resp.json().catch(() => null)) as { url?: string } | null;
    if (data?.url) return { ok: true, url: String(data.url) };
    return { ok: false, message: "La imagen se subió pero no se recibió una URL válida." };
  } catch {
    return {
      ok: false,
      message: "Error de red al subir la imagen. Revisa tu conexión e inténtalo de nuevo.",
    };
  }
}

export async function deleteProyectoImageFromCloudinary(publicId: string): Promise<void> {
  await fetchApi("/api/proyectos/delete-image/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_id: publicId }),
  });
}
