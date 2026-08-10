import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import {
  erpBodyClass,
  erpSecondaryBtnClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import {
  OrdenFormModalHeader,
  OrdenModalFooterActions,
  OrdenModalPrimaryButton,
} from "../../OrdenesTrabajo/OrdenTrabajoModals";
import {
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpModalBodyClass,
  erpModalFooterClass,
  erpModalFormScrollClass,
  erpModalShellClass,
  erpModalTabClass,
  erpModalTabListClass,
} from "../../OrdenesTrabajo/ordenTrabajoStyles";
import { ProyectoFormInstalacionesPanel, type ProyectoInstalacionDraft } from "../instalaciones";
import { ProyectoCotizacionPickerModal } from "./cotizaciones/ProyectoCotizacionPickerModal";
import { ProyectoClienteTab } from "./tabs/ProyectoClienteTab";
import { ProyectoOperacionTab } from "./tabs/ProyectoOperacionTab";
import { ProyectoPresupuestoTab } from "./tabs/ProyectoPresupuestoTab";
import { useProyectoFormState, type ProyectoFormTab } from "./useProyectoFormState";
import { ProyectoSyscomModeloPicker } from "./fields/ProyectoSyscomModeloPicker";
import type { ProyectoDraft } from "../shared/proyectoTypes";

type ProyectoFormModalProps = {
  open: boolean;
  editing: boolean;
  /** ID del proyecto en edición; null/undefined en alta nueva. */
  proyectoId?: number | null;
  initialDraft: ProyectoDraft;
  onClose: () => void;
  onSave: (
    draft: ProyectoDraft,
    extras?: {
      instalacionDraft?: ProyectoInstalacionDraft | null;
      /** Técnico asignado: no reenviar campos bloqueados en el PATCH. */
      omitTechnicianLockedFields?: boolean;
    }
  ) => void | Promise<void>;
};

const FORM_TABS: { id: ProyectoFormTab; label: string; step: string }[] = [
  { id: "cliente", label: "Cliente", step: "Paso 1" },
  { id: "instalaciones", label: "Instalaciones", step: "Paso 2" },
  { id: "operacion", label: "Operación", step: "Paso 3" },
  { id: "presupuesto", label: "Presupuesto", step: "Paso 4" },
];

export default function ProyectoFormModal({
  open,
  editing,
  proyectoId = null,
  initialDraft,
  onClose,
  onSave,
}: ProyectoFormModalProps) {
  const { isAdmin } = useAuth();
  const clearCotizacionesTitleId = useId();

  const {
    formRef,
    formScrollRef,
    activeTab,
    setActiveTab,
    goToNextTab,
    goToPrevTab,
    handleTabKeyDown,
    tabIds,
    panelIds,
    instalacionDraft,
    setInstalacionDraft,
    cliente,
    setCliente,
    clienteId,
    setClienteId,
    cotizaciones,
    equipos,
    tiposTrabajo,
    setTiposTrabajo,
    assignedTechnicianLocked,
    status,
    motivoPausa,
    setMotivoPausa,
    fechaAutorizacion,
    setFechaAutorizacion,
    quienAutorizo,
    setQuienAutorizo,
    fechasInicio,
    fechaDesde,
    fechaHasta,
    horaLlegada,
    setHoraLlegada,
    horaSalida,
    setHoraSalida,
    tecnicosAsignados,
    setTecnicosAsignados,
    auxiliaresAsignados,
    setAuxiliaresAsignados,
    vehiculoAsignado,
    setVehiculoAsignado,
    herramientasGenerales,
    setHerramientasGenerales,
    notasPorDia,
    porcentajeAvance,
    porcentajeExacto,
    setPorcentajeExacto,
    incidencias,
    setIncidencias,
    requerimientosAdicionales,
    setRequerimientosAdicionales,
    requierePresupuestoAdicional,
    setRequierePresupuestoAdicional,
    cotizacionAdicional,
    setCotizacionAdicional,
    evidenciasUrls,
    setEvidenciasUrls,
    firmaClienteUrl,
    setFirmaClienteUrl,
    firmaTecnicoUrl,
    tecnicoSignatureUrl,
    closeBlockedMessage,
    setCloseBlockedMessage,
    servicios,
    catalogError,
    notasLiveMessage,
    clienteStepError,
    setClienteStepError,
    horaSalidaError,
    setHoraSalidaError,
    presupuestoCargado,
    equiposPorCotizacion,
    tecnicoOptions,
    pickerOpen,
    setPickerOpen,
    confirmClearCotizaciones,
    setConfirmClearCotizaciones,
    pickerTarget,
    pickerTab,
    setPickerTab,
    pickerSearch,
    setPickerSearch,
    setPickerResults,
    pickerLoading,
    pickerError,
    setPickerError,
    pickerLoadingId,
    cotizacionesFiltradas,
    modeloPickerLineaId,
    setModeloPickerLineaId,
    equipoParaModeloPicker,
    handleSubmit,
    handleStatusChange,
    handleCargarCotizacion,
    openCotizacionPicker,
    handleQuitarCotizacion,
    handleLimpiarPresupuesto,
    updateEquipo,
    handleSelectModeloSyscom,
    handleRestaurarModeloOriginal,
    diasRangoCount,
    setFechaRangoStart,
    setFechaRangoEnd,
    addNotaDia,
    removeNotaDia,
    updateNotaDia,
    updateNotaDiaImagenes,
    setPorcentajeAvanceSafe,
    handlePorcentajeExactoChange,
    stampHoraLlegada,
    stampHoraSalida,
  } = useProyectoFormState({
    open,
    proyectoId: proyectoId ?? null,
    initialDraft,
    onSave,
  });

  return (
    <>
      <Modal
        mobileBottomSheet
        isOpen={open}
        onClose={onClose}
        closeOnBackdropClick={false}
        closeOnEscape={!pickerOpen && !modeloPickerLineaId && !confirmClearCotizaciones}
        ariaLabel={`${editing ? "Editar" : "Nuevo"} proyecto`}
        className={erpModalShellClass}
      >
        <OrdenFormModalHeader
          editing={editing}
          contextLabel="Operación · Proyectos"
          title={`${editing ? "Editar" : "Nuevo"} proyecto`}
          subtitle="Captura y revisa los datos antes de guardar"
        />

        <div className={erpModalBodyClass}>
          <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div
              ref={formScrollRef}
              className={erpModalFormScrollClass}
              data-proyecto-form-scroll
              data-signature-scroll-lock
            >
              <div
                className={erpModalTabListClass}
                role="tablist"
                aria-label="Secciones del proyecto"
              >
                {FORM_TABS.map((tab, index) => (
                  <button
                    key={tab.id}
                    type="button"
                    id={tabIds[tab.id]}
                    role="tab"
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    aria-selected={activeTab === tab.id}
                    aria-controls={panelIds[tab.id]}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setClienteStepError("");
                    }}
                    onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                    className={erpModalTabClass(activeTab === tab.id)}
                  >
                    <span className="tabular-nums opacity-70 sm:hidden" aria-hidden>
                      {index + 1}.
                    </span>
                    <span className="ml-1 sm:ml-0">{tab.label}</span>
                    <span className="sr-only"> ({tab.step})</span>
                  </button>
                ))}
              </div>

              {activeTab === "cliente" && (
                <ProyectoClienteTab
                  panelId={panelIds.cliente}
                  labelledBy={tabIds.cliente}
                  cliente={cliente}
                  setCliente={setCliente}
                  clienteId={clienteId}
                  setClienteId={setClienteId}
                  clienteStepError={clienteStepError}
                  setClienteStepError={setClienteStepError}
                  quienAutorizo={quienAutorizo}
                  setQuienAutorizo={setQuienAutorizo}
                  presupuestoCargado={presupuestoCargado}
                  cotizaciones={cotizaciones}
                  setConfirmClearCotizaciones={setConfirmClearCotizaciones}
                  openCotizacionPicker={openCotizacionPicker}
                  handleQuitarCotizacion={handleQuitarCotizacion}
                  assignedTechnicianLocked={assignedTechnicianLocked}
                />
              )}

              {activeTab === "operacion" && (
                <ProyectoOperacionTab
                  panelId={panelIds.operacion}
                  labelledBy={tabIds.operacion}
                  editing={editing}
                  catalogError={catalogError}
                  servicios={servicios}
                  tiposTrabajo={tiposTrabajo}
                  setTiposTrabajo={setTiposTrabajo}
                  assignedTechnicianLocked={assignedTechnicianLocked}
                  status={status}
                  handleStatusChange={handleStatusChange}
                  motivoPausa={motivoPausa}
                  setMotivoPausa={setMotivoPausa}
                  fechaAutorizacion={fechaAutorizacion}
                  setFechaAutorizacion={setFechaAutorizacion}
                  horaLlegada={horaLlegada}
                  setHoraLlegada={setHoraLlegada}
                  horaSalida={horaSalida}
                  setHoraSalida={setHoraSalida}
                  horaSalidaError={horaSalidaError}
                  setHoraSalidaError={setHoraSalidaError}
                  stampHoraLlegada={stampHoraLlegada}
                  stampHoraSalida={stampHoraSalida}
                  fechaDesde={fechaDesde}
                  fechaHasta={fechaHasta}
                  setFechaRangoStart={setFechaRangoStart}
                  setFechaRangoEnd={setFechaRangoEnd}
                  diasRangoCount={diasRangoCount}
                  fechasInicio={fechasInicio}
                  tecnicosAsignados={tecnicosAsignados}
                  setTecnicosAsignados={setTecnicosAsignados}
                  auxiliaresAsignados={auxiliaresAsignados}
                  setAuxiliaresAsignados={setAuxiliaresAsignados}
                  vehiculoAsignado={vehiculoAsignado}
                  setVehiculoAsignado={setVehiculoAsignado}
                  herramientasGenerales={herramientasGenerales}
                  setHerramientasGenerales={setHerramientasGenerales}
                  tecnicoOptions={tecnicoOptions}
                  notasPorDia={notasPorDia}
                  notasLiveMessage={notasLiveMessage}
                  addNotaDia={addNotaDia}
                  removeNotaDia={removeNotaDia}
                  updateNotaDia={updateNotaDia}
                  updateNotaDiaImagenes={updateNotaDiaImagenes}
                  porcentajeAvance={porcentajeAvance}
                  porcentajeExacto={porcentajeExacto}
                  setPorcentajeAvanceSafe={setPorcentajeAvanceSafe}
                  handlePorcentajeExactoChange={handlePorcentajeExactoChange}
                  setPorcentajeExacto={setPorcentajeExacto}
                  closeBlockedMessage={closeBlockedMessage}
                  setCloseBlockedMessage={setCloseBlockedMessage}
                  incidencias={incidencias}
                  setIncidencias={setIncidencias}
                  requerimientosAdicionales={requerimientosAdicionales}
                  setRequerimientosAdicionales={setRequerimientosAdicionales}
                  requierePresupuestoAdicional={requierePresupuestoAdicional}
                  setRequierePresupuestoAdicional={setRequierePresupuestoAdicional}
                  cotizacionAdicional={cotizacionAdicional}
                  setCotizacionAdicional={setCotizacionAdicional}
                  openCotizacionPicker={openCotizacionPicker}
                  evidenciasUrls={evidenciasUrls}
                  setEvidenciasUrls={setEvidenciasUrls}
                  firmaClienteUrl={firmaClienteUrl}
                  setFirmaClienteUrl={setFirmaClienteUrl}
                  firmaTecnicoUrl={firmaTecnicoUrl}
                  tecnicoSignatureUrl={tecnicoSignatureUrl}
                />
              )}

              {activeTab === "presupuesto" && (
                <ProyectoPresupuestoTab
                  panelId={panelIds.presupuesto}
                  labelledBy={tabIds.presupuesto}
                  presupuestoCargado={presupuestoCargado}
                  cotizaciones={cotizaciones}
                  isAdmin={isAdmin}
                  equipos={equipos}
                  equiposPorCotizacion={equiposPorCotizacion}
                  onUpdateEquipo={updateEquipo}
                  onCambiarModelo={setModeloPickerLineaId}
                  onRestaurarModelo={handleRestaurarModeloOriginal}
                />
              )}

              {activeTab === "instalaciones" && (
                <div
                  id={panelIds.instalaciones}
                  role="tabpanel"
                  aria-labelledby={tabIds.instalaciones}
                  className="space-y-5"
                >
                  <ProyectoFormInstalacionesPanel
                    proyectoId={proyectoId ?? null}
                    active={activeTab === "instalaciones"}
                    draft={instalacionDraft}
                    onDraftChange={setInstalacionDraft}
                  />
                </div>
              )}
            </div>
          </form>

          <footer className={erpModalFooterClass}>
            <OrdenModalFooterActions
              onCancel={activeTab === "cliente" ? onClose : goToPrevTab}
              cancelLabel={activeTab === "cliente" ? "Cancelar" : "Anterior"}
              primary={
                activeTab !== "presupuesto" ? (
                  <OrdenModalPrimaryButton
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToNextTab(true);
                    }}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Siguiente
                  </OrdenModalPrimaryButton>
                ) : (
                  <OrdenModalPrimaryButton
                    type="button"
                    disabled={!cliente.trim()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      formRef.current?.requestSubmit();
                    }}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {editing ? "Guardar cambios" : "Crear proyecto"}
                  </OrdenModalPrimaryButton>
                )
              }
            />
          </footer>
        </div>
      </Modal>

      <ProyectoCotizacionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        pickerTarget={pickerTarget}
        pickerTab={pickerTab}
        setPickerTab={setPickerTab}
        pickerSearch={pickerSearch}
        setPickerSearch={setPickerSearch}
        setPickerResults={setPickerResults}
        setPickerError={setPickerError}
        pickerLoading={pickerLoading}
        pickerError={pickerError}
        cotizacionesFiltradas={cotizacionesFiltradas}
        pickerLoadingId={pickerLoadingId}
        onSelect={handleCargarCotizacion}
      />

      <Modal
        isOpen={confirmClearCotizaciones}
        onClose={() => setConfirmClearCotizaciones(false)}
        closeOnBackdropClick={false}
        closeOnEscape
        ariaLabelledBy={clearCotizacionesTitleId}
        className={`${erpDeleteModalClass} z-[100000]`}
      >
        <div className={erpDeleteModalPanelClass}>
          <div className="mb-4 flex flex-col items-center text-center">
            <span
              className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
              aria-hidden
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h3 id={clearCotizacionesTitleId} className={erpSubheadingClass}>
              Quitar todas las cotizaciones
            </h3>
            <p className={`mt-2 text-sm ${erpBodyClass}`}>
              Se eliminarán {cotizaciones.length}{" "}
              {cotizaciones.length === 1 ? "cotización" : "cotizaciones"} del proyecto, junto con su presupuesto y el
              seguimiento de equipos. Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
            <button
              type="button"
              onClick={() => setConfirmClearCotizaciones(false)}
              className={`${erpSecondaryBtnClass} sm:min-w-[7rem]`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleLimpiarPresupuesto}
              className={`${erpDangerBtnClass} sm:min-w-[7rem] sm:flex-none`}
            >
              Sí, quitar todas
            </button>
          </div>
        </div>
      </Modal>

      <ProyectoSyscomModeloPicker
        open={Boolean(equipoParaModeloPicker)}
        equipoLabel={equipoParaModeloPicker?.modelo ?? ""}
        modeloActual={equipoParaModeloPicker?.modelo ?? ""}
        fuentePreferida={equipoParaModeloPicker?.fuenteProducto}
        onClose={() => setModeloPickerLineaId(null)}
        onSelect={handleSelectModeloSyscom}
      />
    </>
  );
}
