/**
 * Productos en espera (panel lateral): líneas de facturas importadas que aún
 * no llegan. No suman existencias; al recibirlos (todo o parte) entran al
 * inventario con su movimiento de entrada. Agrupados por factura.
 *
 * Se abre desde el botón «En espera» de la cabecera. Usa el Modal de la app
 * (foco atrapado, Escape, bloqueo de scroll) anclado a la derecha.
 */
import { useId, useMemo, useState, type CSSProperties } from "react";
import { Clock3, Loader2, PackageCheck, PackageOpen, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  inventarioSansStyle,
  invModalEyebrowClass,
  invModalHeaderClass,
  invModalHeaderIconClass,
  invModalSubtitleClass,
  invModalTitleClass,
  invPrimaryBtnClass,
  invSecondaryBtnClass,
} from "../shared/inventarioStyles";
import type { InventarioPendiente, InventarioUbicacion } from "../shared/inventarioTypes";
import { UbicacionPicker } from "./InventarioUbicacion";
import InventarioQtyStepper from "./InventarioQtyStepper";
import InventarioThumb from "./InventarioThumb";

type Props = {
  open: boolean;
  onClose: () => void;
  pendientes: InventarioPendiente[];
  canReceive: boolean;
  canDiscard: boolean;
  /** Deben lanzar un Error legible si fallan. */
  onReceive: (p: InventarioPendiente, cantidad: number, ubicacion?: InventarioUbicacion) => Promise<void>;
  onDiscard: (p: InventarioPendiente) => Promise<void>;
};

const fecha = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
};

