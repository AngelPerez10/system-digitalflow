import { useCallback, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Modal } from "@/components/ui/modal";
import {
  compressImage,
  getPublicIdFromUrl,
} from "../../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import {
  deleteProyectoImageFromCloudinary,
  uploadProyectoImageToCloudinary,
} from "../../shared/proyectoImageApi";
import {
  isHeicLikeFile,
  isLikelyImageFile,
  PROYECTO_IMAGE_ACCEPT,
  proyectoImageProcessErrorMessage,
  proyectoImageRejectMessage,
} from "../../shared/proyectoImageUpload";
import { proyectoSectionHintClass } from "../../shared/proyectoPageStyles";

const PROYECTO_MAX_FOTOS = 10;
const PROYECTO_FOTOS_FOLDER = "proyectos/evidencias";

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

/**
 * Evidencia fotográfica vía `/api/proyectos/upload-image/`.
 * Pensado para técnicos en celular (MIME vacío / HEIC / subidas lentas).
 */
export function ProyectoEvidenciasField({ urls, onChange, disabled = false }: Props) {
  const [uploading, setUploading] = useState(false);
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

  // Evita perder fotos si hay dos subidas en paralelo (red lenta en celular).
  const urlsRef = useRef(urls);
  urlsRef.current = Array.isArray(urls) ? urls : [];

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (disabled) return;
      setUploadError("");

      if (fileRejections.length) {
        const first = fileRejections[0]?.file;
        setUploadError(proyectoImageRejectMessage(first?.name));
      }

      const current = urlsRef.current;
      const remaining = PROYECTO_MAX_FOTOS - current.length;
      if (remaining <= 0) {
        setUploadError(`Ya alcanzaste el máximo de ${PROYECTO_MAX_FOTOS} fotos.`);
        return;
      }

      // Salvamos archivos con MIME vacío (cámara móvil) que dropzone a veces rechaza.
      const fromAccepted = acceptedFiles.filter(isLikelyImageFile);
      const fromRejected = fileRejections.map((r) => r.file).filter(isLikelyImageFile);
      const merged = [...fromAccepted];
      for (const f of fromRejected) {
        if (!merged.includes(f)) merged.push(f);
      }

      const heicFiles = merged.filter(isHeicLikeFile);
      const files = merged.filter((f) => !isHeicLikeFile(f)).slice(0, remaining);

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

      setUploading(true);
      try {
        const uploaded: string[] = [];
        const failures: string[] = [];
        for (const file of files) {
          try {
            const compressed = await compressImage(file, 80, 1400, 1400);
            const result = await uploadProyectoImageToCloudinary(compressed, PROYECTO_FOTOS_FOLDER);
            if (result.ok) {
              uploaded.push(result.url);
            } else {
              failures.push(`${file.name}: ${result.message}`);
            }
          } catch (err) {
            console.error("Error al subir evidencia de proyecto:", err);
            failures.push(proyectoImageProcessErrorMessage(file));
          }
        }
        if (uploaded.length) {
          const next = [...urlsRef.current, ...uploaded].slice(0, PROYECTO_MAX_FOTOS);
          urlsRef.current = next;
          onChange(next);
        }
        if (heicFiles.length) {
          failures.push(proyectoImageRejectMessage(heicFiles[0]?.name));
        }
        if (failures.length) {
          setUploadError(
            failures.length === 1
              ? failures[0]
              : `No se pudieron subir ${failures.length} imagen(es). ${failures[0]}`
          );
        }
      } finally {
        setUploading(false);
      }
    },
    [disabled, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxFiles: PROYECTO_MAX_FOTOS,
    disabled: disabled || uploading,
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
      console.error("Error al eliminar evidencia de proyecto:", err);
    } finally {
      urlsRef.current = updated;
      onChange(updated);
      setConfirmDelete({ open: false, index: null, url: null });
      setDeleting(false);
    }
  };

  const displayUrls = Array.isArray(urls) ? urls : [];

  return (
    <div className="space-y-3">
      <p className={proyectoSectionHintClass}>
        Máximo {PROYECTO_MAX_FOTOS} fotos · JPG o PNG recomendado en celular. En iPhone usa «Más
        compatible» (no HEIC). Las fotos se ven aquí al subir; guarda el proyecto para conservarlas.
      </p>

      {uploadError ? (
        <p
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          role="alert"
        >
          {uploadError}
        </p>
      ) : null}

      {!disabled ? (
        <div className="cursor-pointer rounded-xl border border-dashed border-[#d6d3d1] transition hover:border-[#ff801f] dark:border-[#334155] dark:hover:border-[#ff801f]">
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
            <div className="m-0 flex flex-col items-center">
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
                    : `Toca para elegir o tomar fotos (máx. ${PROYECTO_MAX_FOTOS})`}
              </p>
              <p className="mt-1 text-center text-[12px] text-[#78716c] dark:text-[#8ea0b8]">
                JPG / PNG · {displayUrls.length}/{PROYECTO_MAX_FOTOS}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {uploading ? (
        <p className="text-sm text-[#57534e] dark:text-[#b7c1d1]" role="status" aria-live="polite">
          Subiendo fotos… no cierres el modal.
        </p>
      ) : null}

      {displayUrls.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5" aria-label="Evidencias del proyecto">
          {displayUrls.map((url, index) => (
            <li key={`${url}-${index}`} className="group relative">
              <button
                type="button"
                onClick={() => setPreview({ open: true, url, index })}
                className="block w-full cursor-zoom-in overflow-hidden rounded-lg border-2 border-[#e2d9ca] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40 dark:border-[#334155]"
                aria-label={`Ver evidencia ${index + 1} en tamaño completo`}
              >
                {brokenUrls[url] ? (
                  <div className="flex h-24 w-full items-center justify-center bg-[#f5f0e8] px-2 text-center text-[11px] text-[#78716c] dark:bg-[#1e293b] dark:text-[#8ea0b8]">
                    No se pudo mostrar la miniatura
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`Evidencia ${index + 1}`}
                    className="pointer-events-none h-24 w-full object-cover"
                    loading="lazy"
                    decoding="async"
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
                  className="absolute top-1 right-1 z-[1] flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full bg-rose-600 text-white opacity-100 transition hover:bg-rose-700 sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 sm:opacity-0 sm:group-hover:opacity-100"
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
              referrerPolicy="no-referrer"
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
