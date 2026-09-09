import { useMemo, type MutableRefObject } from "react";
import DatePicker from "@/components/form/date-picker";
import SearchableSelect from "@/components/form/SearchableSelect";
import type { CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
import LevantamientoForm from "../../../OrdenLevantamiento/LevantamientoForm";
import OrdenAdminCotizacionesField from "../fields/OrdenAdminCotizacionesField";
import type { OrdenStatusAdministrativo } from "../../shared/ordenesPageTypes";
import { COMENTARIO_TECNICO_MIN_LENGTH } from "../../shared/ordenesPageTypes";
import type { OrdenFormData } from "../useOrdenFormDraft";
import { OrdenFormSection, RequiredMark, type OrdenFieldKey } from "./ordenTabHelpers";

const SERVICIO_CREAR_PREFIX = "__crear__:";

export type OrdenDetalleTabProps = {
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
  panelId,
  labelledBy,
  isActive,
  showLevantamiento,
  setTipoOrden,
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
  const tipoOrdenSelectId = "orden-tipo-select";
  const problematicaId = "orden-problematica";
  const comentarioId = "orden-comentario-tecnico";
  const serviciosLocked = ro("servicios_realizados");
  const selectedServicio = formData.servicios_realizados[0] || "";
  /** El comentario del técnico es obligatorio al cerrar la orden (resuelto / administrativo cerrado). */
  const comentarioTecnicoRequerido =
    Boolean(editingOrden) &&
    (formData.status === "resuelto" || statusAdministrativo === "cerrado");

  const servicioOptions = useMemo(() => {
    const opts = serviciosDisponibles.map((s) => ({ value: s, label: s }));
    if (selectedServicio && !opts.some((o) => o.value === selectedServicio)) {
      opts.unshift({ value: selectedServicio, label: selectedServicio });
    }
    const q = servicioSearch.trim();
    if (
      q &&
      !serviciosLocked &&
      !opts.some((o) => o.value.toLowerCase() === q.toLowerCase())
    ) {
      opts.unshift({
        value: `${SERVICIO_CREAR_PREFIX}${q}`,
        label: `Crear «${q}»`,
      });
    }
    return opts;
  }, [serviciosDisponibles, selectedServicio, servicioSearch, serviciosLocked]);

  const handleServicioChange = (value: string) => {
    if (serviciosLocked) return;
    if (!value) {
      setFormData((prev) => ({ ...prev, servicios_realizados: [] }));
      setServicioSearch("");
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
  };

  return (
    <>
      {showLevantamiento && (
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

      {isActive && (
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className="space-y-6 focus:outline-none"
        >
          <OrdenFormSection
            title="Tipo de orden"
            description="En este módulo solo se capturan órdenes de servicio técnico."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            <div>
              <label htmlFor={tipoOrdenSelectId} className="mb-2 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                Tipo de orden
              </label>
              {/* Solo "Servicio Técnico" en Órdenes de servicio; Levantamiento y
                  Mantenimiento tienen sus propios módulos y no se crean desde aquí. */}
              <select
                id={tipoOrdenSelectId}
                value="servicio_tecnico"
                onChange={() => setTipoOrden("servicio_tecnico")}
                disabled
                aria-readonly="true"
                className="h-11 w-full cursor-not-allowed rounded-[10px] border border-[#E7E7EA] bg-[#F4F4F5] px-3.5 text-sm text-[#6E6E77] outline-none transition-colors dark:border-[#273244] dark:bg-[#0f172a]/60 dark:text-[#8ea0b8]"
              >
                <option value="servicio_tecnico">Servicio Técnico</option>
              </select>
            </div>
          </OrdenFormSection>

          <OrdenFormSection
            title="Trabajo en campo"
            description="Problemática, servicios hechos y cierre del técnico."
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
                  id={problematicaId}
                  value={formData.problematica}
                  readOnly={ro("problematica")}
                  disabled={ro("problematica")}
                  onChange={(e) => setFormData({ ...formData, problematica: e.target.value })}
                  rows={3}
                  className={`w-full resize-none rounded-[10px] border border-[#E7E7EA] px-3.5 py-2.5 text-sm outline-none transition-colors dark:border-[#273244] ${inputLockedClass("problematica")}`}
                  placeholder="Describe el problema reportado"
                />
              </div>

              <div>
                <SearchableSelect
                  id="orden-servicios-realizados"
                  label="Servicios realizados"
                  required
                  value={selectedServicio}
                  onChange={handleServicioChange}
                  onSearchChange={setServicioSearch}
                  options={servicioOptions}
                  disabled={serviciosLocked}
                  placeholder={
                    serviciosLocked && variant === "tecnico"
                      ? "Servicios (solo lectura)"
                      : "Buscar o crear servicio…"
                  }
                  filterLocally
                />
                <p className="mt-1.5 text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
                  Elige uno de la lista o escribe un nombre nuevo para crearlo.
                </p>
              </div>

              <div>
                <label htmlFor={comentarioId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                  Comentario del Técnico
                  {comentarioTecnicoRequerido ? <RequiredMark /> : null}
                </label>
                {(() => {
                  const comentarioLen = (formData.comentario_tecnico || "").trim().length;
                  const requiereMinimo = comentarioTecnicoRequerido;
                  const cumpleMinimo = comentarioLen >= COMENTARIO_TECNICO_MIN_LENGTH;
                  return (
                    <>
                      <textarea
                        id={comentarioId}
                        value={formData.comentario_tecnico}
                        readOnly={ro("comentario_tecnico")}
                        disabled={ro("comentario_tecnico")}
                        onChange={(e) => setFormData({ ...formData, comentario_tecnico: e.target.value })}
                        rows={4}
                        minLength={requiereMinimo ? COMENTARIO_TECNICO_MIN_LENGTH : undefined}
                        aria-describedby={`${comentarioId}-hint`}
                        className={`w-full resize-none rounded-[10px] border border-[#E7E7EA] px-3.5 py-2.5 text-sm outline-none transition-colors dark:border-[#273244] ${inputLockedClass("comentario_tecnico")}`}
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

          {variant === "admin" && isAdmin && setStatusAdministrativo && setFechaEnvioAdmin && setCotizacionesAdmin ? (
            <OrdenFormSection
              title="Seguimiento administrativo"
              description="Control de oficina independiente del status del técnico. Cotizaciones y status administrativo se guardan con la orden."
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <div className={statusAdministrativo === "enviado" ? "" : "sm:col-span-2"}>
                  <label htmlFor={statusAdminId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                    Status administrativo
                  </label>
                  <select
                    id={statusAdminId}
                    value={statusAdministrativo}
                    disabled={isReadOnly || isLimitedEdit}
                    onChange={(e) => {
                      const next = e.target.value as OrdenStatusAdministrativo;
                      setStatusAdministrativo(next);
                      if (next === "enviado" && !fechaEnvioAdmin) {
                        setFechaEnvioAdmin(new Date().toISOString().slice(0, 10));
                      }
                    }}
                    className={`h-11 w-full rounded-[10px] border border-[#E7E7EA] px-3.5 text-sm outline-none transition-colors dark:border-[#273244] ${
                      isReadOnly || isLimitedEdit
                        ? "cursor-not-allowed bg-[#F4F4F5] text-[#6E6E77] dark:bg-[#0f172a]/60 dark:text-[#8ea0b8]"
                        : "bg-white text-[#09090B] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:bg-[#111827] dark:text-[#F8FAFC] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]"
                    }`}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_revision">En revisión</option>
                    <option value="enviado">Enviado</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </div>
                {statusAdministrativo === "enviado" ? (
                  <div>
                    <label htmlFor={fechaEnvioAdminId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                      Fecha en que se envió
                    </label>
                    <div className="[&_input]:!h-10 [&_input]:!py-2 [&_input]:!text-sm">
                      <DatePicker
                        key={`fecha-envio-admin-${editingOrden?.id ?? "new"}-${statusAdministrativo}`}
                        id={fechaEnvioAdminId}
                        placeholder="Seleccionar fecha"
                        disabled={isReadOnly || isLimitedEdit}
                        defaultDate={fechaEnvioAdmin || undefined}
                        onChange={(_dates, currentDateString) => {
                          setFechaEnvioAdmin(currentDateString || "");
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <OrdenAdminCotizacionesField
                value={cotizacionesAdmin}
                onChange={setCotizacionesAdmin}
                disabled={isReadOnly || isLimitedEdit}
              />
            </OrdenFormSection>
          ) : null}
        </div>
      )}
    </>
  );
}
