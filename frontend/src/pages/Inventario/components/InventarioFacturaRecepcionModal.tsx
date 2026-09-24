/**
 * Recepción de factura: antes de tocar el inventario se muestran todas las
 * líneas para marcar lo que ya llegó.
 *
 *  - Marcado  → entra al inventario (todo lo facturado o solo parte).
 *  - Sin marcar / faltante → queda «en espera», fuera del inventario.
 *
 * Nada se guarda hasta pulsar «Confirmar». Movimiento: filas con entrada
 * escalonada (`cot-rise`), barra de avance con `scaleX` y cambios de color;
 * solo `transform`/`opacity`, desactivado con `prefers-reduced-motion`.
 */
import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { Check, CheckCheck, Clock3, Loader2, PackageCheck, Search, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  invModalEyebrowClass,
  invModalHeaderClass,
  invModalHeaderIconClass,
  invModalSubtitleClass,
  invModalTitleClass,
  invPrimaryBtnClass,
  invSecondaryBtnClass,
  inventarioSansStyle,
} from "../shared/inventarioStyles";
import {
  esAltaNueva,
  lineasSinUbicacion,
  marcarTodas,
  recepcionPayload,
  recibidaDe,
  resumirRecepcion,
  setRecibida,
  toggleLinea,
  ubicarNuevas,
  type RecepcionState,
  type UbicacionesState,
} from "../shared/facturaRecepcion";
import type {
  FacturaPreview,
  FacturaPreviewLinea,
  InventarioUbicacion,
  RecepcionLinea,
} from "../shared/inventarioTypes";
import { UbicacionBadge, UbicacionPicker } from "./InventarioUbicacion";
import InventarioQtyStepper from "./InventarioQtyStepper";
import InventarioThumb from "./InventarioThumb";

type Props = {
  open: boolean;
  preview: FacturaPreview | null;
  onClose: () => void;
  /** Debe lanzar un Error con mensaje legible si falla. */
  onConfirm: (recepcion: RecepcionLinea[]) => Promise<void>;
};

const SEARCH_THRESHOLD = 6;

const proveedorLabel = (p: string) => (p === "tvc" ? "TVC" : "SYSCOM");

const formatMxn = (raw: string | null) => {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : null;
};

