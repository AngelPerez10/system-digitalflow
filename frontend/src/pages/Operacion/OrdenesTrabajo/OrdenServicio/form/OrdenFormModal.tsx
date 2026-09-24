import { useEffect, type KeyboardEvent, type MutableRefObject, type ReactNode, type RefObject } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ClipboardList,
  Loader2,
  Package,
  Star,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { appModalBtn } from "@/components/ui/modal-kit/modalKitStyles";
import "@/components/ui/modal-kit/motion.css";

import { erpModalSansStyle, erpModalShellClass } from "../../ordenTrabajoStyles";
import type { OrdenFormTab } from "./useOrdenFormModalState";

export const ORDEN_FORM_TAB_IDS = {
  cliente: "orden-form-tab-cliente",
  orden: "orden-form-tab-orden",
  asignacion: "orden-form-tab-asignacion",
  equipos: "orden-form-tab-equipos",
  evidencia: "orden-form-tab-evidencia",
  calificacion: "orden-form-tab-calificacion",
} as const;

export const ORDEN_FORM_PANEL_IDS = {
  cliente: "orden-form-panel-cliente",
  orden: "orden-form-panel-orden",
  asignacion: "orden-form-panel-asignacion",
  equipos: "orden-form-panel-equipos",
  evidencia: "orden-form-panel-evidencia",
  calificacion: "orden-form-panel-calificacion",
} as const;

/** Pasos del asistente, en el orden en que se captura una orden real. */
const TAB_ORDER: OrdenFormTab[] = ["cliente", "orden", "asignacion", "equipos", "evidencia"];

const STEP_META: Record<OrdenFormTab, { label: string; hint: string; description: string }> = {
  cliente: {
    label: "Cliente",
    hint: "Quién y dónde",
    description: "Selecciona al cliente y confirma cómo contactarlo y dónde es el servicio.",
  },
  orden: {
    label: "Servicio",
    hint: "Problema y trabajo",
    description: "Describe lo que reportó el cliente y lo que se hizo en campo.",
  },
  asignacion: {
    label: "Asignación",
    hint: "Técnico, status y agenda",
    description: "Quién atiende la orden, en qué estado va, su prioridad y horarios.",
  },
  equipos: {
    label: "Equipos",
    hint: "Piezas del inventario",
    description: "Agrega las piezas entregadas o instaladas desde el inventario.",
  },
  evidencia: {
    label: "Evidencia y cierre",
    hint: "Fotos, firmas y seguimiento",
    description: "Sube las fotos del trabajo y recaba las firmas de conformidad.",
  },
  calificacion: {
    label: "Calificación",
    hint: "Opinión del cliente",
    description: "Calificación y comentario que dejó el cliente (solo lectura).",
  },
};

const STEP_ICON: Record<OrdenFormTab, typeof UserRound> = {
  cliente: UserRound,
  orden: Wrench,
  asignacion: Users,
  equipos: Package,
  evidencia: Camera,
  calificacion: Star,
};

export type OrdenFormModalAlert = {
  show: boolean;
  variant: "error" | "warning" | "success" | "info";
  title: string;
  message: string;
};

export type OrdenFormModalSummary = {
  cliente?: string;
  tecnico?: string;
  prioridad?: string;
};

export type OrdenFormModalProps = {
  variant: "admin" | "tecnico";
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape: boolean;
  editingOrden: { id?: number } | null;
  tipoOrdenLabel: string;
  isLimitedEdit: boolean;
  formScrollRef: RefObject<HTMLFormElement | null>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  activeTabRef: MutableRefObject<OrdenFormTab>;
  goToOrdenTab: (fromFooter?: boolean) => void;
  activeTab: OrdenFormTab;
  setActiveTab: (tab: OrdenFormTab) => void;
  modalAlert: OrdenFormModalAlert;
  isSaving: boolean;
  uploadingPhotos?: boolean;
  /** Al editar: el cuerpo muestra un esqueleto mientras se carga el detalle completo. */
  bodyLoading?: boolean;
  triggerSaveFromFooter: () => void;
  canOrdenesEdit?: boolean;
  canOrdenesCreate?: boolean;
  /** Pestaña extra (solo admin) con la calificación y comentario del cliente. */
  showCalificacionTab?: boolean;
  /** Resumen en vivo en la barra lateral (escritorio). */
  summary?: OrdenFormModalSummary;
  /**
   * Orden ya cerrada (resuelta / cancelada / admin cerrado):
   * todos los pasos del stepper salen palomeados.
   */
  ordenCompletada?: boolean;
  children: ReactNode;
};

