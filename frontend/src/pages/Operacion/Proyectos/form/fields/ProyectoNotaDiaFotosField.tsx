import { useMemo, useState } from "react";
import { Camera, ImageOff, Loader2, Trash2, X } from "lucide-react";
import { AppConfirmDialog } from "@/components/ui/modal-kit/ModalKit";
import { focusRing, fontSans } from "../../shared/proyectoTokens";
import { ProyectoImageLightbox } from "./ProyectoImageLightbox";
import { useProyectoImageUploader } from "./useProyectoImageUploader";

export const PROYECTO_NOTA_MAX_FOTOS = 2;
const PROYECTO_NOTA_FOTOS_FOLDER = "proyectos/bitacora";

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
  /** Para aria-labels (ej. "día 1"). */
  diaLabel: string;
  disabled?: boolean;
};

/** Hasta 2 fotos por jornada: franja compacta bajo la nota (se puede soltar encima). */
export function ProyectoNotaDiaFotosField({ urls, onChange, diaLabel, disabled = false }: Props) {
  const safeUrls = useMemo(
    () => (Array.isArray(urls) ? urls.filter(Boolean).slice(0, PROYECTO_NOTA_MAX_FOTOS) : []),
    [urls]
  );
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const up = useProyectoImageUploader({
    urls: safeUrls,
    onChange,
    maxTotal: PROYECTO_NOTA_MAX_FOTOS,
    folder: PROYECTO_NOTA_FOTOS_FOLDER,
    disabled,
    compact: true,
  });

  return (
    <div
      {...up.getRootProps({
        className: `rounded-[12px] transition-colors duration-200 ${
          up.isDragActive ? "bg-[#F5F8FF] ring-2 ring-[#BFD3FF] dark:bg-[#1B2A63]/40 dark:ring-[#2C3F7A]" : ""
        }`,
      })}
    >
      <input {...up.getInputProps()} />

      {up.error ? (
        <p className="mb-2 text-[12px] font-medium text-[#C22B2B] dark:text-[#F87171]" role="alert">
          {up.error}
        </p>
      ) : null}

      <ul className="flex flex-wrap items-center gap-2" aria-label={`Fotos del ${diaLabel}`}>
        {safeUrls.map((url, index) => (
          <li key={`${url}-${index}`} className="cot-pop group relative">
            <button
              type="button"
              onClick={() => setPreviewIndex(index)}
              className={`block size-14 overflow-hidden rounded-[10px] bg-[#F4F4F5] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:ring-[#273244] ${focusRing}`}
              aria-label={`Ver foto ${index + 1} del ${diaLabel}`}
            >
              {broken[url] ? (
                <span className="flex h-full w-full items-center justify-center text-[#A1A1AA]">
                  <ImageOff className="size-4" aria-hidden />
                </span>
              ) : (
                <img
                  src={url}
                  alt={`Foto ${index + 1} del ${diaLabel}`}
                  className="pointer-events-none h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setBroken((prev) => ({ ...prev, [url]: true }))}
                />
              )}
            </button>
            {!disabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  up.requestDelete(index, url);
                }}
                className="absolute -right-1.5 -top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-white text-[#52525B] shadow-[0_1px_3px_rgba(9,9,11,0.2)] ring-1 ring-[#E4E4E7] hover:bg-[#FEF2F2] hover:text-[#C22B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:bg-[#1B2539] dark:text-[#B7C1D1] dark:ring-[#273244]"
                aria-label={`Quitar foto ${index + 1} del ${diaLabel}`}
                title="Quitar"
              >
                <X className="size-3" aria-hidden />
              </button>
            ) : null}
          </li>
        ))}

        {up.remaining > 0 && !disabled ? (
          <li>
            <button
              type="button"
              onClick={() => up.open()}
              disabled={up.uploading}
              className={`cot-press inline-flex h-14 items-center gap-2 rounded-[10px] border border-dashed border-[#D4D4D8] px-3.5 text-[12.5px] font-medium text-[#52525B] hover:border-[#BFD3FF] hover:bg-[#F5F8FF] hover:text-[#1244D1] disabled:opacity-60 dark:border-[#3A4661] dark:text-[#B7C1D1] dark:hover:border-[#2C3F7A] dark:hover:bg-[#1B2A63]/30 ${focusRing}`}
              aria-label={`Adjuntar foto al ${diaLabel}. Quedan ${up.remaining}`}
              aria-busy={up.uploading}
            >
              {up.uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
              {up.uploading
                ? up.progress
                  ? `${up.progress.done}/${up.progress.total}`
                  : "Subiendo…"
                : safeUrls.length === 0
                  ? "Agregar foto"
                  : "Otra foto"}
            </button>
          </li>
        ) : null}
        {safeUrls.length === 0 && !up.uploading ? (
          <li className="text-[12px] text-[#A1A1AA] dark:text-[#64748B]">Opcional · máx. {PROYECTO_NOTA_MAX_FOTOS}</li>
        ) : null}
      </ul>

      <ProyectoImageLightbox urls={safeUrls} index={previewIndex} onIndexChange={setPreviewIndex} label={`Foto del ${diaLabel}`} />

      <AppConfirmDialog
        open={up.pendingDelete != null}
        onClose={up.cancelDelete}
        onConfirm={up.confirmDelete}
        tone="danger"
        icon={<Trash2 className="size-5" />}
        title="Quitar foto"
        description={`Se quitará esta foto del ${diaLabel}.`}
        confirmLabel="Quitar"
        busyLabel="Quitando…"
        className={fontSans}
      />
    </div>
  );
}