export default function InventarioPendientesDrawer({
  open,
  onClose,
  pendientes,
  canReceive,
  canDiscard,
  onReceive,
  onDiscard,
}: Props) {
  const titleId = useId();
  const grupos = useMemo(() => {
    const map = new Map<string, InventarioPendiente[]>();
    for (const p of pendientes) {
      const key = `${p.proveedor}:${p.folio}`;
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.values()];
  }, [pendientes]);

  const unidades = pendientes.reduce((acc, p) => acc + p.cantidad, 0);

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={onClose}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[20px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:bg-[#111827]! sm:ml-auto sm:h-[calc(100dvh-2rem)] sm:max-h-none sm:w-[30rem] sm:max-w-[calc(100vw-2rem)] sm:rounded-[20px]"
    >
      <div className="flex min-h-0 flex-1 flex-col" style={inventarioSansStyle}>
        <header className={invModalHeaderClass}>
          <div className="flex items-start gap-3.5">
            <span className={invModalHeaderIconClass}>
              <Clock3 className="size-5" strokeWidth={1.8} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className={invModalEyebrowClass}>Inventario</p>
              <h2 id={titleId} className={`mt-1 ${invModalTitleClass}`}>
                Productos en espera
              </h2>
              <p className={invModalSubtitleClass}>
                {pendientes.length
                  ? `${pendientes.length} ${pendientes.length === 1 ? "producto" : "productos"} · ${unidades} ${unidades === 1 ? "unidad" : "unidades"} por llegar`
                  : "Facturados pero aún no llegan."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <p className="shrink-0 border-b border-[#E7E7EA] bg-[#FAFAFA] px-5 py-3 text-[13px] leading-[18px] text-[#52525B] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#B7C1D1]">
          No suman existencias hasta que los recibas. Al recibirlos se registra su entrada en el historial.
        </p>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {pendientes.length === 0 ? (
            <div className="cot-fade flex flex-col items-center px-6 py-16 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-[14px] bg-[rgba(34,160,107,0.10)] text-[#04724D] dark:text-[#4ADE80]">
                <PackageOpen className="size-6" aria-hidden />
              </span>
              <p className="mt-3 text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Nada en espera</p>
              <p className="mt-1 max-w-xs text-[13px] leading-[19px] text-[#6E6E77] dark:text-[#8EA0B8]">
                Todo lo facturado ya llegó. Si al importar una factura falta algo, aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E7E7EA] dark:divide-[#273244]">
              {grupos.map((grupo) => {
                const cabeza = grupo[0];
                return (
                  <section key={`${cabeza.proveedor}:${cabeza.folio}`} aria-label={`Factura ${cabeza.folio}`}>
                    <div className="sticky top-0 z-[1] flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#F0F0F2] bg-white/95 px-5 py-2.5 backdrop-blur-sm dark:border-[#1F2A3C] dark:bg-[#111827]/95">
                      <span className="font-mono text-[13px] font-semibold text-[#17235B] dark:text-[#9BB6FF]">{cabeza.folio}</span>
                      <span className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
                        {cabeza.proveedor === "tvc" ? "TVC" : "SYSCOM"} · {fecha(cabeza.creado_en)}
                      </span>
                    </div>
                    <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
                      {grupo.map((p, i) => (
                        <PendienteRow
                          key={p.id}
                          p={p}
                          index={i}
                          canReceive={canReceive}
                          canDiscard={canDiscard}
                          onReceive={onReceive}
                          onDiscard={onDiscard}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

type Mode = "idle" | "receive" | "discard";

function PendienteRow({
  p,
  index,
  canReceive,
  canDiscard,
  onReceive,
  onDiscard,
}: {
  p: InventarioPendiente;
  index: number;
  canReceive: boolean;
  canDiscard: boolean;
  onReceive: Props["onReceive"];
  onDiscard: Props["onDiscard"];
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [qty, setQty] = useState(p.cantidad);
  const [ubicacion, setUbicacion] = useState<InventarioUbicacion | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setMode("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar");
    } finally {
      setBusy(false);
    }
  };

  const startReceive = () => {
    // Directo solo si no hay nada que preguntar (1 unidad y el producto ya existe).
    if (p.cantidad === 1 && !p.requiere_ubicacion) {
      void run(() => onReceive(p, 1));
      return;
    }
    setQty(p.cantidad);
    setUbicacion("");
    setMode("receive");
  };

  const smallBtn = "h-10 min-h-0 px-4 text-[13px] w-auto";

  return (
    <li className="cot-rise px-5 py-3.5" style={{ "--cot-i": Math.min(index, 10) } as CSSProperties}>
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <InventarioThumb src={p.imagen_url} alt="" size={44} />
          <div className="min-w-0">
            <p className="line-clamp-2 text-[14px] font-medium leading-[19px] text-[#09090B] dark:text-[#F8FAFC]">{p.nombre || p.modelo}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
              <span className="font-mono">{p.modelo}</span>
              {p.marca ? <span>· {p.marca}</span> : null}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pl-[3.625rem]">
          <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-[rgba(230,162,60,0.16)] px-2.5 text-[12px] font-semibold tabular-nums text-[#8A5D0F] dark:text-[#E6A23C]">
            Faltan {p.cantidad}
            {p.cantidad_facturada !== p.cantidad ? ` de ${p.cantidad_facturada}` : ""}
          </span>
          {mode === "idle" ? (
            <div className="flex items-center gap-1.5">
              {canDiscard ? (
                <button
                  type="button"
                  onClick={() => setMode("discard")}
                  disabled={busy}
                  aria-label={`Descartar ${p.nombre || p.modelo}`}
                  title="Descartar (no llegará)"
                  className="inline-flex size-10 items-center justify-center rounded-[10px] text-[#6E6E77] transition-colors hover:bg-[#FEF2F2] hover:text-[#C22B2B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.2)] disabled:opacity-40 dark:text-[#8EA0B8] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171]"
                >
                  <Trash2 className="size-[18px]" aria-hidden />
                </button>
              ) : null}
              {canReceive ? (
                <button type="button" onClick={startReceive} disabled={busy} className={`${invPrimaryBtnClass} ${smallBtn}`}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <PackageCheck className="size-4" aria-hidden />}
                  Recibir
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {mode === "receive" ? (
        <div className="cot-pop mt-3 flex flex-col gap-3 rounded-[14px] border border-[#D7E3FF] bg-[#F7F9FF] p-3.5 dark:border-[#3A4A6B] dark:bg-[#1B2A63]/40 sm:ml-[3.625rem]">
          {p.requiere_ubicacion ? (
            <div className="space-y-1.5">
              <p className="text-[13px] text-[#17235B] dark:text-[#C7D5FF]">
                Producto nuevo en inventario · ¿dónde va?<span aria-hidden> *</span>
              </p>
              <UbicacionPicker
                size="sm"
                value={ubicacion}
                onChange={setUbicacion}
                disabled={busy}
                label={`Ubicación de ${p.nombre || p.modelo}`}
              />
            </div>
          ) : null}
          {p.cantidad > 1 ? (
            <p className="flex-1 text-[13px] text-[#17235B] dark:text-[#C7D5FF]">¿Cuántas unidades llegaron?</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {p.cantidad > 1 ? (
              <InventarioQtyStepper value={qty} min={1} max={p.cantidad} onChange={setQty} disabled={busy} label="Unidades recibidas" />
            ) : null}
            <button type="button" onClick={() => setMode("idle")} disabled={busy} className={`${invSecondaryBtnClass} ${smallBtn}`}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void run(() => onReceive(p, qty, ubicacion || undefined))}
              disabled={busy || (p.requiere_ubicacion && !ubicacion)}
              title={p.requiere_ubicacion && !ubicacion ? "Elige exhibición o almacén" : undefined}
              className={`${invPrimaryBtnClass} ${smallBtn}`}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Dar entrada
            </button>
          </div>
        </div>
      ) : null}

      {mode === "discard" ? (
        <div
          role="alertdialog"
          aria-label="Descartar producto en espera"
          className="cot-pop mt-3 flex flex-col gap-3 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] p-3.5 dark:border-[#7F1D1D] dark:bg-[#3F1518] sm:ml-[3.625rem]"
        >
          <p className="flex-1 text-[13px] leading-[18px] text-[#9F1F1F] dark:text-[#FCA5A5]">
            Se quitará de la lista de espera. No afecta el inventario.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("idle")} disabled={busy} className={`${invSecondaryBtnClass} ${smallBtn}`}>
              Cancelar
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => void run(() => onDiscard(p))}
              disabled={busy}
              className={`${smallBtn} inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#C22B2B] bg-[#C22B2B] font-medium text-white transition-colors hover:bg-[#A82424] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] disabled:opacity-60`}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Descartar
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-[#C22B2B] dark:text-[#F87171] sm:ml-[3.625rem]">
          {error}
        </p>
      ) : null}
    </li>
  );
}
