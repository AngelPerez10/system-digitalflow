/**
 * Contenedor de los asistentes de Mantenimiento (póliza y reporte), con el
 * mismo diseño que el modal de Órdenes de trabajo:
 *
 * - Barra lateral clara: mosaico con ícono, tipo, título con insignia
 *   «Nueva / Edición», pasos verticales (fila deslizable en celular) y un
 *   resumen en vivo con la barra de datos requeridos.
 * - Encabezado del paso: ícono, «Paso X de N», título y descripción, con una
 *   barra fina de avance.
 * - Cuerpo gris con el panel del paso y pie con «Cancelar» a la izquierda y
 *   «Atrás / Siguiente / Guardar» a la derecha.
 *
 * Movimiento (mantenimientoForm.css + modal-kit/motion.css): el panel entra
 * desde el lado hacia donde se avanza, el encabezado se desvanece hacia arriba,
 * los marcadores cambian de color y la palomita aparece con un pequeño rebote.
 * Solo transform/opacity; todo se apaga con prefers-reduced-motion.
 *
 * Los paneles quedan montados (los inactivos con `hidden`) para no perder lo
 * capturado al moverse entre pasos.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { appModalBtn } from "@/components/ui/modal-kit/modalKitStyles";
import "@/components/ui/modal-kit/motion.css";
import { erpModalSansStyle, erpModalShellClass } from "../../OrdenesTrabajo/ordenTrabajoStyles";
import "./mantenimientoForm.css";

export type MantenimientoFormStep<T extends string | number> = {
  id: T;
  label: string;
  hint: string;
  description: string;
  icon: LucideIcon;
};

type Props<T extends string | number> = {
  open: boolean;
  onClose: () => void;
  /** Guardando: no se cierra con Esc y los botones se desactivan. */
  busy: boolean;
  /** Bloquea Esc (p. ej. hay otro diálogo encima). */
  escapeBlocked?: boolean;
  ariaLabel: string;
  /** Ícono de la barra lateral (mosaico marino con ícono dorado). */
  icon: LucideIcon;
  /** «Póliza de mantenimiento», «Reporte de mantenimiento»… */
  kicker: string;
  /** «Nueva póliza», «Editar reporte»… */
  title: string;
  editing: boolean;
  /** Insignia de alta: «Nueva» (póliza) o «Nuevo» (reporte). */
  newBadge?: string;
  /** Folio (o vista previa) junto a la insignia. */
  folio?: string;
  /** Nota junto al folio (p. ej. «se asigna al guardar»). */
  folioNote?: string;
  steps: MantenimientoFormStep<T>[];
  active: T;
  onActiveChange: (id: T) => void;
  /** Pasos con sus datos requeridos completos (palomita verde). */
  done: Record<T, boolean>;
  /** Resumen en vivo (escritorio). */
  summary: { label: string; value?: string }[];
  /** Contenido de la barra lateral debajo del resumen (p. ej. «Ver PDF»). */
  asideFooter?: ReactNode;
  /** Mensaje sobre el panel (errores del servidor, avisos). */
  alert?: ReactNode;
  loading?: boolean;
  loadingText?: string;
  panels: Record<T, ReactNode>;
  onSubmit: () => void;
  saveLabel: { idle: string; busy: string };
  canSave?: boolean;
};

