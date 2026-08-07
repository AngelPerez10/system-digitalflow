import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Modal } from "@/components/ui/modal";
import { getPublicIdFromUrl } from "../../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { deleteProyectoImageFromCloudinary } from "../../shared/proyectoImageApi";
import {
  collectProyectoImageFiles,
  PROYECTO_IMAGE_ACCEPT,
  proyectoImageRejectMessage,
  uploadProyectoImageBatch,
} from "../../shared/proyectoImageUpload";

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
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});
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

  const urlsRef = useRef(safeUrls);
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (!uploadingRef.current) {
      urlsRef.current = safeUrls;
    }
  }, [safeUrls]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (disabled || uploadingRef.current) return;
      setUploadError("");

      const slotsLeft = PROYECTO_NOTA_MAX_FOTOS - urlsRef.current.length;
      if (slotsLeft <= 0) {
        setUploadError(`Ya alcanzaste el máximo de ${PROYECTO_NOTA_MAX_FOTOS} fotos.`);
        return;
      }

      if (fileRejections.length) {
        setUploadError(proyectoImageRejectMessage(fileRejections[0]?.file?.name));
      }

      const { files, heicFiles } = collectProyectoImageFiles(
        acceptedFiles,
        fileRejections.map((r) => r.file),
        slotsLeft
      );

      if (heicFiles.length && !files.length) {
        setUploadError(proyectoImageRejectMessage(heicFiles[0]?.name));
        return;
      }

      if (!files.length) {
        if (!fileRejections.length) {
          setUploadError("No se encontraron imágenes para subir.");
        }
        return;
      }

      uploadingRef.current = true;
      setUploading(true);
      setUploadProgress({ done: 0, total: files.length });
      try {
        const { failures } = await uploadProyectoImageBatch({
          files,
          folder: PROYECTO_NOTA_FOTOS_FOLDER,
          maxTotal: PROYECTO_NOTA_MAX_FOTOS,
          getCurrentUrls: () => urlsRef.current,
          onUrlsChange: (next) => {
            urlsRef.current = next;
            onChange(next);
          },
          onProgress: setUploadProgress,
        });

        const allFailures = [...failures];
        if (heicFiles.length) {
          allFailures.push(proyectoImageRejectMessage(heicFiles[0]?.name));
        }
        if (allFailures.length) {
          setUploadError(
            allFailures.length === 1
              ? allFailures[0]
              : `No se pudieron subir ${allFailures.length} foto(s). ${allFailures[0]}`
          );
        }
      } finally {
        uploadingRef.current = false;
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [disabled, onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: remaining > 1,
    maxFiles: Math.max(remaining, 1),
    disabled: disabled || uploading || remaining <= 0,
    noClick: true,
    noKeyboard: true,
    accept: PROYECTO_IMAGE_ACCEPT,
  });

  const handleDelete = async () => {
    if (confirmDelete.index == null || !confirmDelete.url) return;
    const index = confirmDelete.index;
    const url = confirmDelete.url;
    const updated = urlsRef.current.filter((_, i) => i !== index);

    setDeleting(true);
    try {
      const publicId = getPublicIdFromUrl(url);
      if (publicId) {
        await deleteProyectoImageFromCloudinary(publicId);
      }
    } catch (err) {
      console.error("Error al eliminar foto de bitácora:", err);
    } finally {
      urlsRef.current = updated;
      onChange(updated);
      setConfirmDelete({ open: false, index: null, url: null });
      setDeleting(false);
    }
  };

  const statusText = uploading
    ? uploadProgress
      ? `${uploadProgress.done}/${uploadProgress.total}`
      : "Subiendo…"
    : isDragActive
      ? "Suelta para adjuntar"
      : safeUrls.length === 0
        ? "Opcional · máx. 2 · JPG"
        : `${safeUrls.length}/${PROYECTO_NOTA_MAX_FOTOS}`;

  return (
    <div
      className={`rounded-lg transition-colors ${
        isDragActive ? "bg-[#ff801f]/[0.06] ring-1 ring-[#ff801f]/25" : ""
      }`}
      {...getRootProps()}
    >
      <input {...getInputProps()} />

      {uploadError ? (
        <p
          className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          role="alert"
        >
          {uploadError}
        </p>
      ) : null}

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
                {brokenUrls[url] ? (
                  <span className="flex h-full w-full items-center justify-center text-[9px] text-[#78716c]">
                    —
                  </span>
                ) : (
                  <img
                    src={url}
                    alt={`Foto ${index + 1} del ${diaLabel}`}
                    className="pointer-events-none h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setBrokenUrls((prev) => ({ ...prev, [url]: true }))}
                  />
                )}
              </button>
              {!disabled ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete({ open: true, index, url });
                  }}
                  className="absolute -right-1 -top-1 flex h-6 w-6 min-h-[24px] min-w-[24px] items-center justify-center rounded-full border border-[#e7ded0] bg-white text-[10px] leading-none text-[#78716c] shadow-sm transition hover:border-rose-200 hover:text-rose-600 focus:outline-none dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#94a3b8]"
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
                aria-busy={uploading}
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
