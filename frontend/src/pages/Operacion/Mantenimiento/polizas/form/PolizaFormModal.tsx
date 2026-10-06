/**
 * Alta / edición de póliza: asistente de 3 pasos con el diseño del modal de
 * Órdenes (ver `MantenimientoFormShell`). Al guardar con datos faltantes se
 * salta al primer paso con error y se enfoca el campo.
 */
import { useEffect, useId, useState } from "react";
import { Building2, CalendarRange, FilePlus2, FileSignature, FileText, RefreshCw, ShieldCheck, Wrench, X } from "lucide-react";
import { OrdenFormSection } from "../../../OrdenesTrabajo/OrdenServicio/form/tabs/ordenTabHelpers";
import MantenimientoFormShell, { type MantenimientoFormStep } from "../../form/MantenimientoFormShell";
import { Field, SectionCard } from "../../../Proyectos/shared/ProyectoUi";
import { formatFechaCorta } from "../../../Proyectos/shared/proyectoListUtils";
import { btn, btnSm, emptyPanel, fieldError, focusRing, iconBtnDanger, input, metaChip, origenChip } from "../../../Proyectos/shared/proyectoTokens";
import { normalizarVisitas, validarVisitas } from "../shared/polizaVisitas";
import { listCotizacionesDeCliente, type CotizacionOption } from "../list/polizaApi";
import { clienteNombreFromOptionLabel } from "../list/polizaClienteOptions";
import { TIPO_CCTV, TIPO_LABEL } from "../list/polizaEstado";
import type { PolizaAltaValues } from "../list/polizaListTypes";
import ClienteComboBox from "./ClienteComboBox";
import { PolizaCotizacionPickerModal } from "./PolizaCotizacionPickerModal";
import PolizaPlanificacion from "./PolizaPlanificacion";

type PasoId = "cliente" | "servicio" | "planificacion";

const PASOS: MantenimientoFormStep<PasoId>[] = [
  {
    id: "cliente",
    label: "Cliente",
    hint: "Cliente y cotización",
    description: "Elige quién contrata la póliza y la cotización DigitalFlow que la respalda.",
    icon: Building2,
  },
  {
    id: "servicio",
    label: "Servicio",
    hint: "Tipo y equipos",
    description: "Qué incluye el mantenimiento y qué equipos cubre.",
    icon: Wrench,
  },
  {
    id: "planificacion",
    label: "Planificación",
    hint: "Visitas del año",
    description: "Cuántas visitas al año y en qué fechas (de 1 a 4).",
    icon: CalendarRange,
  },
];

type SelectOption = { value: string; label: string };

