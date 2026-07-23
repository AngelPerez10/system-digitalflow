import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Modal } from "@/components/ui/modal";
import {
  compressImage,
  deleteImageFromCloudinary,
  getPublicIdFromUrl,
  uploadImageToCloudinary,
} from "../OrdenesTrabajo/OrdenServicio/useOrdenesShared";

export const PROYECTO_NOTA_MAX_FOTOS = 2;
const PROYECTO_NOTA_FOTOS_FOLDER = "proyectos/bitacora";

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
  /** Para aria-labels (ej. "día 1"). */
  diaLabel: string;
  disabled?: boolean;
};

/**
 * Hasta 2 fotos por jornada — franja discreta bajo la nota (sin dropzone grande).
 */
export function ProyectoNotaDiaFotosField({
  urls,
  onChange,
  diaLabel,
  disabled = false,
}: Props) {
  const safeUrls = useMemo(
    () => (Array.isArray(urls) ? urls.filter(Boolean).slice(0, PROYECTO_NOTA_MAX_FOTOS) : []),
    [urls]
  );
  const remaining = PROYECTO_NOTA_MAX_FOTOS - safeUrls.length;
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
      if (disabled || remaining <= 0) return;
      const files = acceptedFiles.slice(0, remaining).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;

      setUploading(true);
      try {
        const uploaded: string[] = [];
        for (const file of files) {
          try {
            const compressed = await compressImage(file, 80, 1400, 1400);
            const url = await uploadImageToCloudinary(compressed, PROYECTO_NOTA_FOTOS_FOLDER);
            if (url) uploaded.push(url);
          } catch (err) {
            console.error("Error al subir foto de bitácora:", err);
          }
        }
        if (uploaded.length) onChange([...safeUrls, ...uploaded].slice(0, PROYECTO_NOTA_MAX_FOTOS));
      } finally {
        setUploading(false);
      }
    },
    [disabled, onChange, remaining, safeUrls]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: remaining > 1,
    maxFiles: Math.max(remaining, 1),
    disabled: disabled || uploading || remaining <= 0,
    noClick: true,
    noKeyboard: true,
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
    const updated = safeUrls.filter((_, i) => i !== index);

    setDeleting(true);
    try {
      const publicId = getPublicIdFromUrl(url);
      if (publicId) {
        await deleteImageFromCloudinary(publicId);
      }
    } catch (err) {
      console.error("Error al eliminar foto de bitácora:", err);
    } finally {
      onChange(updated);
      setConfirmDelete({ open: false, index: null, url: null });
      setDeleting(false);
    }
  };

  const statusText = uploading
    ? "Subiendo…"
    : isDragActive
      ? "Suelta para adjuntar"
      : safeUrls.length === 0
        ? "Opcional · máx. 2"
        : `${safeUrls.length}/${PROYECTO_NOTA_MAX_FOTOS}`;

  return (
    <div
      className={`rounded-lg transition-colors ${
        isDragActive ? "bg-[#ff801f]/[0.06] ring-1 ring-[#ff801f]/25" : ""
      }`}
      {...getRootProps()}
    >
      <input {...getInputProps()} />

      <div className="flex flex-wrap items-center gap-2">
        <ul className="flex flex-wrap items-center gap-1.5" aria-label={`Fotos del ${diaLabel}`}>
          {safeUrls.map((url, index) => (
            <li key={`${url}-${index}`} className="group relative">
              <button
                type="button"
                onClick={() => setPreview({ open: true, url, index })}
                className="block h-11 w-11 overflow-hidden rounded-md border border-[#e7ded0]/90 bg-[#fcfaf6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/30 dark:border-[#334155] dark:bg-[#0f172a]"
                aria-label={`Ver foto ${index + 1} del ${diaLabel}`}
              >
                <img
                  src={url}
                  alt={`Foto ${index + 1} del ${diaLabel}`}
                  className="h-full w-full object-cover pointer-events-none"
                />
              </button>
              {!disabled ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete({ open: true, index, url });
                  }}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#e7ded0] bg-white text-[10px] leading-none text-[#78716c] opacity-0 shadow-sm transition hover:border-rose-200 hover:text-rose-600 focus:opacity-100 focus:outline-none group-hover:opacity-100 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#94a3b8]"
                  aria-label={`Quitar foto ${index + 1} del ${diaLabel}`}
                  title="Quitar"
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}

          {remaining > 0 && !disabled ? (
            <li>
              <button
                type="button"
                onClick={() => open()}
                disabled={uploading}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border border-transparent px-2 text-[11px] font-medium text-[#78716c] transition hover:border-[#e7ded0] hover:bg-[#fcfaf6] hover:text-[#57534e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/25 disabled:opacity-50 dark:text-[#8ea0b8] dark:hover:border-[#334155] dark:hover:bg-[#111a2b] dark:hover:text-[#cbd5e1]"
                aria-label={`Adjuntar foto al ${diaLabel}. Quedan ${remaining}`}
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0 opacity-70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  aria-hidden
                >
                  <path
                    d="M4 16l4.5-4.5a2 2 0 0 1 2.8 0L16 16m-2-2 1.5-1.5a2 2 0 0 1 2.8 0L20 14M8 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {uploading ? "Subiendo…" : safeUrls.length === 0 ? "Adjuntar foto" : "Otra foto"}
              </button>
            </li>
          ) : null}
        </ul>

        <span className="text-[10px] tabular-nums text-[#a8a29e] dark:text-[#64748b]" aria-live="polite">
          {statusText}
        </span>
      </div>

      <Modal
        isOpen={preview.open}
        onClose={() => setPreview({ open: false, url: "", index: -1 })}
        ariaLabel={`Foto ${preview.index + 1} del ${diaLabel}`}
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 dark:border-[#273244] dark:bg-[#111a2b]"
      >
        <div className="p-3 sm:p-4">
          {preview.url ? (
            <img
              src={preview.url}
              alt={`Foto ${preview.index + 1} del ${diaLabel} ampliada`}
              className="max-h-[75vh] w-full object-contain"
            />
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={confirmDelete.open}
        onClose={() => !deleting && setConfirmDelete({ open: false, index: null, url: null })}
        ariaLabel="Confirmar eliminación de foto de bitácora"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-5 dark:border-[#273244] dark:bg-[#111a2b]"
      >
        <h3 className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">Quitar foto</h3>
        <p className="mt-2 text-sm text-[#57534e] dark:text-[#b7c1d1]">
          ¿Quitar esta foto del {diaLabel}?
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
            {deleting ? "Quitando…" : "Quitar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
