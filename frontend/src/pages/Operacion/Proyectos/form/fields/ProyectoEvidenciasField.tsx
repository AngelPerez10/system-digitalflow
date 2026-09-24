import { useState, type CSSProperties } from "react";
import { ImageOff, ImagePlus, Trash2, X } from "lucide-react";
import { AppConfirmDialog } from "@/components/ui/modal-kit/ModalKit";
import { Notice, ProgressBar } from "../../shared/ProyectoUi";
import { focusRing, fontSans } from "../../shared/proyectoTokens";
import { ProyectoImageLightbox } from "./ProyectoImageLightbox";
import { useProyectoImageUploader } from "./useProyectoImageUploader";

export const PROYECTO_MAX_FOTOS = 10;
const PROYECTO_FOTOS_FOLDER = "proyectos/evidencias";

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

/** Evidencia fotográfica del proyecto (hasta 10 fotos). */
export function ProyectoEvidenciasField({ urls, onChange, disabled = false }: Props) {
  const safeUrls = Array.isArray(urls) ? urls : [];
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const up = useProyectoImageUploader({
    urls: safeUrls,
    onChange,
    maxTotal: PROYECTO_MAX_FOTOS,
    folder: PROYECTO_FOTOS_FOLDER,
    disabled,
  });

  const full = up.remaining <= 0;

  return (
    <div className="space-y-4">
      {up.error ? (
        <Notice tone="danger" role="alert">
          {up.error}
        </Notice>
      ) : null}

      {!disabled && !full ? (
        <div
          {...up.getRootProps({
            className: `cot-press group flex cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed px-4 py-7 text-center transition-colors duration-200 ${focusRing} ${
              up.isDragActive
                ? "border-[#1B5CFF] bg-[#F5F8FF] dark:border-[#4B7CFF] dark:bg-[#1B2A63]/40"
                : "border-[#E4E4E7] bg-[#FAFAFA] hover:border-[#BFD3FF] hover:bg-[#F5F8FF] dark:border-[#273244] dark:bg-[#0F172A]/50 dark:hover:border-[#2C3F7A]"
            }`,
          })}
          role="button"
          aria-label="Subir evidencia fotográfica"
          aria-busy={up.uploading}
        >
          <input {...up.getInputProps()} />
          <span
            className={`mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-white text-[#1B5CFF] ring-1 ring-[#E4E4E7] transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none dark:bg-[#111827] dark:text-[#7EA0FF] dark:ring-[#273244] ${
              up.isDragActive ? "-translate-y-0.5" : ""
            }`}
          >
            <ImagePlus className="size-5" aria-hidden />
          </span>
          <p className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
            {up.uploading
              ? up.progress
                ? `Subiendo ${up.progress.done} de ${up.progress.total}…`
                : "Subiendo…"
              : up.isDragActive
                ? "Suelta para subir"
                : "Toca para tomar o elegir fotos"}
          </p>
          <p className="mt-1 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
            JPG o PNG · quedan {up.remaining} de {PROYECTO_MAX_FOTOS}
          </p>
          {up.uploading && up.progress ? (
            <ProgressBar
              value={(up.progress.done / up.progress.total) * 100}
              className="mt-3 w-40"
              label="Progreso de subida"
            />
          ) : null}
        </div>
      ) : null}

      {up.uploading ? (
        <p className="sr-only" role="status" aria-live="polite">
          Subiendo fotos, no cierres la ventana.
        </p>
      ) : null}

      {safeUrls.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5" aria-label="Evidencias del proyecto">
          {safeUrls.map((url, index) => (
            <li key={`${url}-${index}`} className="cot-pop group relative aspect-square" style={{ "--cot-i": index } as CSSProperties}>
              <button
                type="button"
                onClick={() => setPreviewIndex(index)}
                className={`block h-full w-full cursor-zoom-in overflow-hidden rounded-[12px] bg-[#F4F4F5] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:ring-[#273244] ${focusRing}`}
                aria-label={`Ver evidencia ${index + 1}`}
              >
                {broken[url] ? (
                  <span className="flex h-full w-full items-center justify-center text-[#A1A1AA]">
                    <ImageOff className="size-5" aria-hidden />
                  </span>
                ) : (
                  <img
                    src={url}
                    alt={`Evidencia ${index + 1}`}
                    className="pointer-events-none h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setBroken((prev) => ({ ...prev, [url]: true }))}
                  />
                )}
              </button>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => up.requestDelete(index, url)}
                  className="absolute right-1.5 top-1.5 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-opacity duration-150 hover:bg-[#C22B2B] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Eliminar evidencia ${index + 1}`}
                  title="Eliminar"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : disabled || full ? null : (
        <p className="text-[13px] text-[#71717A] dark:text-[#8EA0B8]" role="status">
          Aún no hay evidencias.
        </p>
      )}

      <ProyectoImageLightbox urls={safeUrls} index={previewIndex} onIndexChange={setPreviewIndex} label="Evidencia" />

      <AppConfirmDialog
        open={up.pendingDelete != null}
        onClose={up.cancelDelete}
        onConfirm={up.confirmDelete}
        tone="danger"
        icon={<Trash2 className="size-5" />}
        title="Eliminar evidencia"
        description="La foto se borra del almacenamiento. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        busyLabel="Eliminando…"
        className={fontSans}
      />
    </div>
  );
}