export default function InventarioFacturaRecepcionModal({ open, preview, onClose, onConfirm }: Props) {
  const titleId = useId();
  const descId = useId();
  const [state, setState] = useState<RecepcionState>({});
  const [ubicaciones, setUbicaciones] = useState<UbicacionesState>({});
  /** Tras un intento de confirmar, se resaltan las ubicaciones que faltan. */
  const [intento, setIntento] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada factura nueva empieza sin nada marcado.
  useEffect(() => {
    if (!open) return;
    setState({});
    setUbicaciones({});
    setIntento(false);
    setQuery("");
    setError(null);
  }, [open, preview?.folio]);

  const lineas = useMemo(() => preview?.lineas ?? [], [preview]);
  const resumen = useMemo(() => resumirRecepcion(lineas, state), [lineas, state]);
  const visibles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lineas;
    return lineas.filter((l) =>
      [l.nombre, l.modelo, l.marca].some((v) => (v || "").toLowerCase().includes(q)),
    );
  }, [lineas, query]);

  const todoMarcado = lineas.length > 0 && resumen.unidadesEnEspera === 0;
  const hayNuevas = lineas.some((l) => l.en_inventario == null);
  const faltanUbicacion = lineasSinUbicacion(lineas, state, ubicaciones);
  const pct = resumen.unidadesTotales ? resumen.unidadesRecibidas / resumen.unidadesTotales : 0;

  const close = () => {
    if (!saving) onClose();
  };

  const confirm = async () => {
    if (!preview || saving) return;
    if (faltanUbicacion.length) {
      setIntento(true);
      setError(
        faltanUbicacion.length === 1
          ? `Elige si «${faltanUbicacion[0].nombre}» va a exhibición o almacén.`
          : `Elige exhibición o almacén para ${faltanUbicacion.length} productos nuevos.`,
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(recepcionPayload(lineas, state, ubicaciones));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo importar la factura");
    } finally {
      setSaving(false);
    }
  };

  const confirmLabel =
    resumen.unidadesRecibidas === 0
      ? "Guardar todo en espera"
      : `Dar entrada a ${resumen.unidadesRecibidas} ${resumen.unidadesRecibidas === 1 ? "unidad" : "unidades"}`;

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={close}
      closeOnBackdropClick={false}
      closeOnEscape={!saving}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
      className="flex max-h-[min(94dvh,900px)] w-full flex-col overflow-hidden rounded-t-[20px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827]! sm:w-[min(96vw,56rem)] sm:max-w-4xl sm:rounded-[20px]"
    >
      <div className="flex min-h-0 flex-1 flex-col" style={inventarioSansStyle}>
        {/* Cabecera marina (mismo lenguaje que los demás diálogos de Inventario) */}
        <header className={invModalHeaderClass}>
          <div className="flex items-start gap-3.5">
            <span className={invModalHeaderIconClass}>
              <PackageCheck className="size-5" strokeWidth={1.7} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className={invModalEyebrowClass}>
                Recepción de factura · {preview ? proveedorLabel(preview.proveedor) : ""}
              </p>
              <h2 id={titleId} className={`mt-1 truncate font-mono ${invModalTitleClass}`}>
                {preview?.folio ?? "Factura"}
              </h2>
              <p id={descId} className={invModalSubtitleClass}>
                Marca lo que ya llegó. Lo que falte quedará en espera y no entrará al inventario.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={saving}
            aria-label="Cerrar ventana"
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {/* Avance de la recepción */}
        <div className="shrink-0 space-y-3 border-b border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <p className="text-[13px] text-[#52525B] dark:text-[#B7C1D1]" aria-live="polite">
              <span className="text-[20px] font-semibold tabular-nums tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
                {resumen.unidadesRecibidas}
              </span>{" "}
              de {resumen.unidadesTotales} unidades recibidas
            </p>
            <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[rgba(4,114,77,0.10)] px-2.5 text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]">
                <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                {resumen.lineasRecibidas} {resumen.lineasRecibidas === 1 ? "producto entra" : "productos entran"}
              </span>
              <span
                className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 transition-colors duration-200 ${
                  resumen.lineasEnEspera
                    ? "bg-[rgba(230,162,60,0.16)] text-[#8A5D0F] dark:text-[#E6A23C]"
                    : "bg-[#F4F4F5] text-[#6E6E77] dark:bg-white/[0.06] dark:text-[#8EA0B8]"
                }`}
              >
                <Clock3 className="size-3.5" aria-hidden />
                {resumen.lineasEnEspera} en espera
              </span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(230,162,60,0.22)] dark:bg-[rgba(230,162,60,0.18)]" aria-hidden>
            <div
              className="cot-bar h-full w-full rounded-full bg-[#22A06B]"
              style={{ transform: `scaleX(${pct})` }}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {lineas.length > SEARCH_THRESHOLD ? (
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar en la factura…"
                  aria-label="Buscar productos de la factura"
                  className="h-10 w-full rounded-[10px] border border-[#E7E7EA] bg-white pl-9 pr-3 text-[14px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]"
                />
              </div>
            ) : (
              <span className="flex-1" />
            )}
            {hayNuevas ? (
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[12.5px] font-medium text-[#52525B] dark:text-[#B7C1D1]">Nuevos →</span>
                <UbicacionPicker
                  size="sm"
                  value=""
                  label="Ubicación para todos los productos nuevos"
                  disabled={saving}
                  onChange={(u) => setUbicaciones((prev) => ubicarNuevas(lineas, prev, u))}
                />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setState(marcarTodas(lineas, !todoMarcado))}
              disabled={saving || lineas.length === 0}
              className={`${invSecondaryBtnClass} h-10 min-h-0 px-4 text-[13px]`}
            >
              {todoMarcado ? <X className="size-4" aria-hidden /> : <CheckCheck className="size-4" aria-hidden />}
              {todoMarcado ? "Desmarcar todo" : "Todo llegó"}
            </button>
          </div>
        </div>

        {/* Líneas */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {error ? (
            <div
              role="alert"
              className="cot-fade mx-5 mt-4 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#9F1F1F] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5] sm:mx-6"
            >
              {error}
            </div>
          ) : null}

          {visibles.length ? (
            <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
              {visibles.map((linea, i) => (
                <RecepcionRow
                  key={linea.indice}
                  linea={linea}
                  index={i}
                  recibida={recibidaDe(state, linea)}
                  altaNueva={esAltaNueva(linea, state)}
                  ubicacion={ubicaciones[linea.indice] ?? ""}
                  ubicacionFaltante={intento && esAltaNueva(linea, state) && !ubicaciones[linea.indice]}
                  onUbicacion={(u) => setUbicaciones((prev) => ({ ...prev, [linea.indice]: u }))}
                  disabled={saving}
                  onToggle={() => setState((s) => toggleLinea(s, linea))}
                  onChange={(n) => setState((s) => setRecibida(s, linea, n))}
                />
              ))}
            </ul>
          ) : (
            <p className="px-6 py-12 text-center text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]">
              Ningún producto coincide con «{query.trim()}».
            </p>
          )}
        </div>

        {/* Pie */}
        <footer className="flex shrink-0 flex-col gap-3 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
            {faltanUbicacion.length > 0 ? (
              <b className="font-semibold text-[#C22B2B] dark:text-[#F87171]">
                Falta elegir ubicación en {faltanUbicacion.length}{" "}
                {faltanUbicacion.length === 1 ? "producto nuevo" : "productos nuevos"}.
              </b>
            ) : resumen.unidadesEnEspera > 0 ? (
              <>
                <b className="font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
                  {resumen.unidadesEnEspera} {resumen.unidadesEnEspera === 1 ? "unidad" : "unidades"}
                </b>{" "}
                quedarán en espera; podrás recibirlas cuando lleguen.
              </>
            ) : (
              "Todo lo facturado entrará al inventario."
            )}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={close} disabled={saving} className={invSecondaryBtnClass}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={saving || !preview}
              aria-busy={saving}
              className={invPrimaryBtnClass}
            >
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <PackageCheck className="size-4" aria-hidden />}
              {saving ? "Guardando…" : confirmLabel}
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}

function RecepcionRow({
  linea,
  index,
  recibida,
  altaNueva,
  ubicacion,
  ubicacionFaltante,
  onUbicacion,
  disabled,
  onToggle,
  onChange,
}: {
  linea: FacturaPreviewLinea;
  index: number;
  recibida: number;
  altaNueva: boolean;
  ubicacion: InventarioUbicacion | "";
  ubicacionFaltante: boolean;
  onUbicacion: (u: InventarioUbicacion) => void;
  disabled: boolean;
  onToggle: () => void;
  onChange: (n: number) => void;
}) {
  const inputId = useId();
  const llego = recibida > 0;
  const falta = linea.cantidad - recibida;
  const precio = formatMxn(linea.precio_unitario);

  return (
    <li
      className={`cot-rise relative flex flex-col gap-3 px-5 py-3.5 transition-colors duration-200 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2.5 sm:px-6 ${
        llego ? "bg-[#F4FBF7] dark:bg-[rgba(34,160,107,0.08)]" : ""
      }`}
      style={{ "--cot-i": Math.min(index, 10) } as CSSProperties}
    >
      {/* Marca lateral: verde si entra, dorada si algo queda en espera */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] origin-top transition-transform duration-300 motion-reduce:transition-none ${
          falta > 0 && llego ? "bg-[#E6A23C]" : "bg-[#22A06B]"
        } ${llego ? "scale-y-100" : "scale-y-0"}`}
      />

      <label htmlFor={inputId} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5">
        <span className="relative inline-flex size-6 shrink-0">
          <input
            id={inputId}
            type="checkbox"
            checked={llego}
            disabled={disabled}
            onChange={onToggle}
            className="peer size-6 cursor-pointer appearance-none rounded-[7px] border-[1.5px] border-[#D4D4D8] bg-white transition-colors duration-150 checked:border-[#22A06B] checked:bg-[#22A06B] hover:border-[#A1A1AA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(34,160,107,0.25)] disabled:cursor-not-allowed dark:border-[#3A4661] dark:bg-[#0F172A]"
          />
          <Check
            className="pointer-events-none absolute inset-0 m-auto size-4 scale-50 text-white opacity-0 transition-[opacity,transform] duration-150 peer-checked:scale-100 peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden
          />
        </span>
        <InventarioThumb src={linea.imagen_url} alt="" size={44} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[14px] font-medium leading-[19px] text-[#09090B] dark:text-[#F8FAFC]">
            {linea.nombre}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
            <span className="font-mono">{linea.modelo}</span>
            {linea.marca ? <span>· {linea.marca}</span> : null}
            {precio ? <span className="tabular-nums">· {precio} c/u</span> : null}
            {linea.en_inventario ? (
              <>
                <span className="rounded-full bg-[rgba(27,92,255,0.08)] px-2 py-0.5 font-medium text-[#1244D1] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]">
                  En inventario: {linea.en_inventario.cantidad}
                </span>
                <UbicacionBadge value={linea.en_inventario.ubicacion} />
              </>
            ) : (
              <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 font-medium text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]">
                Nuevo
              </span>
            )}
          </span>
        </span>
      </label>

      {altaNueva ? (
        <div className="cot-fade order-last flex flex-col gap-1.5 pl-[2.375rem] sm:basis-full sm:flex-row sm:items-center sm:gap-3 sm:pl-[6.125rem]">
          <span
            className={`text-[12.5px] font-medium ${
              ubicacionFaltante ? "text-[#C22B2B] dark:text-[#F87171]" : "text-[#52525B] dark:text-[#B7C1D1]"
            }`}
          >
            Producto nuevo · ¿dónde va?<span aria-hidden> *</span>
          </span>
          <div className="sm:w-72">
            <UbicacionPicker
              size="sm"
              value={ubicacion}
              onChange={onUbicacion}
              invalid={ubicacionFaltante}
              disabled={disabled}
              label={`Ubicación de ${linea.nombre}`}
            />
          </div>
        </div>
      ) : null}

      {/* Cantidad: al marcar se puede ajustar si llegó solo una parte */}
      <div className="flex items-center justify-between gap-3 pl-[2.375rem] sm:w-[15.5rem] sm:shrink-0 sm:justify-end sm:pl-0">
        {llego ? (
          <div className="cot-fade flex items-center gap-2.5">
            <InventarioQtyStepper
              value={recibida}
              min={1}
              max={linea.cantidad}
              onChange={onChange}
              disabled={disabled}
              label={`Unidades recibidas de ${linea.nombre}`}
            />
            <span className="w-16 text-[12px] leading-tight text-[#6E6E77] dark:text-[#8EA0B8]">
              de {linea.cantidad}
              {falta > 0 ? (
                <span className="block font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">{falta} en espera</span>
              ) : null}
            </span>
          </div>
        ) : (
          <div className="cot-fade flex items-center gap-2.5">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[rgba(230,162,60,0.16)] px-2.5 text-[12px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
              <Clock3 className="size-3.5" aria-hidden />
              En espera
            </span>
            <span className="text-[13px] tabular-nums text-[#52525B] dark:text-[#B7C1D1]">
              {linea.cantidad} {linea.cantidad === 1 ? "unidad" : "unidades"}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
