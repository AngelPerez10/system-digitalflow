import { useId, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Check, FolderKanban, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { AppConfirmDialog, AppModalContext, AppSpinner } from "@/components/ui/modal-kit/ModalKit";
import { useAuth } from "@/context/AuthContext";
import { displayProyectoFolio } from "../shared/proyectoFormUtils";
import { EstadoPill, ProgressBar } from "../shared/ProyectoUi";
import { btn, fontSans } from "../shared/proyectoTokens";
import type { ProyectoInstalacionDraft } from "../instalaciones";
import { ProyectoCotizacionPickerModal } from "./cotizaciones/ProyectoCotizacionPickerModal";
import { ProyectoSyscomModeloPicker } from "./fields/ProyectoSyscomModeloPicker";
import { ProyectoStepChips, ProyectoStepRail } from "./ProyectoFormSteps";
import { PROYECTO_STEPS } from "./proyectoSteps";
import { ProyectoCampoTab } from "./tabs/ProyectoCampoTab";
import { ProyectoCierreTab } from "./tabs/ProyectoCierreTab";
import { ProyectoEquiposTab } from "./tabs/ProyectoEquiposTab";
import { ProyectoGeneralTab } from "./tabs/ProyectoGeneralTab";
import { ProyectoInstalacionTab } from "./tabs/ProyectoInstalacionTab";
import { ProyectoPlaneacionTab } from "./tabs/ProyectoPlaneacionTab";
import { PROYECTO_TAB_ORDER, useProyectoFormState, type ProyectoFormTab } from "./useProyectoFormState";
import type { ProyectoDraft } from "../shared/proyectoTypes";

export type ProyectoFormModalAlert = {
  show: boolean;
  variant: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
};

type ProyectoFormModalProps = {
  open: boolean;
  editing: boolean;
  /** ID del proyecto en edición; null/undefined en alta nueva. */
  proyectoId?: number | null;
  /** Folio del proyecto en edición (encabezado). */
  folio?: string | null;
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
  /** Alerta visible dentro del modal (errores de guardado); evita quedar oculta detrás del overlay. */
  modalAlert?: ProyectoFormModalAlert;
  /** true mientras se hace el POST/PATCH a la API; deshabilita navegación y muestra spinner en Guardar. */
  isSaving?: boolean;
};

const modalShell = `${fontSans} flex h-[min(94dvh,58rem)] w-full flex-col overflow-hidden rounded-t-[22px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_32px_80px_-24px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:bg-[#111827]! sm:h-[min(92dvh,58rem)] sm:w-[min(96vw,74rem)] sm:max-w-none sm:rounded-[22px]`;

export default function ProyectoFormModal({
  open,
  editing,
  proyectoId = null,
  folio = null,
  initialDraft,
  onClose,
  onSave,
  modalAlert,
  isSaving = false,
}: ProyectoFormModalProps) {
  const { isAdmin } = useAuth();
  const titleId = useId();
  const form = useProyectoFormState({ open, proyectoId: proyectoId ?? null, initialDraft, onSave });
  const {
    formRef,
    formScrollRef,
    activeTab,
    selectTab,
    stepState,
    saveNow,
    goToNextTab,
    goToPrevTab,
    handleSubmit,
    tabIds,
    panelIds,
    cliente,
    status,
    porcentajeAvance,
    assignedTechnicianLocked,
    cotizaciones,
    pickerOpen,
    setPickerOpen,
    confirmClearCotizaciones,
    setConfirmClearCotizaciones,
    modeloPickerLineaId,
    setModeloPickerLineaId,
    equipoParaModeloPicker,
  } = form;

  const stepIndex = PROYECTO_TAB_ORDER.indexOf(activeTab);
  const step = PROYECTO_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === PROYECTO_TAB_ORDER.length - 1;

  const blockedEscape = pickerOpen || Boolean(modeloPickerLineaId) || confirmClearCotizaciones || isSaving;

  /** Flechas entre pasos: enfoca el botón visible (riel en escritorio, chip en móvil). */
  const onStepKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: ProyectoFormTab) => {
    const idx = PROYECTO_TAB_ORDER.indexOf(current);
    const last = PROYECTO_TAB_ORDER.length - 1;
    const map: Record<string, number> = {
      ArrowDown: idx === last ? 0 : idx + 1,
      ArrowRight: idx === last ? 0 : idx + 1,
      ArrowUp: idx === 0 ? last : idx - 1,
      ArrowLeft: idx === 0 ? last : idx - 1,
      Home: 0,
      End: last,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = PROYECTO_TAB_ORDER[map[e.key]];
    selectTab(next);
    requestAnimationFrame(() => {
      const candidates = [document.getElementById(tabIds[next]), document.getElementById(`${tabIds[next]}-m`)];
      candidates.find((el) => el && el.getClientRects().length > 0)?.focus();
    });
  };

  const stepProps = {
    activeTab,
    stepState,
    tabIds,
    panelIds,
    disabled: isSaving,
    onSelect: selectTab,
    onKeyDown: onStepKeyDown,
  };

  const saveLabel = isSaving ? "Guardando…" : editing ? "Guardar cambios" : "Crear proyecto";

  return (
    <>
      <Modal
        mobileBottomSheet
        isOpen={open}
        onClose={onClose}
        closeOnBackdropClick={false}
        closeOnEscape={!blockedEscape}
        showCloseButton={false}
        ariaLabelledBy={titleId}
        className={modalShell}
      >
        {/* Encabezado vivo: refleja cliente, status y avance mientras se edita. */}
        <header className="cot-sheen relative shrink-0 overflow-hidden bg-[#17235B] text-white dark:bg-[#1B2A63]">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
          <div className="relative flex items-start gap-3.5 px-5 pb-4 pr-16 pt-5 sm:px-6">
            <span
              className="hidden size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] sm:inline-flex"
              aria-hidden
            >
              <FolderKanban className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  {editing ? `Proyecto ${displayProyectoFolio(folio)}` : "Nuevo proyecto"}
                </p>
                {editing ? <EstadoPill key={status} estado={status} size="sm" className="cot-pop ring-white/20" /> : null}
              </div>
              <h2
                id={titleId}
                className="mt-1 truncate text-[20px] font-semibold leading-tight tracking-[-0.5px] sm:text-[22px]"
                title={cliente}
              >
                {cliente.trim() || (editing ? "Proyecto sin cliente" : "Nuevo proyecto")}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              aria-label="Cerrar ventana"
              className="cot-press absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {editing ? (
            <div className="relative flex items-center gap-3 px-5 pb-4 sm:px-6">
              <ProgressBar
                value={porcentajeAvance}
                barClass="bg-[#E6A23C]"
                className="flex-1 bg-white/10!"
                label="Avance del proyecto"
              />
              <span key={porcentajeAvance} className="cot-flash w-11 text-right text-[13px] font-semibold tabular-nums text-white/85">
                {porcentajeAvance}%
              </span>
            </div>
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-[#F0F0F2] bg-[#FAFAFA] p-3 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 md:flex">
            <ProyectoStepRail {...stepProps} />
            {assignedTechnicianLocked ? (
              <p className="mt-auto rounded-[12px] bg-white px-3 py-2.5 text-[12px] leading-relaxed text-[#6E6E77] ring-1 ring-[#F0F0F2] dark:bg-[#111827] dark:text-[#8EA0B8] dark:ring-[#1F2A3C]">
                Cotizaciones, tipos de trabajo, fecha de autorización y equipo asignado los define la oficina. Tú registras campo, equipos y cierre.
              </p>
            ) : null}
          </aside>

          <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col" noValidate>
            <div className="shrink-0 border-b border-[#F0F0F2] px-3 py-2.5 dark:border-[#1F2A3C] md:hidden">
              <ProyectoStepChips {...stepProps} />
            </div>

            <div
              ref={formScrollRef}
              className="custom-scrollbar erp-modal-form-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#F7F7F8] dark:bg-[#0B1220]"
              data-proyecto-form-scroll
              data-signature-scroll-lock
            >
              <div className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-5 lg:p-6">
                {modalAlert?.show ? (
                  <div role="alert">
                    <Alert
                      variant={modalAlert.variant}
                      title={modalAlert.title}
                      message={modalAlert.message}
                      showLink={false}
                      placement="inline"
                    />
                  </div>
                ) : null}

                <div key={activeTab} id={panelIds[activeTab]} role="tabpanel" aria-labelledby={tabIds[activeTab]} className="space-y-4">
                  <div className="cot-fade hidden items-center gap-3 px-1 pt-1 sm:flex">
                    <span
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white text-[#1B5CFF] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#7EA0FF] dark:ring-[#273244]"
                      aria-hidden
                    >
                      <step.icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B5CFF] dark:text-[#7EA0FF]">
                        Paso {stepIndex + 1} de {PROYECTO_TAB_ORDER.length}
                      </p>
                      <p className="text-[20px] font-semibold leading-tight tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
                        {step.label}
                      </p>
                    </div>
                  </div>

                  {activeTab === "general" ? <ProyectoGeneralTab form={form} isAdmin={isAdmin} /> : null}
                  {activeTab === "planeacion" ? <ProyectoPlaneacionTab form={form} editing={editing} /> : null}
                  {activeTab === "equipos" ? <ProyectoEquiposTab form={form} isAdmin={isAdmin} /> : null}
                  {activeTab === "instalacion" ? <ProyectoInstalacionTab form={form} proyectoId={proyectoId ?? null} /> : null}
                  {activeTab === "campo" ? (
                    <ProyectoCampoTab form={form} isAdmin={isAdmin} editing={editing} initialDraft={initialDraft} />
                  ) : null}
                  {activeTab === "cierre" ? <ProyectoCierreTab form={form} /> : null}
                </div>
              </div>
            </div>

            {/* Celular: rejilla a todo el ancho ([←] [Siguiente] [Guardar]); escritorio: acciones a la derecha. */}
            <footer
              className={`grid shrink-0 gap-2 border-t border-[#F0F0F2] bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-[#1F2A3C] dark:bg-[#111827] sm:flex sm:items-center sm:px-5 sm:pb-3 ${
                !isLast && editing ? "grid-cols-[2.75rem_1fr_1fr]" : "grid-cols-[2.75rem_1fr]"
              }`}
            >
              <button
                type="button"
                disabled={isSaving}
                onClick={isFirst ? onClose : goToPrevTab}
                className={`${btn.secondary} px-0 sm:px-4`}
                aria-label={isFirst ? "Cancelar" : "Paso anterior"}
                title={isFirst ? "Cancelar" : "Paso anterior"}
              >
                {isFirst ? <X aria-hidden /> : <ArrowLeft aria-hidden />}
                <span className="hidden sm:inline">{isFirst ? "Cancelar" : "Anterior"}</span>
              </button>

              <span className="hidden flex-1 text-center text-[12.5px] text-[#71717A] dark:text-[#8EA0B8] lg:block" aria-hidden>
                Paso {stepIndex + 1} de {PROYECTO_TAB_ORDER.length} · {step.label}
              </span>

              {!isLast ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={(e) => {
                    e.preventDefault();
                    goToNextTab(true);
                  }}
                  className={`${editing ? btn.secondary : btn.primary} px-3 sm:ml-auto lg:ml-0`}
                >
                  Siguiente
                  <ArrowRight aria-hidden />
                </button>
              ) : null}
              {editing || isLast ? (
                <button
                  type="button"
                  disabled={!cliente.trim() || isSaving}
                  aria-busy={isSaving || undefined}
                  onClick={() => void saveNow()}
                  className={`${btn.primary} px-3 ${isLast ? "sm:ml-auto lg:ml-0" : ""}`}
                >
                  {isSaving ? <AppSpinner /> : <Check aria-hidden />}
                  <span className="sm:hidden">{isSaving ? "Guardando…" : editing ? "Guardar" : "Crear"}</span>
                  <span className="hidden sm:inline">{saveLabel}</span>
                </button>
              ) : null}
            </footer>
          </form>
        </div>
      </Modal>

      <ProyectoCotizacionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        pickerTarget={form.pickerTarget}
        pickerTab={form.pickerTab}
        setPickerTab={form.setPickerTab}
        pickerSearch={form.pickerSearch}
        setPickerSearch={form.setPickerSearch}
        setPickerResults={form.setPickerResults}
        setPickerError={form.setPickerError}
        pickerLoading={form.pickerLoading}
        pickerError={form.pickerError}
        cotizacionesFiltradas={form.cotizacionesFiltradas}
        pickerLoadingId={form.pickerLoadingId}
        onSelect={form.handleCargarCotizacion}
      />

      <AppConfirmDialog
        open={confirmClearCotizaciones}
        onClose={() => setConfirmClearCotizaciones(false)}
        onConfirm={form.handleLimpiarPresupuesto}
        tone="danger"
        icon={<Trash2 className="size-5" />}
        title="Quitar todas las cotizaciones"
        description="Se quitarán del proyecto junto con su presupuesto y el seguimiento de equipos."
        detail={
          <AppModalContext
            rows={[
              {
                label: "Cotizaciones vinculadas",
                value: cotizaciones.length.toLocaleString("es-MX"),
                strong: true,
              },
            ]}
          />
        }
        confirmLabel="Sí, quitar todas"
        className={fontSans}
      />

      <ProyectoSyscomModeloPicker
        open={Boolean(equipoParaModeloPicker)}
        equipoLabel={equipoParaModeloPicker?.modelo ?? ""}
        modeloActual={equipoParaModeloPicker?.modelo ?? ""}
        fuentePreferida={equipoParaModeloPicker?.fuenteProducto}
        onClose={() => setModeloPickerLineaId(null)}
        onSelect={form.handleSelectModeloSyscom}
      />
    </>
  );
}
