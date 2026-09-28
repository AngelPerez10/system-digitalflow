import { useMemo, type MutableRefObject } from "react";
import { ClipboardCheck } from "lucide-react";
import DatePicker from "@/components/form/date-picker";
import SearchableSelect, { type SearchableSelectOption } from "@/components/form/SearchableSelect";
import { useAutoGrowTextarea } from "@/hooks/useAutoGrowTextarea";
import { localDateKey } from "@/pages/Operacion/Proyectos/shared/proyectoListUtils";
import { Field, SectionCard } from "@/pages/Operacion/Proyectos/shared/ProyectoUi";
import { focusRing } from "@/pages/Operacion/Proyectos/shared/proyectoTokens";
import type { CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
import LevantamientoForm from "../../../OrdenLevantamiento/LevantamientoForm";
import OrdenAdminCotizacionesField from "../fields/OrdenAdminCotizacionesField";
import type { OrdenComboItem } from "../fields/OrdenHeroComboBox";
import type { OrdenStatusAdministrativo } from "../../shared/ordenesPageTypes";
import { COMENTARIO_TECNICO_MIN_LENGTH } from "../../shared/ordenesPageTypes";
import type { OrdenFormData } from "../useOrdenFormDraft";
import { useBufferedTextField } from "../useBufferedTextField";
import { OrdenFormSection, RequiredMark, type OrdenFieldKey } from "./ordenTabHelpers";

const SERVICIO_CREAR_PREFIX = "__crear__:";

const STATUS_ADMIN: { value: OrdenStatusAdministrativo; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "enviado", label: "Enviado" },
  { value: "cerrado", label: "Cerrado" },
];

export type OrdenDetalleTabProps = {
  /** «trabajo» = trabajo en campo (y levantamiento); «admin» = seguimiento administrativo. */
  part?: "trabajo" | "admin" | "all";
  /** true = sin envoltura de tabpanel (la pone quien compone el paso). */
  embedded?: boolean;
  variant: "admin" | "tecnico";
  panelId: string;
  labelledBy: string;
  isActive: boolean;
  showLevantamiento: boolean;
  tipoOrden: string;
  setTipoOrden: (v: "servicio_tecnico" | "levantamiento" | "mantenimiento") => void;
  isReadOnly: boolean;
  isLimitedEdit: boolean;
  editingOrden: { id?: number } | null;
  levantamientoSnapshotRef: MutableRefObject<unknown>;
  formData: OrdenFormData;
  setFormData: React.Dispatch<React.SetStateAction<OrdenFormData>>;
  ro: (field: OrdenFieldKey) => boolean;
  inputLockedClass: (field: OrdenFieldKey) => string;
  servicioSearch: string;
  setServicioSearch: (q: string) => void;
  serviciosDisponibles: string[];
  setServiciosDisponibles: (v: string[]) => void;
  addServicio: (servicio: string) => void;
  isAdmin?: boolean;
  statusAdminId?: string;
  fechaEnvioAdminId?: string;
  statusAdministrativo?: OrdenStatusAdministrativo;
  setStatusAdministrativo?: (v: OrdenStatusAdministrativo) => void;
  fechaEnvioAdmin?: string;
  setFechaEnvioAdmin?: (v: string) => void;
  cotizacionesAdmin?: CotizacionResumen[];
  setCotizacionesAdmin?: (v: CotizacionResumen[]) => void;
};

