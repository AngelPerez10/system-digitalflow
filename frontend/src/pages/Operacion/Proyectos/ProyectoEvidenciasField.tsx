import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Modal } from "@/components/ui/modal";
import {
  compressImage,
  deleteImageFromCloudinary,
  getPublicIdFromUrl,
  uploadImageToCloudinary,
} from "../OrdenesTrabajo/OrdenServicio/useOrdenesShared";
import { proyectoSectionHintClass } from "./proyectoPageStyles";

const PROYECTO_MAX_FOTOS = 10;
const PROYECTO_FOTOS_FOLDER = "proyectos/evidencias";

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

/**
 * Evidencia fotográfica reutilizando upload/delete de Órdenes
 * (`compressImage`, `uploadImageToCloudinary`, `deleteImageFromCloudinary`).
 */
export function ProyectoEvidenciasField({ urls, onChange, disabled = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<{ open: boolean; url: string; index: number }>({
    open: false,
    url: "",
    index: -1,
  });
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    index: number | null;
    url: string | null;
  }>({ open: false, index: null, url: null });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;
      const current = Array.isArray(urls) ? urls : [];
      const remaining = PROYECTO_MAX_FOTOS - current.length;
      if (remaining <= 0) return;

      const files = acceptedFiles.slice(0, remaining).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;

      setUploading(true);
      try {
        const uploaded: string[] = [];
        for (const file of files) {
          try {
            const compressed = await compressImage(file, 80, 1400, 1400);
            const url = await uploadImageToCloudinary(compressed, PROYECTO_FOTOS_FOLDER);
            if (url) uploaded.push(url);
          } catch (err) {
            console.error("Error al subir evidencia de proyecto:", err);
          }
        }
        if (uploaded.length) onChange([...current, ...uploaded]);
      } finally {
        setUploading(false);
      }
    },
    [disabled, onChange, urls]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxFiles: PROYECTO_MAX_FOTOS,
    disabled: disabled || uploading,
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
      "image/svg+xml": [],
    },
  });

  const handleDelete = async () => {
    if (confirmDelete.index == null || !confirmDelete.url) return;
    const index = confirmDelete.index;
    const url = confirmDelete.url;
    const updated = urls.filter((_, i) => i !== index);

    setDeleting(true);
    try {
      const publicId = getPublicIdFromUrl(url);
      if (publicId) {
        await deleteImageFromCloudinary(publicId);
      }
    } catch (err) {
      console.error("Error al eliminar evidencia de proyecto:", err);
    } finally {
      onChange(updated);
      setConfirmDelete({ open: false, index: null, url: null });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className={proyectoSectionHintClass}>
        Máximo {PROYECTO_MAX_FOTOS} fotos · PNG, JPG, WebP o SVG.
      </p>

      {!disabled ? (
        <div className="transition border border-dashed border-[#d6d3d1] rounded-xl cursor-pointer hover:border-[#ff801f] dark:border-[#334155] dark:hover:border-[#ff801f]">
          <div
            {...getRootProps()}
            className={`rounded-xl p-4 sm:p-5 ${
              isDragActive
                ? "border-[#ff801f] bg-[#fff8f1] dark:bg-[#1e293b]"
                : "bg-[#fcfaf6]/80 dark:bg-[#0f172a]/40"
            }`}
            role="button"
            tabIndex={0}
            aria-label="Subir evidencia fotográfica"
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center m-0">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f0e8] text-[#57534e] dark:bg-[#1e293b] dark:text-[#94a3b8]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                {uploading
                  ? "Subiendo…"
                  : isDragActive
                    ? "Suelta aquí para subir"
                    : `Haz clic o arrastra imágenes (máx. ${PROYECTO_MAX_FOTOS})`}
              </p>
              <p className="mt-1 text-center text-[12px] text-[#78716c] dark:text-[#8ea0b8]">
                PNG, JPG, WebP o SVG · {urls.length}/{PROYECTO_MAX_FOTOS}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {urls.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5" aria-label="Evidencias del proyecto">
          {urls.map((url, index) => (
            <li key={`${url}-${index}`} className="relative group">
              <button
                type="button"
                onClick={() => setPreview({ open: true, url, index })}
                className="block w-full cursor-zoom-in overflow-hidden rounded-lg border-2 border-[#e2d9ca] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40 dark:border-[#334155]"
                aria-label={`Ver evidencia ${index + 1} en tamaño completo`}
              >
                <img src={url} alt={`Evidencia ${index + 1}`} className="h-24 w-full object-cover pointer-events-none" />
              </button>
              {!disabled ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete({ open: true, index, url });
                  }}
                  className="absolute top-1 right-1 z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white opacity-100 transition hover:bg-rose-700 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Eliminar evidencia ${index + 1}`}
                  title="Eliminar imagen"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#78716c] dark:text-[#8ea0b8]" role="status">
          Aún no hay evidencias.
        </p>
      )}

      <Modal
        isOpen={preview.open}
        onClose={() => setPreview({ open: false, url: "", index: -1 })}
        ariaLabel={`Evidencia ${preview.index + 1}`}
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 dark:border-[#273244] dark:bg-[#111a2b]"
      >
        <div className="p-3 sm:p-4">
          {preview.url ? (
            <img
              src={preview.url}
              alt={`Evidencia ${preview.index + 1} ampliada`}
              className="max-h-[75vh] w-full object-contain"
            />
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={confirmDelete.open}
        onClose={() => !deleting && setConfirmDelete({ open: false, index: null, url: null })}
        ariaLabel="Confirmar eliminación de evidencia"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-5 dark:border-[#273244] dark:bg-[#111a2b]"
      >
        <h3 className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">Eliminar evidencia</h3>
        <p className="mt-2 text-sm text-[#57534e] dark:text-[#b7c1d1]">
          ¿Seguro que deseas eliminar esta foto? Esta acción no se puede deshacer.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={deleting}
            className="rounded-lg border border-[#e2d9ca] bg-white px-3 py-2 text-sm font-semibold dark:border-[#334155] dark:bg-[#0f172a]"
            onClick={() => setConfirmDelete({ open: false, index: null, url: null })}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting}
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            onClick={() => void handleDelete()}
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