export default function MantenimientoFormShell<T extends string | number>({
  open,
  onClose,
  busy,
  escapeBlocked = false,
  ariaLabel,
  icon: Icon,
  kicker,
  title,
  editing,
  newBadge = "Nueva",
  folio,
  folioNote,
  steps,
  active,
  onActiveChange,
  done,
  summary,
  asideFooter,
  alert,
  loading = false,
  loadingText = "Cargando…",
  panels,
  onSubmit,
  saveLabel,
  canSave = true,
}: Props<T>) {
  const uid = useId().replace(/:/g, "");
  const tabId = (id: T) => `mf-${uid}-tab-${String(id)}`;
  const panelId = (id: T) => `mf-${uid}-panel-${String(id)}`;
  const formId = `mf-${uid}-form`;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const index = Math.max(0, steps.findIndex((s) => s.id === active));
  // Dirección del último cambio de paso (también cuando lo cambia el formulario,
  // p. ej. al saltar al paso con error): el panel entra desde ese lado.
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [lastIndex, setLastIndex] = useState(index);
  if (index !== lastIndex) {
    setLastIndex(index);
    setDir(index > lastIndex ? "next" : "prev");
  }
  const step = steps[index];
  const StepIcon = step.icon;
  const isLast = index === steps.length - 1;
  const doneCount = steps.filter((s) => done[s.id]).length;

  const goTo = (next: T) => {
    const ni = steps.findIndex((s) => s.id === next);
    if (ni < 0 || ni === index) return;
    onActiveChange(next);
  };

  // Al cambiar de paso: arriba del panel y el paso activo visible en la fila de celular.
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0 });
    document.getElementById(tabId(active))?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = steps.length - 1;
    const ni =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (index + 1) % steps.length
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? (index - 1 + steps.length) % steps.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (ni == null) return;
    e.preventDefault();
    goTo(steps[ni].id);
    requestAnimationFrame(() => document.getElementById(tabId(steps[ni].id))?.focus());
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  const saveButton = canSave ? (
    <button type="submit" form={formId} disabled={busy || loading} aria-busy={busy || undefined} className={`${appModalBtn.primary} whitespace-nowrap`}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
      {busy ? saveLabel.busy : saveLabel.idle}
    </button>
  ) : null;
  const nextButton = (primary: boolean) => (
    <button type="button" disabled={busy} onClick={() => goTo(steps[index + 1].id)} className={primary ? appModalBtn.primary : appModalBtn.secondary}>
      Siguiente
      <ArrowRight className="size-4" aria-hidden />
    </button>
  );
  // Nuevo: «Siguiente» hasta el último paso. Edición: «Guardar» siempre disponible.
  const primaryActions = loading ? null : isLast ? (
    saveButton
  ) : editing ? (
    <>
      <span className="hidden sm:contents">{nextButton(false)}</span>
      {saveButton}
    </>
  ) : (
    nextButton(true)
  );

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={() => !busy && onClose()}
      closeOnBackdropClick={false}
      closeOnEscape={!busy && !escapeBlocked}
      showCloseButton={false}
      ariaLabel={ariaLabel}
      className={`${erpModalShellClass} rounded-t-2xl! bg-white! dark:bg-[#111827]! sm:w-[min(96vw,72rem)]! sm:max-w-6xl! sm:rounded-2xl! lg:h-[min(90vh,880px)]`}
    >
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden lg:flex-row" style={erpModalSansStyle}>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar ventana"
          className="absolute right-3 top-3 z-20 inline-flex size-10 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:opacity-40 dark:text-[#64748B] dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA] lg:right-5 lg:top-5"
        >
          <X className="size-5" aria-hidden />
        </button>

        {/* ============================ Barra lateral ============================ */}
        <aside className="custom-scrollbar flex shrink-0 flex-col border-b border-[#F0F0F2] bg-[#FAFAFA] dark:border-[#1F2A3C] dark:bg-[#0B1220] lg:w-70 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-5 pb-3 pr-16 pt-5 lg:block lg:px-6 lg:pb-5 lg:pr-6 lg:pt-6">
            <span className="cot-tick inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#17235B] text-[#E6A23C] dark:bg-[#1B2A63] lg:size-11" aria-hidden>
              <Icon className="size-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 lg:mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">{kicker}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-semibold leading-tight tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC] lg:text-[20px]">
                  {title}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    editing
                      ? "bg-[#FFF8EB] text-[#8A5A10] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F0C675]"
                      : "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
                  }`}
                >
                  {editing ? "Edición" : newBadge}
                </span>
              </div>
              {folio ? (
                <p className="mt-1 hidden text-[12px] text-[#71717A] dark:text-[#8EA0B8] lg:block">
                  <span className="font-mono font-semibold text-[#3F3F46] dark:text-[#CBD5E1]">{folio}</span>
                  {folioNote ? <span> · {folioNote}</span> : null}
                </p>
              ) : null}
            </div>
          </div>

          {!loading ? (
            <nav aria-label="Pasos del formulario" className="shrink-0">
              <div
                role="tablist"
                aria-label="Secciones del formulario"
                className="flex gap-1 overflow-x-auto px-3 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
              >
                {steps.map((s, i) => {
                  const isActive = s.id === active;
                  const isDone = done[s.id];
                  return (
                    <button
                      key={String(s.id)}
                      type="button"
                      id={tabId(s.id)}
                      role="tab"
                      tabIndex={isActive ? 0 : -1}
                      aria-selected={isActive}
                      aria-controls={panelId(s.id)}
                      aria-label={isDone ? `${s.label}, completo` : undefined}
                      disabled={busy}
                      onClick={() => goTo(s.id)}
                      onKeyDown={onTabKey}
                      className={`mf-step flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:cursor-not-allowed lg:w-full ${
                        isActive
                          ? "bg-white shadow-[0_1px_3px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:ring-[#273244]"
                          : "hover:bg-white/70 dark:hover:bg-[#111827]/60"
                      }`}
                    >
                      <span
                        className={`mf-marker inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums ${
                          isActive
                            ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
                            : isDone
                              ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                              : "bg-white text-[#71717A] ring-1 ring-inset ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#8EA0B8] dark:ring-[#273244]"
                        }`}
                        aria-hidden
                      >
                        {isDone && !isActive ? <Check key="ok" className="cot-tick size-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="min-w-0 pr-1">
                        <span
                          className={`block whitespace-nowrap text-[14px] ${
                            isActive ? "font-semibold text-[#09090B] dark:text-[#F8FAFC]" : "font-medium text-[#3F3F46] dark:text-[#D6DEEA]"
                          }`}
                        >
                          {s.label}
                        </span>
                        <span className="hidden max-w-44 truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8] lg:block">{s.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          ) : null}

          {!loading ? (
            <div className="mt-auto hidden shrink-0 border-t border-[#F0F0F2] px-6 py-5 dark:border-[#1F2A3C] lg:mt-6 lg:block">
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-[#A1A1AA] dark:text-[#64748B]">
                  <span>Datos requeridos</span>
                  <span key={doneCount} className="cot-flash tabular-nums text-[#3F3F46] dark:text-[#D6DEEA]">
                    {doneCount}/{steps.length}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ECECEF] dark:bg-[#1F2A3C]" aria-hidden>
                  <div
                    className={`cot-bar h-full w-full rounded-full ${doneCount === steps.length ? "bg-[#04724D] dark:bg-[#22A06B]" : "bg-[#1B5CFF] dark:bg-[#4B7CFF]"}`}
                    style={{ transform: `scaleX(${doneCount / steps.length})` }}
                  />
                </div>
              </div>
              <dl className="space-y-3">
                {summary.map((r) => (
                  <div key={r.label}>
                    <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A1A1AA] dark:text-[#64748B]">{r.label}</dt>
                    <dd
                      key={r.value || "-"}
                      className={`cot-fade mt-0.5 truncate text-[13px] ${r.value ? "font-medium text-[#27272A] dark:text-[#E5E7EB]" : "text-[#A1A1AA] dark:text-[#64748B]"}`}
                      title={r.value || undefined}
                    >
                      {r.value || "Sin definir"}
                    </dd>
                  </div>
                ))}
              </dl>
              {asideFooter ? <div className="mt-5">{asideFooter}</div> : null}
            </div>
          ) : null}
        </aside>

        {/* ============================ Contenido del paso ============================ */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="relative shrink-0 border-b border-[#F0F0F2] dark:border-[#1F2A3C] lg:px-8 lg:py-5 lg:pr-16">
            {!loading ? (
              <div key={String(active)} className="mf-head hidden items-start gap-3.5 lg:flex">
                <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]" aria-hidden>
                  <StepIcon className="size-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#1B5CFF] dark:text-[#7FA2FF]">
                    Paso {index + 1} de {steps.length}
                  </p>
                  <h3 className="text-[20px] font-semibold tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">{step.label}</h3>
                  <p className="mt-0.5 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">{step.description}</p>
                </div>
              </div>
            ) : null}
            {!loading ? (
              <div className="h-0.5 lg:absolute lg:inset-x-0 lg:bottom-0" aria-hidden>
                <div className="cot-bar h-full w-full bg-[#1B5CFF] dark:bg-[#4B7CFF]" style={{ transform: `scaleX(${(index + 1) / steps.length})` }} />
              </div>
            ) : null}
          </header>

          <form id={formId} onSubmit={submit} noValidate className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              ref={scrollRef}
              className="erp-modal-form-scroll custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#F7F7F8] touch-pan-y dark:bg-[#0F172A]/60 sm:touch-auto"
            >
              <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:px-8 sm:py-7">
                {loading ? (
                  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-10 text-center" role="status" aria-live="polite">
                    <Loader2 className="size-7 animate-spin text-[#1B5CFF] dark:text-[#4B7CFF]" aria-hidden />
                    <p className="text-[15px] font-medium text-[#27272A] dark:text-[#E5E7EB]">{loadingText}</p>
                  </div>
                ) : (
                  <>
                    {alert}
                    <div className="mf-panels" data-dir={dir}>
                      {steps.map((s) => (
                        <div
                          key={String(s.id)}
                          id={panelId(s.id)}
                          role="tabpanel"
                          aria-labelledby={tabId(s.id)}
                          hidden={s.id !== active}
                          className="mf-panel space-y-5"
                        >
                          {panels[s.id]}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ============================ Pie ============================ */}
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#F0F0F2] bg-white px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] dark:border-[#1F2A3C] dark:bg-[#111827] sm:px-8 sm:pb-3.5">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-[14px] font-medium text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:opacity-50 dark:text-[#8EA0B8] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]"
              >
                {loading ? "Cerrar" : "Cancelar"}
              </button>
              <div className="flex items-center gap-2">
                {!loading && index > 0 ? (
                  <button type="button" onClick={() => goTo(steps[index - 1].id)} disabled={busy} aria-label="Paso anterior" className={`${appModalBtn.secondary} px-4!`}>
                    <ArrowLeft className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Atrás</span>
                  </button>
                ) : null}
                {primaryActions}
              </div>
            </footer>
          </form>
        </div>
      </div>
    </Modal>
  );
}
