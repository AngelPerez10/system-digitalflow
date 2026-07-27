import { fetchApi } from "@/config/api";

/** Upload de imágenes de proyectos (evidencias / bitácora / firmas). */
export async function uploadProyectoImageToCloudinary(
  compressed: string,
  folder: string = "proyectos/evidencias"
): Promise<string | null> {
  try {
    const resp = await fetchApi("/api/proyectos/upload-image/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_url: compressed, folder }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json().catch(() => null)) as { url?: string } | null;
    return data?.url ? String(data.url) : null;
  } catch {
    return null;
  }
}

export async function deleteProyectoImageFromCloudinary(publicId: string): Promise<void> {
  await fetchApi("/api/proyectos/delete-image/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_id: publicId }),
  });
}
