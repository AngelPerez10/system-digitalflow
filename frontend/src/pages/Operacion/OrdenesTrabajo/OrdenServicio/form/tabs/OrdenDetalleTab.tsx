import type { MutableRefObject } from "react";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";
import DatePicker from "@/components/form/date-picker";
import type { CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
import LevantamientoForm from "../../../OrdenLevantamiento/LevantamientoForm";
import OrdenAdminCotizacionesField from "../fields/OrdenAdminCotizacionesField";
import type { OrdenStatusAdministrativo } from "../../shared/ordenesPageTypes";
import type { OrdenFormData } from "../useOrdenFormDraft";
import { ClearSelectionButton, type OrdenFieldKey } from "./ordenTabHelpers";

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
  tipoOrden,
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
  const statusSelectId = variant === "admin" ? statusTecnicoId : "orden-estado-problema";

  const tipoOrdenDisabled = variant === "tecnico" || isReadOnly || isLimitedEdit;

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
        <div id={panelId} role="tabpanel" aria-labelledby={labelledBy} className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
              <svg className="h-5 w-5 text-[#ea580c] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tipo de Orden de Trabajo</h4>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-white/10 dark:bg-gray-900/40">
              <label htmlFor={tipoOrdenSelectId} className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Selecciona el tipo de orden
              </label>
              <select
                id={tipoOrdenSelectId}
                value={tipoOrden}
                onChange={(e) => setTipoOrden(e.target.value as "servicio_tecnico" | "levantamiento" | "mantenimiento")}
                disabled={tipoOrdenDisabled}
                className={`h-10 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-theme-xs outline-none dark:border-gray-700 ${
                  tipoOrdenDisabled
                    ? "cursor-not-allowed bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400"
                    : "bg-white text-gray-800 focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20"
                }`}
              >
                <option value="servicio_tecnico">Servicio Técnico</option>
                <option value="levantamiento">Levantamiento</option>
                <option value="mantenimiento">Mantenimiento</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
              <svg className="h-5 w-5 text-[#ea580c] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Descripción de la Orden</h4>
            </div>
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-white/10 dark:bg-gray-900/40">
              <div>
                <label htmlFor={problematicaId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Problemática
                </label>
                <textarea
                  id={problematicaId}
                  value={formData.problematica}
                  readOnly={ro("problematica")}
                  disabled={ro("problematica")}
                  onChange={(e) => setFormData({ ...formData, problematica: e.target.value })}
                  rows={3}
                  className={`w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs outline-none dark:border-gray-700 ${inputLockedClass("problematica")}`}
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
                    className="inline-flex items-center gap-1 rounded-md bg-[#fff3e8] px-2 py-1 text-xs text-[#9a3412] dark:bg-[#ff801f]/15 dark:text-[#fdba74]"
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
                <label htmlFor={comentarioId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Comentario del Técnico
                </label>
                <textarea
                  id={comentarioId}
                  value={formData.comentario_tecnico}
                  readOnly={ro("comentario_tecnico")}
                  disabled={ro("comentario_tecnico")}
                  onChange={(e) => setFormData({ ...formData, comentario_tecnico: e.target.value })}
                  rows={3}
                  className={`w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs outline-none dark:border-gray-700 ${inputLockedClass("comentario_tecnico")}`}
                  placeholder="Observaciones del técnico..."
                />
              </div>

              <div>
                <label htmlFor={statusSelectId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  {variant === "admin" ? "Status del técnico" : "Estado del Problema"}
                </label>
                <select
                  id={statusSelectId}
                  value={formData.status}
                  disabled={ro("status")}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as "pendiente" | "resuelto" })
                  }
                  className={`h-10 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-theme-xs outline-none dark:border-gray-700 ${inputLockedClass("status")}`}
                >
                  <option value="pendiente">No, pendiente</option>
                  <option value="resuelto">Sí, problema resuelto</option>
                </select>
              </div>

              {variant === "admin" && isAdmin && setStatusAdministrativo && setFechaEnvioAdmin && setCotizacionesAdmin ? (
                <div className="relative overflow-hidden rounded-xl border border-[#e7ded0] bg-gradient-to-br from-[#fffdf8] via-white to-[#fff3e8]/70 p-4 dark:border-[#334155] dark:from-[#111a2b] dark:via-[#0f172a] dark:to-[#1a1510]">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#ff801f]/10 blur-2xl dark:bg-[#ff801f]/15" aria-hidden />
                  <div className="relative mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c2410c] dark:border-[#fb923c]/35 dark:bg-[#fb923c]/10 dark:text-[#fdba74]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ff801f]" aria-hidden />
                      Admin
                    </span>
                    <h5 className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">Seguimiento administrativo</h5>
                  </div>
                  <p className="relative mb-4 text-xs leading-relaxed text-[#78716c] dark:text-[#94a3b8]">
                    Control de oficina independiente del status del técnico. Las cotizaciones y el status administrativo se
                    guardan con la orden.
                  </p>
                  <div className="relative grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                    <div className={statusAdministrativo === "enviado" ? "" : "sm:col-span-2"}>
                      <label htmlFor={statusAdminId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
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
                        className={`h-10 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-theme-xs outline-none dark:border-gray-700 ${
                          isReadOnly || isLimitedEdit
                            ? "cursor-not-allowed bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400"
                            : "bg-white text-gray-800 focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20"
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
                        <label htmlFor={fechaEnvioAdminId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
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
