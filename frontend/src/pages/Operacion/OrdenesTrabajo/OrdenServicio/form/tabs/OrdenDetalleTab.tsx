import type { MutableRefObject } from "react";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";
import DatePicker from "@/components/form/date-picker";
import type { CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
import LevantamientoForm from "../../../OrdenLevantamiento/LevantamientoForm";
import OrdenAdminCotizacionesField from "../fields/OrdenAdminCotizacionesField";
import type { OrdenStatusAdministrativo } from "../../shared/ordenesPageTypes";
import { COMENTARIO_TECNICO_MIN_LENGTH } from "../../shared/ordenesPageTypes";
import { formatYmdToDMY } from "../../shared/ordenesPageUtils";
import type { OrdenFormData } from "../useOrdenFormDraft";
import { ClearSelectionButton, type OrdenFieldKey } from "./ordenTabHelpers";

function localYmdAndHm(now = new Date()): { ymd: string; hm: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    ymd: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    hm: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

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
  servicioActions: unknown[];
  servicioSearch: string;
  setServicioSearch: (q: string) => void;
  serviciosDisponibles: string[];
  setServiciosDisponibles: (v: string[]) => void;
  addServicio: (servicio: string) => void;
  isAdmin?: boolean;
  statusTecnicoId?: string;
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
  servicioActions,
  servicioSearch,
  setServicioSearch,
  serviciosDisponibles,
  setServiciosDisponibles,
  addServicio,
  isAdmin = false,
  statusTecnicoId = "orden-status-tecnico",
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
  const motivoPausaId = "orden-motivo-pausa";
  const statusSelectId = variant === "admin" ? statusTecnicoId : "orden-estado-problema";


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
          className="space-y-5 focus:outline-none"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244]">
              <svg className="h-5 w-5 text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Tipo de Orden de Trabajo</h3>
            </div>
            <div className="rounded-xl border border-[#E7E7EA] bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111827]">
              <label htmlFor={tipoOrdenSelectId} className="mb-2 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                Selecciona el tipo de orden
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
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#E7E7EA] pb-2 dark:border-[#273244]">
              <svg className="h-5 w-5 text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Descripción de la Orden</h3>
            </div>
            <div className="space-y-4 rounded-xl border border-[#E7E7EA] bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111827]">
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

              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <ActionSearchBar
                    actions={servicioActions as never}
                    defaultOpen={false}
                    label="Servicios Realizados"
                    placeholder={
                      ro("servicios_realizados") && variant === "tecnico"
                        ? "Servicios (Solo lectura)"
                        : "Buscar o agregar servicio..."
                    }
                    value={servicioSearch}
                    onQueryChange={setServicioSearch}
                    onSelectAction={(action: { id?: string | number }) => {
                      if (ro("servicios_realizados")) return;
                      if (action?.id === "__new__") {
                        const nuevoServicio = servicioSearch.trim();
                        if (nuevoServicio && !serviciosDisponibles.includes(nuevoServicio)) {
                          setServiciosDisponibles([...serviciosDisponibles, nuevoServicio]);
                        }
                        addServicio(nuevoServicio);
                        return;
                      }
                      addServicio(String(action.id));
                    }}
                  />
                </div>
                {formData.servicios_realizados.length > 0 && !ro("servicios_realizados") && (
                  <ClearSelectionButton onClick={() => setFormData({ ...formData, servicios_realizados: [] })} />
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {formData.servicios_realizados.map((servicio, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-md bg-[#F1F5FF] px-2 py-1 text-xs text-[#1244D1] dark:bg-[#1B5CFF]/15 dark:text-[#4B7CFF]"
                  >
                    {servicio}
                    {!ro("servicios_realizados") && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            servicios_realizados: formData.servicios_realizados.filter((_, i) => i !== index),
                          });
                        }}
                        className="ml-1 hover:text-[#7c2d12] dark:hover:text-[#ffedd5]"
                        aria-label={`Quitar servicio ${servicio}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <div>
                <label htmlFor={comentarioId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                  Comentario del Técnico
                </label>
                {(() => {
                  const comentarioLen = (formData.comentario_tecnico || "").trim().length;
                  const requiereMinimo =
                    Boolean(editingOrden) &&
                    (formData.status === "resuelto" || statusAdministrativo === "cerrado");
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

              <div>
                <label htmlFor={statusSelectId} className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]">
                  {variant === "admin" ? "Status del técnico" : "Estado del Problema"}
                </label>
                <select
                  id={statusSelectId}
                  value={formData.status}
                  disabled={ro("status")}
                  onChange={(e) => {
                    const next = e.target.value as "pendiente" | "pausado" | "resuelto";
                    setFormData((prev) => {
                      if (next === "resuelto") {
                        const { ymd, hm } = localYmdAndHm();
                        return {
                          ...prev,
                          status: next,
                          fecha_finalizacion: prev.fecha_finalizacion || ymd,
                          hora_termino: prev.hora_termino || hm,
                        };
                      }
                      return { ...prev, status: next };
                    });
                  }}
                  className={`h-11 w-full rounded-[10px] border border-[#E7E7EA] px-3.5 text-sm outline-none transition-colors dark:border-[#273244] ${inputLockedClass("status")}`}
                >
                  <option value="pendiente">No, pendiente</option>
                  <option value="pausado">Pausado</option>
                  <option value="resuelto">Sí, problema resuelto</option>
                </select>
                {formData.status === "resuelto" && formData.fecha_finalizacion ? (
                  <p className="mt-1.5 text-xs text-[#52525B] dark:text-[#8ea0b8]" aria-live="polite">
                    Fecha de cierre: {formatYmdToDMY(formData.fecha_finalizacion)}
                    {formData.hora_termino ? ` · ${formData.hora_termino.slice(0, 5)}` : ""}
                  </p>
                ) : null}
              </div>

              {formData.status === "pausado" ? (
                <div>
                  <label
                    htmlFor={motivoPausaId}
                    className="mb-1 block text-xs font-medium text-[#52525B] dark:text-[#B7C1D1]"
                  >
                    ¿Por qué se pausó?
                  </label>
                  <textarea
                    id={motivoPausaId}
                    value={formData.motivo_pausa}
                    readOnly={ro("motivo_pausa")}
                    disabled={ro("motivo_pausa")}
                    onChange={(e) => setFormData({ ...formData, motivo_pausa: e.target.value })}
                    rows={3}
                    required
                    aria-required="true"
                    aria-describedby={`${motivoPausaId}-hint`}
                    placeholder="Describe el motivo de la pausa…"
                    className={`w-full resize-none rounded-[10px] border border-[#E7E7EA] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] ${inputLockedClass("motivo_pausa")}`}
                  />
                  <p id={`${motivoPausaId}-hint`} className="mt-1 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
                    Obligatorio al marcar Pausado.
                  </p>
                </div>
              ) : null}

              {variant === "admin" && isAdmin && setStatusAdministrativo && setFechaEnvioAdmin && setCotizacionesAdmin ? (
                <div className="relative overflow-hidden rounded-xl border border-[#E7E7EA] bg-gradient-to-br from-[#FAFAFA] via-white to-[#F1F5FF]/70 p-4 dark:border-[#273244] dark:from-[#111827] dark:via-[#0f172a] dark:to-[#1a1510]">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#1B5CFF]/10 blur-2xl dark:bg-[#1B5CFF]/15" aria-hidden />
                  <div className="relative mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BFD3FF] bg-[#F1F5FF] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[#4B7CFF]/10 dark:text-[#4B7CFF]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1B5CFF]" aria-hidden />
                      Admin
                    </span>
                    <h4 className="text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]">Seguimiento administrativo</h4>
                  </div>
                  <p className="relative mb-4 text-xs leading-relaxed text-[#6E6E77] dark:text-[#94a3b8]">
                    Control de oficina independiente del status del técnico. Las cotizaciones y el status administrativo se
                    guardan con la orden.
                  </p>
                  <div className="relative grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
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
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
