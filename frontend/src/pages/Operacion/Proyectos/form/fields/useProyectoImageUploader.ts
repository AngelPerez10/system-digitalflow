import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { getPublicIdFromUrl } from "../../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { deleteProyectoImageFromCloudinary } from "../../shared/proyectoImageApi";
import {
  collectProyectoImageFiles,
  PROYECTO_IMAGE_ACCEPT,
  proyectoImageRejectMessage,
  uploadProyectoImageBatch,
} from "../../shared/proyectoImageUpload";

type Args = {
  urls: string[];
  onChange: (urls: string[]) => void;
  maxTotal: number;
  folder: string;
  disabled?: boolean;
  /** Sin zona clicable: se abre el selector con `open()`. */
  compact?: boolean;
};

/**
 * Subida por lotes a `/api/proyectos/upload-image/` con progreso, rechazo de
 * HEIC y borrado en Cloudinary. Compartido por evidencias y fotos de bitácora.
 * Pensado para celular (MIME vacío / varias fotos a la vez).
 */
export function useProyectoImageUploader({ urls, onChange, maxTotal, folder, disabled = false, compact = false }: Args) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ index: number; url: string } | null>(null);

  const urlsRef = useRef(urls);
  const uploadingRef = useRef(false);

  // No pisar urlsRef con props viejas mientras hay una subida en curso.
  useEffect(() => {
    if (!uploadingRef.current) urlsRef.current = urls;
  }, [urls]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (disabled || uploadingRef.current) return;
      setError("");

      const slotsLeft = maxTotal - urlsRef.current.length;
      if (slotsLeft <= 0) {
        setError(`Ya alcanzaste el máximo de ${maxTotal} fotos.`);
        return;
      }
      if (fileRejections.length) setError(proyectoImageRejectMessage(fileRejections[0]?.file?.name));

      const { files, heicFiles } = collectProyectoImageFiles(
        acceptedFiles,
        fileRejections.map((r) => r.file),
        slotsLeft
      );
      if (heicFiles.length && !files.length) {
        setError(proyectoImageRejectMessage(heicFiles[0]?.name));
        return;
      }
      if (!files.length) {
        if (!fileRejections.length) setError("No se encontraron imágenes para subir.");
        return;
      }

      uploadingRef.current = true;
      setUploading(true);
      setProgress({ done: 0, total: files.length });
      try {
        const { failures } = await uploadProyectoImageBatch({
          files,
          folder,
          maxTotal,
          getCurrentUrls: () => urlsRef.current,
          onUrlsChange: (next) => {
            urlsRef.current = next;
            onChange(next);
          },
          onProgress: setProgress,
        });
        const all = [...failures];
        if (heicFiles.length) all.push(proyectoImageRejectMessage(heicFiles[0]?.name));
        if (all.length) {
          setError(all.length === 1 ? all[0] : `No se pudieron subir ${all.length} imágenes. ${all[0]}`);
        }
      } finally {
        uploadingRef.current = false;
        setUploading(false);
        setProgress(null);
      }
    },
    [disabled, folder, maxTotal, onChange]
  );

  const remaining = maxTotal - urls.length;
  const dropzone = useDropzone({
    onDrop,
    multiple: remaining > 1,
    maxFiles: Math.max(remaining, 1),
    disabled: disabled || uploading || remaining <= 0,
    noClick: compact,
    noKeyboard: compact,
    accept: PROYECTO_IMAGE_ACCEPT,
  });

  /** Borra en Cloudinary y quita la URL (aunque falle el borrado remoto). */
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { index, url } = pendingDelete;
    const updated = urlsRef.current.filter((_, i) => i !== index);
    try {
      const publicId = getPublicIdFromUrl(url);
      if (publicId) await deleteProyectoImageFromCloudinary(publicId);
    } catch (err) {
      console.error("Error al eliminar imagen de proyecto:", err);
    } finally {
      urlsRef.current = updated;
      onChange(updated);
    }
  };

  return {
    ...dropzone,
    uploading,
    progress,
    error,
    remaining,
    pendingDelete,
    requestDelete: (index: number, url: string) => setPendingDelete({ index, url }),
    cancelDelete: () => setPendingDelete(null),
    confirmDelete,
  };
}
