import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { fontSans } from "../../shared/proyectoTokens";

type Props = {
  urls: string[];
  /** Índice abierto; `null` = cerrado. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** Prefijo del nombre accesible («Evidencia», «Foto del día 2»…). */
  label: string;
};

const navBtn =
  "cot-press inline-flex size-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-0";

/** Visor de fotos con navegación por flechas (teclado y botones). */
export function ProyectoImageLightbox({ urls, index, onIndexChange, label }: Props) {
  const open = index != null && index >= 0 && index < urls.length;
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && index! < urls.length - 1) onIndexChange(index! + 1);
      if (e.key === "ArrowLeft" && index! > 0) onIndexChange(index! - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, index, urls.length, onIndexChange]);

  const current = open ? urls[index!] : "";

  return (
    <Modal
      isOpen={open}
      onClose={() => onIndexChange(null)}
      closeOnBackdropClick
      showCloseButton={false}
      ariaLabel={open ? `${label} ${index! + 1} de ${urls.length}` : label}
      className={`${fontSans} mx-3 w-[calc(100%-1.5rem)] max-w-4xl overflow-hidden rounded-[20px]! bg-[#09090B]! p-0 sm:mx-auto`}
    >
      <div className="relative flex min-h-[40vh] items-center justify-center">
        {open ? (
          broken ? (
            <p className="px-6 py-20 text-center text-[14px] text-white/70">No se pudo mostrar la imagen.</p>
          ) : (
            <img
              key={current}
              src={current}
              alt={`${label} ${index! + 1} ampliada`}
              className="cot-fade max-h-[80vh] w-full object-contain"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
            />
          )
        ) : null}

        <button
          type="button"
          onClick={() => onIndexChange(null)}
          aria-label="Cerrar ventana"
          className={`${navBtn} absolute right-3 top-3 size-10!`}
        >
          <X className="size-5" aria-hidden />
        </button>
        {urls.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onIndexChange(index! - 1)}
              disabled={!open || index === 0}
              aria-label="Foto anterior"
              className={`${navBtn} absolute left-3 top-1/2 -translate-y-1/2`}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange(index! + 1)}
              disabled={!open || index === urls.length - 1}
              aria-label="Foto siguiente"
              className={`${navBtn} absolute right-3 top-1/2 -translate-y-1/2`}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2.5 py-1 text-[12px] font-medium tabular-nums text-white backdrop-blur-sm">
              {open ? index! + 1 : 0} / {urls.length}
            </span>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