export default function OrdenFormModal({
  variant,
  isOpen,
  onClose,
  closeOnEscape,
  editingOrden,
  tipoOrdenLabel,
  isLimitedEdit,
  formScrollRef,
  onSubmit,
  activeTabRef,
  goToOrdenTab,
  activeTab,
  setActiveTab,
  modalAlert,
  isSaving,
  uploadingPhotos = false,
  bodyLoading = false,
  triggerSaveFromFooter,
  canOrdenesEdit = true,
  canOrdenesCreate = true,
  showCalificacionTab = false,
  summary,
  ordenCompletada = false,
  children,
}: OrdenFormModalProps) {
  const saveBusy = isSaving || uploadingPhotos;
  const isStepperTab = TAB_ORDER.includes(activeTab);
  const stepIndex = Math.max(0, TAB_ORDER.indexOf(activeTab));
  const isLastStep = stepIndex === TAB_ORDER.length - 1;
  const canSave = !(variant === "tecnico" && !(editingOrden ? canOrdenesEdit : canOrdenesCreate));
  // Orden de foco por teclado: incluye la pestaña de calificación cuando aplica.
  const navTabs: OrdenFormTab[] = showCalificacionTab ? [...TAB_ORDER, "calificacion"] : TAB_ORDER;
  const meta = STEP_META[activeTab];

  // En la fila horizontal (celular) el paso activo puede quedar fuera de vista: lo centra.
  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(ORDEN_FORM_TAB_IDS[activeTab])?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeTab, isOpen]);
  const StepIcon = STEP_ICON[activeTab];

  /** Cambia de paso y devuelve el foco al panel para que lectores de pantalla y teclado sigan el flujo. */
  const switchTab = (next: OrdenFormTab, fromFooter?: boolean) => {
    const apply = () => {
      setActiveTab(next);
      activeTabRef.current = next;
      requestAnimationFrame(() => {
        formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        document.getElementById(ORDEN_FORM_PANEL_IDS[next])?.focus({ preventScroll: true });
      });
    };
    if (fromFooter) window.setTimeout(apply, 0);
    else apply();
  };

  const goNext = () => {
    // Desde «Cliente» decide la página (misma lógica de siempre: `goToOrdenTab`).
    if (activeTab === "cliente") {
      goToOrdenTab(true);
      return;
    }
    const next = TAB_ORDER[stepIndex + 1];
    if (next) switchTab(next, true);
  };

  const goBack = () => {
    const prev = TAB_ORDER[stepIndex - 1];
    if (prev) switchTab(prev);
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: OrdenFormTab) => {
    const idx = navTabs.indexOf(current);
    if (idx < 0) return;

    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIdx = (idx + 1) % navTabs.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIdx = (idx - 1 + navTabs.length) % navTabs.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = navTabs.length - 1;
    } else {
      return;
    }

    const next = navTabs[nextIdx];
    setActiveTab(next);
    activeTabRef.current = next;
    requestAnimationFrame(() => {
      document.getElementById(ORDEN_FORM_TAB_IDS[next])?.focus();
    });
  };

  const tabButtonProps = (tab: OrdenFormTab) => ({
    type: "button" as const,
    id: ORDEN_FORM_TAB_IDS[tab],
    role: "tab" as const,
    tabIndex: activeTab === tab ? 0 : -1,
    "aria-selected": activeTab === tab,
    "aria-controls": ORDEN_FORM_PANEL_IDS[tab],
    onClick: () => switchTab(tab),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => handleTabKeyDown(e, tab),
  });

  const saveLabel = isSaving
    ? "Guardando…"
    : uploadingPhotos
      ? "Subiendo fotos…"
      : editingOrden
        ? "Guardar cambios"
        : "Crear orden";

  const saveButton = (
    <button type="button" disabled={saveBusy} onClick={triggerSaveFromFooter} className={appModalBtn.primary}>
      {saveBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
      {saveLabel}
    </button>
  );

  const nextButton = (primary: boolean) => (
    <button
      type="button"
      disabled={isSaving}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        goNext();
      }}
      className={primary ? appModalBtn.primary : appModalBtn.secondary}
    >
      Siguiente
      <ArrowRight className="size-4" aria-hidden />
    </button>
  );

  /**
   * Acciones del pie:
   * - Nueva orden: «Siguiente» hasta el último paso, ahí «Crear orden».
   * - Edición: «Guardar cambios» disponible desde el paso 2 (desde «Cliente» la
   *   página valida y avanza primero), además de «Siguiente» para recorrer.
   */
  const primaryActions =
    bodyLoading || !isStepperTab ? null : isLastStep ? (
      canSave ? saveButton : null
    ) : editingOrden && activeTab !== "cliente" && canSave ? (
      <>
        <span className="hidden sm:contents">{nextButton(false)}</span>
        {saveButton}
      </>
    ) : (
      nextButton(true)
    );

  const title = editingOrden ? "Editar orden" : "Nueva orden";
  const hasSummary = !!summary && !!(summary.cliente || summary.tecnico || summary.prioridad);

  return (
    <Modal
      mobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={false}
      closeOnEscape={closeOnEscape}
      showCloseButton={false}
      ariaLabel={`${editingOrden ? "Editar" : "Nueva"} orden de ${tipoOrdenLabel}`}
      className={`${erpModalShellClass} rounded-t-2xl! bg-white! dark:bg-[#111827]! sm:w-[min(96vw,72rem)]! sm:max-w-6xl! sm:rounded-2xl! lg:h-[min(90vh,880px)]`}
    >
      <div
        className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden lg:flex-row"
        style={erpModalSansStyle}
      >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar ventana"
        className="absolute right-3 top-3 z-20 inline-flex size-10 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#64748B] dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA] lg:right-5 lg:top-5"
      >
        <X className="size-5" aria-hidden />
      </button>
        {/* ============================ Barra lateral ============================ */}
        <aside className="custom-scrollbar flex shrink-0 flex-col border-b border-[#F0F0F2] bg-[#FAFAFA] dark:border-[#1F2A3C] dark:bg-[#0B1220] lg:w-[280px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-5 pb-3 pr-16 pt-5 lg:block lg:px-6 lg:pb-5 lg:pr-6 lg:pt-6">
            <span
              className="cot-tick inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#17235B] text-[#E6A23C] dark:bg-[#1B2A63] lg:size-11"
              aria-hidden
            >
              <ClipboardList className="size-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 lg:mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">
                Orden de {tipoOrdenLabel}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-semibold leading-tight tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC] lg:text-[20px]">
                  {title}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    editingOrden
                      ? "bg-[#FFF8EB] text-[#8A5A10] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F0C675]"
                      : "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
                  }`}
                >
                  {editingOrden ? "Edición" : "Nueva"}
                </span>
              </div>
            </div>
          </div>

          {!bodyLoading && (
            <nav aria-label="Pasos del formulario" className="shrink-0">
              <div
                role="tablist"
                aria-label="Secciones del formulario"
                className="flex gap-1 overflow-x-auto px-3 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
              >
                {TAB_ORDER.map((tab, i) => {
                  const active = activeTab === tab;
                  // Progreso de navegación O orden ya cerrada → paloma en todos los pasos.
                  const done = ordenCompletada || (isStepperTab && i < stepIndex);
                  const { label, hint } = STEP_META[tab];
                  return (
                    <button
                      key={tab}
                      {...tabButtonProps(tab)}
                      aria-label={done ? `${label}, completado` : undefined}
                      className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 lg:w-full ${
                        active
                          ? "bg-white shadow-[0_1px_3px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:ring-[#273244]"
                          : "hover:bg-white/70 dark:hover:bg-[#111827]/60"
                      }`}
                    >
                      <span
                        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-300 ${
                          active
                            ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
                            : done
                              ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                              : "bg-white text-[#71717A] ring-1 ring-inset ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#8EA0B8] dark:ring-[#273244]"
                        }`}
                        aria-hidden
                      >
                        {done ? <Check className="cot-tick size-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="min-w-0 pr-1">
                        <span
                          className={`block whitespace-nowrap text-[14px] ${
                            active
                              ? "font-semibold text-[#09090B] dark:text-[#F8FAFC]"
                              : "font-medium text-[#3F3F46] dark:text-[#D6DEEA]"
                          }`}
                        >
                          {label}
                        </span>
                        <span className="hidden text-[12px] text-[#71717A] dark:text-[#8EA0B8] lg:block">{hint}</span>
                      </span>
                    </button>
                  );
                })}

                {showCalificacionTab && (
                  <>
                    <span
                      className="mx-1 w-px shrink-0 self-stretch bg-[#E4E4E7] dark:bg-[#273244] lg:mx-3 lg:my-2 lg:h-px lg:w-auto"
                      aria-hidden
                    />
                    <button
                      {...tabButtonProps("calificacion")}
                      className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 lg:w-full ${
                        activeTab === "calificacion"
                          ? "bg-white shadow-[0_1px_3px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:ring-[#273244]"
                          : "hover:bg-white/70 dark:hover:bg-[#111827]/60"
                      }`}
                    >
                      <span
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFF8EB] text-[#9A6B15] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#E6A23C]"
                        aria-hidden
                      >
                        <Star className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block whitespace-nowrap text-[14px] font-medium text-[#3F3F46] dark:text-[#D6DEEA]">
                          Calificación
                        </span>
                        <span className="hidden text-[12px] text-[#71717A] dark:text-[#8EA0B8] lg:block">
                          Opinión del cliente
                        </span>
                      </span>
                    </button>
                  </>
                )}
              </div>
            </nav>
          )}

          {hasSummary && !bodyLoading && (
            <dl className="mt-auto hidden shrink-0 space-y-3 border-t border-[#F0F0F2] px-6 py-5 dark:border-[#1F2A3C] lg:mt-6 lg:block">
              {[
                { label: "Cliente", value: summary?.cliente },
                { label: "Técnico", value: summary?.tecnico },
                { label: "Prioridad", value: summary?.prioridad },
              ].map((r) => (
                <div key={r.label}>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A1A1AA] dark:text-[#64748B]">
                    {r.label}
                  </dt>
                  <dd
                    className={`mt-0.5 truncate text-[13px] ${
                      r.value ? "font-medium text-[#27272A] dark:text-[#E5E7EB]" : "text-[#A1A1AA] dark:text-[#64748B]"
                    }`}
                    title={r.value || undefined}
                  >
                    {r.value || "Sin definir"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </aside>

        {/* ============================ Contenido del paso ============================ */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="relative shrink-0 border-b border-[#F0F0F2] dark:border-[#1F2A3C] lg:px-8 lg:py-5 lg:pr-16">
            {!bodyLoading && (
              <div key={activeTab} className="cot-fade hidden items-start gap-3.5 lg:flex">
                <span
                  className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
                  aria-hidden
                >
                  <StepIcon className="size-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#1B5CFF] dark:text-[#7FA2FF]">
                    {isStepperTab ? `Paso ${stepIndex + 1} de ${TAB_ORDER.length}` : "Solo lectura"}
                  </p>
                  <h3 className="text-[20px] font-semibold tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
                    {meta.label}
                  </h3>
                  <p className="mt-0.5 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">{meta.description}</p>
                </div>
              </div>
            )}
            {isStepperTab && !bodyLoading && (
              <div className="h-0.5 lg:absolute lg:inset-x-0 lg:bottom-0" aria-hidden>
                <div
                  className="cot-bar h-full w-full bg-[#1B5CFF] dark:bg-[#4B7CFF]"
                  style={{ transform: `scaleX(${(stepIndex + 1) / TAB_ORDER.length})` }}
                />
              </div>
            )}
          </header>

          <form
            ref={formScrollRef}
            onSubmit={onSubmit}
            noValidate
            className="erp-modal-form-scroll custom-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-[#F7F7F8] touch-pan-y dark:bg-[#0F172A]/60 sm:touch-auto"
          >
            <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:px-8 sm:py-7">
              {bodyLoading ? (
                <div
                  className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-10 text-center"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-7 animate-spin text-[#1B5CFF] dark:text-[#4B7CFF]" aria-hidden />
                  <p className="text-[15px] font-medium text-[#27272A] dark:text-[#E5E7EB]">Cargando la orden…</p>
                  <p className="max-w-xs text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                    Estamos trayendo firma, fotos y equipos. Si tarda demasiado, cierra y vuelve a intentarlo.
                  </p>
                </div>
              ) : (
                <div key={activeTab} className="cot-fade space-y-5">
                  {isLimitedEdit && (
                    <div className="rounded-xl border border-[#F0D7A3] bg-[#FFF8EB] px-4 py-3 text-[13px] leading-relaxed text-[#8A5A10] dark:border-[rgba(230,162,60,0.3)] dark:bg-[rgba(230,162,60,0.10)] dark:text-[#F0C675]">
                      <span className="font-semibold">Edición limitada.</span> En órdenes de otros técnicos solo puedes
                      actualizar problemática, estado, tiempos y fotos.
                    </div>
                  )}
                  {modalAlert.show && (
                    <div role="alert">
                      <Alert
                        variant={modalAlert.variant}
                        title={modalAlert.title}
                        message={modalAlert.message}
                        showLink={false}
                        placement="inline"
                      />
                    </div>
                  )}
                  {children}
                </div>
              )}
            </div>
          </form>

          {/* ============================ Pie ============================ */}
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#F0F0F2] bg-white px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] dark:border-[#1F2A3C] dark:bg-[#111827] sm:px-8 sm:pb-3.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-[14px] font-medium text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#8EA0B8] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]"
            >
              {bodyLoading || !isStepperTab ? "Cerrar" : "Cancelar"}
            </button>
            <div className="flex items-center gap-2">
              {!bodyLoading && isStepperTab && stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={saveBusy}
                  aria-label="Paso anterior"
                  className={`${appModalBtn.secondary} px-4!`}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Atrás</span>
                </button>
              )}
              {primaryActions}
            </div>
          </footer>
        </div>
      </div>
    </Modal>
  );
}