export function OrdenDetalleTab({
  variant,
  part = "all",
  embedded = false,
  panelId,
  labelledBy,
  isActive,
  showLevantamiento,
  isReadOnly,
  isLimitedEdit,
  editingOrden,
  levantamientoSnapshotRef,
  formData,
  setFormData,
  ro,
  inputLockedClass,
  servicioSearch,
  setServicioSearch,
  serviciosDisponibles,
  setServiciosDisponibles,
  addServicio,
  isAdmin = false,
  statusAdminId = "orden-status-admin",
  fechaEnvioAdminId = "orden-fecha-envio-admin",
  statusAdministrativo = "pendiente",
  setStatusAdministrativo,
  fechaEnvioAdmin = "",
  setFechaEnvioAdmin,
  cotizacionesAdmin = [],
  setCotizacionesAdmin,
}: OrdenDetalleTabProps) {
  const problematicaId = "orden-problematica";
  const comentarioId = "orden-comentario-tecnico";
  const serviciosLocked = ro("servicios_realizados");
  const selectedServicio = formData.servicios_realizados[0] || "";
  /** El comentario del técnico es obligatorio al cerrar la orden (resuelto / administrativo cerrado). */
  const comentarioTecnicoRequerido =
    Boolean(editingOrden) &&
    (formData.status === "resuelto" || statusAdministrativo === "cerrado");

  const problematicaField = useBufferedTextField(formData.problematica, (next) => {
    setFormData((prev) => (prev.problematica === next ? prev : { ...prev, problematica: next }));
  });
  const comentarioField = useBufferedTextField(formData.comentario_tecnico, (next) => {
    setFormData((prev) =>
      prev.comentario_tecnico === next ? prev : { ...prev, comentario_tecnico: next },
    );
  });
  const comentarioTextareaRef = useAutoGrowTextarea({ value: comentarioField.value });
  const problematicaTextareaRef = useAutoGrowTextarea({ value: problematicaField.value });

  const servicioOptions = useMemo((): OrdenComboItem[] => {
    const opts: OrdenComboItem[] = serviciosDisponibles.map((s) => ({ id: s, label: s }));
    if (selectedServicio && !opts.some((o) => o.id === selectedServicio)) {
      opts.unshift({ id: selectedServicio, label: selectedServicio });
    }
    const q = servicioSearch.trim();
    if (
      q &&
      !serviciosLocked &&
      !opts.some((o) => o.id.toLowerCase() === q.toLowerCase())
    ) {
      opts.unshift({
        id: `${SERVICIO_CREAR_PREFIX}${q}`,
        label: `Crear «${q}»`,
        description: "Agregar este servicio al catálogo de la orden",
      });
    }
    return opts;
  }, [serviciosDisponibles, selectedServicio, servicioSearch, serviciosLocked]);

  const servicioSelectOptions = useMemo((): SearchableSelectOption[] => {
    return servicioOptions.map((item) => ({
      value: item.id,
      label: item.label,
      description: item.description,
      isAction: item.id.startsWith(SERVICIO_CREAR_PREFIX),
    }));
  }, [servicioOptions]);

  const handleServicioChange = (value: string) => {
    if (serviciosLocked) return;
    if (!value) {
      return;
    }
    let name = value;
    if (value.startsWith(SERVICIO_CREAR_PREFIX)) {
      name = value.slice(SERVICIO_CREAR_PREFIX.length).trim();
      if (name && !serviciosDisponibles.some((s) => s.toLowerCase() === name.toLowerCase())) {
        setServiciosDisponibles([...serviciosDisponibles, name]);
      }
    }
    if (!name) return;
    addServicio(name);
    setServicioSearch(name);
  };

  const showTrabajo = part === "all" || part === "trabajo";
  const showAdmin = part === "all" || part === "admin";
  const adminLocked = isReadOnly || isLimitedEdit;

  return (
    <>
      {showLevantamiento && showTrabajo && (
        <div className={isActive ? "" : "hidden"} aria-hidden={!isActive}>
          <LevantamientoForm
            ordenId={editingOrden?.id ?? null}
            disabled={isReadOnly || isLimitedEdit}
            onSnapshot={(snapshot) => {
              levantamientoSnapshotRef.current = snapshot;
            }}
          />
        </div>
      )}

      <div
          {...(embedded
            ? {}
            : {
                id: panelId,
                role: "tabpanel",
                "aria-labelledby": labelledBy,
                tabIndex: isActive ? -1 : undefined,
              })}
          hidden={!isActive}
          className="space-y-5 focus:outline-none"
        >
          {showTrabajo && (
          <OrdenFormSection
            title="Trabajo en campo"
            description="Qué reportó el cliente, qué se hizo y el cierre del técnico."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
              <div>
                <label htmlFor={problematicaId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                  Problemática
                </label>
                <textarea
                  ref={problematicaTextareaRef}
                  id={problematicaId}
                  value={problematicaField.value}
                  readOnly={ro("problematica")}
                  disabled={ro("problematica")}
                  onChange={(e) => problematicaField.onChange(e.target.value)}
                  onFocus={problematicaField.onFocus}
                  onBlur={problematicaField.onBlur}
                  rows={3}
                  className={`w-full min-h-20 max-h-80 resize-none overflow-hidden rounded-[10px] border border-[#E7E7EA] px-3.5 py-2.5 text-sm outline-none dark:border-[#273244] ${inputLockedClass("problematica")}`}
                  placeholder="Describe el problema reportado"
                />
              </div>

              <div>
                <SearchableSelect
                  id="orden-servicios-realizados"
                  label="Servicios realizados"
                  required
                  placeholder={
                    serviciosLocked && variant === "tecnico"
                      ? "Servicios (solo lectura)"
                      : "Buscar o crear servicio…"
                  }
                  triggerAriaLabel="Mostrar lista de servicios"
                  value={selectedServicio || ""}
                  onChange={(v) => handleServicioChange(v)}
                  options={servicioSelectOptions}
                  onSearchChange={(value) => {
                    if (serviciosLocked) return;
                    setServicioSearch(value);
                  }}
                  disabled={serviciosLocked}
                  allowClearOption={false}
                  emptyMessage="No hay servicios. Escribe un nombre para crear uno."
                  describedBy="orden-servicios-hint"
                  maxVisibleItems={60}
                />
                <p id="orden-servicios-hint" className="mt-1 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
                  Elige uno de la lista o escribe un nombre nuevo para crearlo.
                </p>
              </div>

              <div>
                <label htmlFor={comentarioId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                  Comentario del Técnico
                  {comentarioTecnicoRequerido ? <RequiredMark /> : null}
                </label>
                {(() => {
                  const comentarioLen = (comentarioField.value || "").trim().length;
                  const requiereMinimo = comentarioTecnicoRequerido;
                  const cumpleMinimo = comentarioLen >= COMENTARIO_TECNICO_MIN_LENGTH;
                  return (
                    <>
                      <textarea
                        ref={comentarioTextareaRef}
                        id={comentarioId}
                        value={comentarioField.value}
                        readOnly={ro("comentario_tecnico")}
                        disabled={ro("comentario_tecnico")}
                        onChange={(e) => comentarioField.onChange(e.target.value)}
                        onFocus={comentarioField.onFocus}
                        onBlur={comentarioField.onBlur}
                        rows={4}
                        minLength={requiereMinimo ? COMENTARIO_TECNICO_MIN_LENGTH : undefined}
                        aria-describedby={`${comentarioId}-hint`}
                        className={`w-full min-h-26 max-h-80 resize-none rounded-[10px] border border-[#E7E7EA] px-3.5 py-2.5 text-sm outline-none dark:border-[#273244] ${inputLockedClass("comentario_tecnico")}`}
                        placeholder={
                          requiereMinimo
                            ? `Observaciones del técnico (mínimo ${COMENTARIO_TECNICO_MIN_LENGTH} caracteres)...`
                            : "Observaciones del técnico..."
                        }
                      />
                      <p
                        id={`${comentarioId}-hint`}
                        className={`mt-1 text-[11px] ${
                          requiereMinimo && !cumpleMinimo
                            ? "text-amber-700 dark:text-amber-400"
                            : requiereMinimo && cumpleMinimo
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-[#6E6E77] dark:text-[#8ea0b8]"
                        }`}
                      >
                        {requiereMinimo
                          ? `${comentarioLen} / ${COMENTARIO_TECNICO_MIN_LENGTH} caracteres mínimo`
                          : `${comentarioLen} caracteres`}
                      </p>
                    </>
                  );
                })()}
              </div>
          </OrdenFormSection>
          )}

          {showAdmin && variant === "admin" && isAdmin && setStatusAdministrativo && setFechaEnvioAdmin && setCotizacionesAdmin ? (
            <>
              <OrdenAdminCotizacionesField
                value={cotizacionesAdmin}
                onChange={setCotizacionesAdmin}
                disabled={adminLocked}
                index={0}
              />

              <SectionCard
                id={`${statusAdminId}-section`}
                index={1}
                title="Seguimiento administrativo"
                icon={<ClipboardCheck />}
                hint="Estado de oficina sobre las cotizaciones vinculadas, independiente del status del técnico. Solo lo ven administradores."
                locked={adminLocked}
              >
                <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
                  <Field label="Status administrativo" labelId={statusAdminId}>
                    <div
                      role="radiogroup"
                      aria-labelledby={statusAdminId}
                      aria-disabled={adminLocked || undefined}
                      className="grid grid-cols-2 gap-1 rounded-[12px] border border-[#E7E7EA] bg-[#F4F4F5]/70 p-1 dark:border-[#273244] dark:bg-[#0F172A] sm:grid-cols-4"
                    >
                      {STATUS_ADMIN.map((opt) => {
                        const active = statusAdministrativo === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={adminLocked}
                            onClick={() => {
                              setStatusAdministrativo(opt.value);
                              if (opt.value === "enviado" && !fechaEnvioAdmin) {
                                setFechaEnvioAdmin(localDateKey());
                              }
                            }}
                            className={`cot-press min-h-10 rounded-[9px] px-2 text-[13px] font-semibold disabled:cursor-not-allowed ${focusRing} ${
                              active
                                ? "bg-white text-[#09090B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:text-white dark:ring-[#273244]"
                                : "text-[#52525B] hover:text-[#09090B] disabled:opacity-60 disabled:hover:text-[#52525B] dark:text-[#8EA0B8] dark:hover:text-white"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  {statusAdministrativo === "enviado" ? (
                    <div className="cot-fade">
                      <DatePicker
                        key={`fecha-envio-admin-${editingOrden?.id ?? "new"}-${statusAdministrativo}`}
                        id={fechaEnvioAdminId}
                        label="Fecha de envío"
                        placeholder="Seleccionar fecha"
                        disabled={adminLocked}
                        defaultDate={fechaEnvioAdmin || undefined}
                        onChange={(_dates, currentDateString) => {
                          setFechaEnvioAdmin(currentDateString || "");
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </>
          ) : null}
        </div>
    </>
  );
}
