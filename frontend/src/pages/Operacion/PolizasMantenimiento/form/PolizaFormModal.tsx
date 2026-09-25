/**
 * Alta / edición de póliza.
 *
 * Formato de hoja de ajustes: cada sección lleva su título y explicación a la
 * izquierda y los campos a la derecha (apilado en móvil). Cabecera blanca con
 * una barra fina de avance; pie fijo con el estado y las acciones.
 *
 * Movimiento: secciones con entrada escalonada (`cot-rise`), barra de avance con
 * `scaleX` (`cot-bar`) y palomita al completar una sección (`cot-tick`). Solo
 * transform/opacity; nada con prefers-reduced-motion.
 */
import { useEffect, useId, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import SearchableSelect from "@/components/form/SearchableSelect";
import {
  polErrorClass,
  polInputClass,
  polLabelClass,
  polPrimaryBtnClass,
  polSansStyle,
  polSecondaryBtnClass,
} from "../shared/polizaStyles";
import { normalizarVisitas, validarVisitas } from "../shared/polizaVisitas";
import { listCotizacionesDeCliente, type CotizacionOption } from "../list/polizaApi";
import { clienteNombreFromOptionLabel } from "../list/polizaClienteOptions";
import { TIPO_CCTV, TIPO_LABEL } from "../list/polizaEstado";
import type { PolizaAltaValues } from "../list/polizaListTypes";
import ClienteComboBox from "./ClienteComboBox";
import PolizaPlanificacion from "./PolizaPlanificacion";

type SelectOption = { value: string; label: string };

type Props = {
  open: boolean;
  editing: boolean;
  folio: string;
  folioIsPreview: boolean;
  initialValues: PolizaAltaValues;
  extraClienteOption?: SelectOption | null;
  extraCotizacionOption?: SelectOption | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (values: PolizaAltaValues) => void;
};

type Campo = "cliente" | "cotizacion" | "servicio" | "equipos" | "visitas";
type Errores = Partial<Record<Campo, string>>;

function Seccion({
  index,
  title,
  description,
  done,
  children,
}: {
  index: number;
  title: string;
  description: string;
  done: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="cot-rise grid gap-4 border-b border-[#EFEFF1] py-7 last:border-b-0 dark:border-[#1F2A3C] lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10"
      style={{ "--cot-i": index } as CSSProperties}
    >
      <div>
        <h3 id={headingId} className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
          {title}
          {done ? (
            <span className="cot-tick inline-flex size-[18px] items-center justify-center rounded-full bg-[#0E9F6E] text-white dark:bg-[#34D399] dark:text-[#052E1C]">
              <Check className="size-3" strokeWidth={3.5} aria-hidden />
              <span className="sr-only">(completo)</span>
            </span>
          ) : null}
        </h3>
        <p className="mt-1 text-[13px] leading-[19px] text-[#6E6E77] dark:text-[#8EA0B8]">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function PolizaFormModal({
  open,
  editing,
  folio,
  folioIsPreview,
  initialValues,
  extraClienteOption = null,
  extraCotizacionOption = null,
  saving = false,
  onClose,
  onSave,
}: Props) {
  const titleId = useId();
  const formId = useId();
  const ids: Record<Campo, string> = {
    cliente: "poliza-elegir-cliente",
    cotizacion: `${formId}-cotizacion`,
    servicio: `${formId}-servicio`,
    equipos: `${formId}-equipos`,
    visitas: `${formId}-visitas`,
  };

  const [clienteId, setClienteId] = useState(initialValues.clienteId);
  const [clienteNombre, setClienteNombre] = useState(
    extraClienteOption?.label ? clienteNombreFromOptionLabel(extraClienteOption.label) : "",
  );
  const [cotizacionId, setCotizacionId] = useState(initialValues.cotizacionId);
  const [servicioTipo, setServicioTipo] = useState(initialValues.servicioTipo);
  const [equiposAtendidos, setEquiposAtendidos] = useState(initialValues.equiposAtendidos);
  const [visitas, setVisitas] = useState<string[]>(initialValues.visitas);
  const [errores, setErrores] = useState<Errores>({});

  const [cotizaciones, setCotizaciones] = useState<CotizacionOption[]>([]);
  const [loadingCot, setLoadingCot] = useState(false);
  const extraCotValue = extraCotizacionOption?.value || "";
  const extraCotLabel = extraCotizacionOption?.label || "";

  useEffect(() => {
    if (!clienteId) {
      setCotizaciones([]);
      return;
    }
    let cancelled = false;
    setLoadingCot(true);
    listCotizacionesDeCliente(clienteId)
      .then((rows) => {
        if (cancelled) return;
        const extra =
          extraCotValue && !rows.some((r) => r.value === extraCotValue)
            ? [{ value: extraCotValue, label: extraCotLabel || extraCotValue }]
            : [];
        setCotizaciones([...extra, ...rows]);
      })
      .catch(() => {
        if (!cancelled) setCotizaciones([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCot(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clienteId, extraCotValue, extraCotLabel]);

  const listo = {
    cliente: Boolean(clienteId && cotizacionId),
    servicio: Boolean(servicioTipo.trim() && equiposAtendidos.trim()),
    visitas: validarVisitas(visitas) === null,
  };
  const completas = Object.values(listo).filter(Boolean).length;
  const faltan = [
    !listo.cliente && "cliente y cotización",
    !listo.servicio && "servicio",
    !listo.visitas && "planificación",
  ].filter(Boolean) as string[];

  const limpiar = (k: Campo) => setErrores((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Errores = {
      cliente: clienteId ? undefined : "Elige el cliente de la póliza.",
      cotizacion: cotizacionId ? undefined : "Liga una cotización DigitalFlow.",
      servicio: servicioTipo.trim() ? undefined : "Indica el tipo de servicio.",
      equipos: equiposAtendidos.trim() ? undefined : "Indica los equipos atendidos, por ejemplo 1 DVR y 10 cámaras.",
      visitas: validarVisitas(visitas) ?? undefined,
    };
    setErrores(next);
    const primero = (Object.keys(ids) as Campo[]).find((k) => next[k]);
    if (primero) {
      const el = document.getElementById(ids[primero]);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      return;
    }
    onSave({
      clienteId,
      clienteNombre: clienteNombre || clienteNombreFromOptionLabel(extraClienteOption?.label || ""),
      tipo: TIPO_CCTV,
      servicioTipo: servicioTipo.trim(),
      equiposAtendidos: equiposAtendidos.trim(),
      cotizacionId,
      visitas: normalizarVisitas(visitas),
    });
  };

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={() => !saving && onClose()}
      closeOnBackdropClick={false}
      closeOnEscape={!saving}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      className="flex max-h-[min(94dvh,960px)] w-full flex-col overflow-hidden rounded-t-[20px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_32px_80px_-24px_rgba(9,9,11,0.4)] dark:border-[#273244] dark:bg-[#111827]! sm:w-[min(96vw,58rem)] sm:max-w-5xl sm:rounded-[20px]"
    >
      <div className="flex min-h-0 flex-1 flex-col" style={polSansStyle}>
        {/* Cabecera */}
        <header className="relative shrink-0 border-b border-[#E7E7EA] px-5 pb-4 pt-5 dark:border-[#273244] sm:px-8">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
                <span className="font-medium">Póliza de mantenimiento</span>
                <span className="text-[#D4D4D8] dark:text-[#3A4661]" aria-hidden>
                  ·
                </span>
                <span className="rounded-md bg-[#F4F4F5] px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#3F3F46] dark:bg-white/[0.06] dark:text-[#CBD5E1]">
                  {folio}
                </span>
                {folioIsPreview ? <span>se asigna al guardar</span> : null}
              </p>
              <h2
                id={titleId}
                className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.6px] text-[#09090B] dark:text-[#F8FAFC]"
              >
                {editing ? "Editar póliza" : "Nueva póliza"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-[#6E6E77] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:opacity-40 dark:text-[#8EA0B8] dark:hover:bg-white/[0.06] dark:hover:text-white sm:right-6"
          >
            <X className="size-5" aria-hidden />
          </button>
          {/* Avance: 3 tramos */}
          <div className="absolute inset-x-0 bottom-[-1px] grid grid-cols-3 gap-px" aria-hidden>
            {[listo.cliente, listo.servicio, listo.visitas].map((ok, i) => (
              <span key={i} className="h-0.5 overflow-hidden bg-transparent">
                <span
                  className="cot-bar block h-full w-full bg-[#1B5CFF] dark:bg-[#4B7CFF]"
                  style={{ transform: `scaleX(${ok ? 1 : 0})` }}
                />
              </span>
            ))}
          </div>
        </header>

        {/* Cuerpo */}
        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-8"
        >
          <Seccion
            index={0}
            title="Cliente"
            description="Empresa o persona que contrata la póliza y la cotización que la respalda."
            done={listo.cliente}
          >
            <div className="space-y-5">
              <ClienteComboBox
                clienteId={clienteId}
                extraOption={extraClienteOption?.value ? extraClienteOption : null}
                error={errores.cliente || ""}
                onClienteChange={(id, label) => {
                  setClienteId(id);
                  setClienteNombre(clienteNombreFromOptionLabel(label));
                  setCotizacionId("");
                  if (id) limpiar("cliente");
                }}
              />
              <div>
                <SearchableSelect
                  id={ids.cotizacion}
                  label="Cotización"
                  required
                  value={cotizacionId}
                  onChange={(v) => {
                    setCotizacionId(v);
                    if (v) limpiar("cotizacion");
                  }}
                  options={cotizaciones}
                  placeholder={
                    !clienteId
                      ? "Elige un cliente primero"
                      : loadingCot
                        ? "Cargando cotizaciones…"
                        : cotizaciones.length
                          ? "Buscar folio"
                          : "Sin cotizaciones de este cliente"
                  }
                  disabled={!clienteId}
                  loading={loadingCot}
                  filterLocally
                  invalid={Boolean(errores.cotizacion)}
                />
                {errores.cotizacion ? (
                  <p className={polErrorClass} role="alert">
                    {errores.cotizacion}
                  </p>
                ) : clienteId && !loadingCot && cotizaciones.length === 0 ? (
                  <p className="mt-1.5 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                    Este cliente no tiene cotizaciones DigitalFlow. Créala en Ventas → Cotización.
                  </p>
                ) : null}
              </div>
            </div>
          </Seccion>

          <Seccion
            index={1}
            title="Servicio"
            description={`${TIPO_LABEL.cctv}. Qué incluye el mantenimiento y qué equipos cubre.`}
            done={listo.servicio}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={ids.servicio} className={polLabelClass}>
                  Tipo de servicio <span className="text-[#C22B2B]" aria-hidden>*</span>
                </label>
                <input
                  id={ids.servicio}
                  value={servicioTipo}
                  onChange={(e) => {
                    setServicioTipo(e.target.value);
                    if (e.target.value.trim()) limpiar("servicio");
                  }}
                  aria-invalid={Boolean(errores.servicio) || undefined}
                  aria-required
                  className={polInputClass}
                  placeholder="Mantenimiento preventivo CCTV"
                />
                {errores.servicio ? (
                  <p className={polErrorClass} role="alert">
                    {errores.servicio}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor={ids.equipos} className={polLabelClass}>
                  Equipos atendidos <span className="text-[#C22B2B]" aria-hidden>*</span>
                </label>
                <input
                  id={ids.equipos}
                  value={equiposAtendidos}
                  onChange={(e) => {
                    setEquiposAtendidos(e.target.value);
                    if (e.target.value.trim()) limpiar("equipos");
                  }}
                  aria-invalid={Boolean(errores.equipos) || undefined}
                  aria-required
                  className={polInputClass}
                  placeholder="1 DVR y 10 cámaras"
                />
                {errores.equipos ? (
                  <p className={polErrorClass} role="alert">
                    {errores.equipos}
                  </p>
                ) : null}
              </div>
            </div>
          </Seccion>

          <Seccion
            index={2}
            title="Planificación"
            description="Fechas de los mantenimientos del año."
            done={listo.visitas}
          >
            <PolizaPlanificacion
              id={ids.visitas}
              initial={initialValues.visitas}
              error={errores.visitas}
              onChange={(next) => {
                setVisitas(next);
                if (validarVisitas(next) === null) limpiar("visitas");
              }}
            />
          </Seccion>
        </form>

        {/* Pie */}
        <footer className="shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-3.5 dark:border-[#273244] dark:bg-[#0F172A]/60 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]" aria-live="polite">
              <span className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{completas}/3</span>{" "}
              {faltan.length ? `· Falta ${faltan.join(", ")}` : "· Lista para guardar"}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={onClose} disabled={saving} className={polSecondaryBtnClass}>
                Cancelar
              </button>
              <button type="submit" form={formId} disabled={saving} aria-busy={saving || undefined} className={polPrimaryBtnClass}>
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear póliza"}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
