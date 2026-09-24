/**
 * Alta por escáner de un código nuevo: antes de crearlo hay que decir si va a
 * exhibición o almacén. Dos botones grandes; con el escáner en la mano también
 * se puede responder con el teclado (E / A).
 */
import { useEffect, useId, useState } from "react";
import { Loader2, PackagePlus, Store, Warehouse, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  inventarioSansStyle,
  invModalEyebrowClass,
  invModalHeaderClass,
  invModalHeaderIconClass,
  invModalSubtitleClass,
  invModalTitleClass,
  invSecondaryBtnClass,
} from "../shared/inventarioStyles";
import type { InventarioUbicacion } from "../shared/inventarioTypes";

type Props = {
  /** Código escaneado; null = cerrado. */
  codigo: string | null;
  onCancel: () => void;
  /** Debe lanzar un Error legible si falla. */
  onChoose: (ubicacion: InventarioUbicacion) => Promise<void>;
};

const OPCIONES: {
  value: InventarioUbicacion;
  label: string;
  hint: string;
  key: string;
  icon: typeof Store;
  tone: string;
}[] = [
  {
    value: "exhibicion",
    label: "Exhibición",
    hint: "A la vista en piso de venta",
    key: "E",
    icon: Store,
    tone: "text-[#1B5CFF] bg-[rgba(27,92,255,0.08)] dark:text-[#9BB6FF] dark:bg-[rgba(75,124,255,0.16)]",
  },
  {
    value: "almacen",
    label: "Almacén",
    hint: "Resguardado en bodega",
    key: "A",
    icon: Warehouse,
    tone: "text-[#9A6B15] bg-[rgba(230,162,60,0.16)] dark:text-[#E6A23C]",
  },
];

export default function InventarioUbicacionPromptModal({ codigo, onCancel, onChoose }: Props) {
  const titleId = useId();
  const descId = useId();
  const [busy, setBusy] = useState<InventarioUbicacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = codigo != null;

  useEffect(() => {
    if (open) {
      setBusy(null);
      setError(null);
    }
  }, [open, codigo]);

  const choose = async (u: InventarioUbicacion) => {
    if (busy) return;
    setBusy(u);
    setError(null);
    try {
      await onChoose(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la entrada");
      setBusy(null);
    }
  };

  // Atajos de teclado E / A mientras el diálogo está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "e") void choose("exhibicion");
      if (k === "a") void choose("almacen");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={() => !busy && onCancel()}
      closeOnBackdropClick={false}
      closeOnEscape={!busy}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
      className="w-full overflow-hidden rounded-t-[20px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827]! sm:max-w-md sm:rounded-[20px]"
    >
      <div style={inventarioSansStyle}>
        <header className={invModalHeaderClass}>
          <div className="flex items-start gap-3.5">
            <span className={invModalHeaderIconClass}>
              <PackagePlus className="size-5" strokeWidth={1.8} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className={invModalEyebrowClass}>Producto nuevo</p>
              <h2 id={titleId} className={`mt-1 ${invModalTitleClass}`}>
                ¿Dónde va este producto?
              </h2>
              <p id={descId} className={invModalSubtitleClass}>
                Código <span className="font-mono font-semibold text-white">{codigo}</span>. Es obligatorio para darlo de alta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={!!busy}
            aria-label="Cancelar alta"
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 p-5">
          {OPCIONES.map((o) => {
            const Icon = o.icon;
            const loading = busy === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => void choose(o.value)}
                disabled={!!busy}
                aria-keyshortcuts={o.key}
                className="cot-press group relative flex flex-col items-center gap-2.5 rounded-[16px] border border-[#E7E7EA] bg-white px-3 pb-4 pt-5 text-center hover:border-[#1B5CFF]/50 hover:shadow-[0_8px_24px_-14px_rgba(27,92,255,0.5)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:hover:border-[#4B7CFF]/60"
              >
                <span className={`inline-flex size-12 items-center justify-center rounded-[14px] ${o.tone}`}>
                  {loading ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <Icon className="size-6" aria-hidden />}
                </span>
                <span className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{o.label}</span>
                <span className="text-[12px] leading-[16px] text-[#6E6E77] dark:text-[#8EA0B8]">{o.hint}</span>
                <kbd
                  className="absolute right-2.5 top-2.5 hidden rounded-md border border-[#E7E7EA] px-1.5 font-mono text-[10.5px] text-[#A1A1AA] dark:border-[#273244] dark:text-[#64748B] sm:block"
                  aria-hidden
                >
                  {o.key}
                </kbd>
              </button>
            );
          })}
        </div>

        {error ? (
          <p role="alert" className="cot-fade mx-5 -mt-1 mb-4 rounded-[12px] border border-[#F6CFCF] bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] text-[#9F1F1F] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5]">
            {error}
          </p>
        ) : null}

        <div className="border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-3.5 dark:border-[#273244] dark:bg-[#151E32]">
          <button type="button" onClick={onCancel} disabled={!!busy} className={`${invSecondaryBtnClass} h-10 min-h-0 w-full sm:w-full`}>
            Cancelar (no se da de alta)
          </button>
        </div>
      </div>
    </Modal>
  );
}