type Props = {
  open: boolean;
  editing: boolean;
  /** Id de la póliza en edición: su propia cotización no cuenta como «en uso». */
  polizaId?: number | null;
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

const PASO_DE: Record<Campo, PasoId> = {
  cliente: "cliente",
  cotizacion: "cliente",
  servicio: "servicio",
  equipos: "servicio",
  visitas: "planificacion",
};

export default function PolizaFormModal({
  open,
  editing,
  polizaId = null,
  folio,
  folioIsPreview,
  initialValues,
  extraClienteOption = null,
  extraCotizacionOption = null,
  saving = false,
  onClose,
  onSave,
}: Props) {
  const formId = useId();
  const ids: Record<Campo, string> = {
    cliente: "poliza-elegir-cliente",
    cotizacion: `${formId}-cotizacion`,
    servicio: `${formId}-servicio`,
    equipos: `${formId}-equipos`,
    visitas: `${formId}-visitas`,
  };

  const [paso, setPaso] = useState<PasoId>("cliente");
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const extraCotValue = extraCotizacionOption?.value || "";
  const extraCotLabel = extraCotizacionOption?.label || "";

  useEffect(() => {
    if (!clienteId) {
      setCotizaciones([]);
      return;
    }
    let cancelled = false;
    setLoadingCot(true);
    listCotizacionesDeCliente(clienteId, polizaId)
      .then((rows) => {
        if (cancelled) return;
        const extra: CotizacionOption[] =
          extraCotValue && !rows.some((r) => r.value === extraCotValue)
            ? [{ value: extraCotValue, label: extraCotLabel || extraCotValue, folio: extraCotLabel || extraCotValue, fecha: "", status: "", ocupadaPor: "" }]
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
  }, [clienteId, polizaId, extraCotValue, extraCotLabel]);

  const listo: Record<PasoId, boolean> = {
    cliente: Boolean(clienteId && cotizacionId),
    servicio: Boolean(servicioTipo.trim() && equiposAtendidos.trim()),
    planificacion: validarVisitas(visitas) === null,
  };
  const nVisitas = normalizarVisitas(visitas).length;
  const cotSel: CotizacionOption | null =
    cotizaciones.find((c) => c.value === cotizacionId) ||
    (cotizacionId ? { value: cotizacionId, label: extraCotLabel, folio: extraCotLabel || "Cotización", fecha: "", status: "", ocupadaPor: "" } : null);
  const cotizacionLabel = cotSel?.folio || "";

  const limpiar = (k: Campo) => setErrores((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));

  const guardar = () => {
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
      // Salta al paso del primer error y enfoca el campo cuando ya se muestra.
      setPaso(PASO_DE[primero]);
      window.setTimeout(() => {
        const el = document.getElementById(ids[primero]);
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      }, 80);
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

  const panelCliente = (
    <>
      <SectionCard id={`${formId}-sec-cliente`} index={0} title="Cliente" icon={<Building2 />} hint="Empresa, persona o proveedor que contrata la póliza.">
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
      </SectionCard>

      <SectionCard
        id={`${formId}-sec-cotizacion`}
        index={1}
        title="Cotización"
        icon={<FileText />}
        hint="Respalda la póliza. Cada cotización se usa en una sola póliza."
        flush
        actions={
          cotSel ? (
            <button type="button" className={`${btn.ghost} ${btnSm}`} onClick={() => setPickerOpen(true)} aria-haspopup="dialog">
              <RefreshCw aria-hidden />
              Cambiar
            </button>
          ) : null
        }
      >
        {cotSel ? (
          <div key={cotSel.value} className="cot-fade flex items-start gap-3 px-4 py-3.5 sm:items-center sm:px-5">
            <span
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF] [&_svg]:size-4"
              aria-hidden
            >
              <FileText />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{cotSel.folio}</p>
                <span className={origenChip.digitalflow}>DigitalFlow</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {cotSel.fecha ? <span className={metaChip}>{formatFechaCorta(cotSel.fecha)}</span> : null}
                {cotSel.status ? <span className={metaChip}>{cotSel.status}</span> : null}
                {clienteNombre ? (
                  <span className={`${metaChip} max-w-[16rem] truncate`} title={clienteNombre}>
                    {clienteNombre}
                  </span>
                ) : null}
              </div>
            </div>
            <button type="button" className={iconBtnDanger} onClick={() => setCotizacionId("")} aria-label={`Quitar cotización ${cotSel.folio}`} title="Quitar">
              <X aria-hidden />
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <div className={`${emptyPanel} ${errores.cotizacion ? "border-[#F6CFCF]! dark:border-[#7F1D1D]!" : ""}`}>
              <span className="cot-tick mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
                <FileText className="size-5" aria-hidden />
              </span>
              <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Aún no hay cotización</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                {!clienteId
                  ? "Elige primero el cliente para ver sus cotizaciones DigitalFlow."
                  : loadingCot
                    ? "Buscando las cotizaciones del cliente…"
                    : cotizaciones.length === 0
                      ? "Este cliente no tiene cotizaciones DigitalFlow. Créala en Ventas → Cotización."
                      : `${cotizaciones.filter((c) => !c.ocupadaPor).length} de ${cotizaciones.length} cotizaciones disponibles para este cliente.`}
              </p>
              <button
                id={ids.cotizacion}
                type="button"
                className={`${btn.primary} mt-4 ${focusRing}`}
                onClick={() => setPickerOpen(true)}
                disabled={!clienteId}
                aria-haspopup="dialog"
              >
                <FilePlus2 aria-hidden />
                Vincular cotización
              </button>
              {errores.cotizacion ? (
                <p className={fieldError} role="alert">
                  {errores.cotizacion}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </SectionCard>

      <PolizaCotizacionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        clienteNombre={clienteNombre}
        cotizaciones={cotizaciones}
        loading={loadingCot}
        selectedId={cotizacionId}
        onSelect={(c) => {
          setCotizacionId(c.value);
          limpiar("cotizacion");
          setPickerOpen(false);
        }}
      />
    </>
  );

  const panelServicio = (
    <OrdenFormSection title="Alcance del servicio" description={`${TIPO_LABEL.cctv}.`} icon={<FileSignature />}>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Tipo de servicio" htmlFor={ids.servicio} required error={errores.servicio}>
          <input
            id={ids.servicio}
            value={servicioTipo}
            onChange={(e) => {
              setServicioTipo(e.target.value);
              if (e.target.value.trim()) limpiar("servicio");
            }}
            aria-invalid={Boolean(errores.servicio) || undefined}
            aria-required
            className={input}
            placeholder="Mantenimiento preventivo CCTV"
          />
        </Field>
        <Field label="Equipos atendidos" htmlFor={ids.equipos} required error={errores.equipos}>
          <input
            id={ids.equipos}
            value={equiposAtendidos}
            onChange={(e) => {
              setEquiposAtendidos(e.target.value);
              if (e.target.value.trim()) limpiar("equipos");
            }}
            aria-invalid={Boolean(errores.equipos) || undefined}
            aria-required
            className={input}
            placeholder="1 DVR y 10 cámaras"
          />
        </Field>
      </div>
    </OrdenFormSection>
  );

  const panelPlanificacion = (
    <OrdenFormSection
      title="Calendario de visitas"
      description="Las fechas se generan solas a partir de la primera; también puedes elegirlas libres."
      icon={<CalendarRange />}
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
    </OrdenFormSection>
  );

  return (
    <MantenimientoFormShell
      open={open}
      onClose={onClose}
      busy={saving}
      escapeBlocked={pickerOpen}
      ariaLabel={editing ? `Editar póliza ${folio}` : "Nueva póliza de mantenimiento"}
      icon={ShieldCheck}
      kicker="Póliza de mantenimiento"
      title={editing ? "Editar póliza" : "Nueva póliza"}
      editing={editing}
      folio={folio}
      folioNote={folioIsPreview ? "se asigna al guardar" : undefined}
      steps={PASOS}
      active={paso}
      onActiveChange={setPaso}
      done={listo}
      summary={[
        { label: "Cliente", value: clienteNombre },
        { label: "Cotización", value: cotizacionLabel },
        { label: "Visitas", value: listo.planificacion ? `${nVisitas} ${nVisitas === 1 ? "visita" : "visitas"} al año` : "" },
      ]}
      panels={{ cliente: panelCliente, servicio: panelServicio, planificacion: panelPlanificacion }}
      onSubmit={guardar}
      saveLabel={{ idle: editing ? "Guardar cambios" : "Crear póliza", busy: "Guardando…" }}
    />
  );
}
