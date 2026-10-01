import type { KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import { REPORTE_STEPS, type ReporteStepId, type ReporteStepState } from "./reporteSteps";

type Props = {
  active: ReporteStepId;
  state: Record<ReporteStepId, ReporteStepState>;
  /** Texto de apoyo por paso (p. ej. «2 zonas · 8 fotos»). */
  hints: Record<ReporteStepId, string>;
  disabled: boolean;
  onSelect: (id: ReporteStepId) => void;
  idPrefix: string;
};

function StepMarker({ index, done, active }: { index: number; done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0E8A5F] text-white dark:bg-[#22A06B]">
        <Check key="done" className="cot-tick size-3.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-200 ${
        active ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]" : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#1B2539] dark:text-[#8EA0B8]"
      }`}
    >
      {index + 1}
    </span>
  );
}

function useStepKeys(active: ReporteStepId, onSelect: (id: ReporteStepId) => void, idPrefix: string) {
  return (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = REPORTE_STEPS.length - 1;
    const idx = REPORTE_STEPS.findIndex((s) => s.id === active);
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight" ? (idx === last ? 0 : idx + 1) : e.key === "ArrowUp" || e.key === "ArrowLeft" ? (idx === 0 ? last : idx - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next == null) return;
    e.preventDefault();
    const id = REPORTE_STEPS[next].id;
    onSelect(id);
    requestAnimationFrame(() => {
      [document.getElementById(`${idPrefix}-tab-${id}`), document.getElementById(`${idPrefix}-tab-${id}-m`)].find((el) => el && el.getClientRects().length > 0)?.focus();
    });
  };
}

/** Riel vertical de pasos (escritorio) — mismo patrón que el modal de Proyectos. */
export function ReporteStepRail({ active, state, hints, disabled, onSelect, idPrefix }: Props) {
  const onKeyDown = useStepKeys(active, onSelect, idPrefix);
  return (
    <div role="tablist" aria-orientation="vertical" aria-label="Secciones del reporte" className="flex flex-col gap-1">
      {REPORTE_STEPS.map((step, index) => {
        const isActive = active === step.id;
        return (
          <button
            key={step.id}
            type="button"
            id={`${idPrefix}-tab-${step.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => onSelect(step.id)}
            onKeyDown={onKeyDown}
            className={`cot-press group relative flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left disabled:cursor-not-allowed ${focusRing} ${
              isActive ? "bg-white shadow-[0_1px_2px_rgba(9,9,11,0.06)] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:ring-[#273244]" : "hover:bg-white/60 dark:hover:bg-white/3"
            }`}
          >
            <StepMarker index={index} done={state[step.id] === "done"} active={isActive} />
            <span className="min-w-0 flex-1">
              <span className={`block text-[14px] font-semibold tracking-[-0.1px] ${isActive ? "text-[#09090B] dark:text-[#F8FAFC]" : "text-[#3F3F46] dark:text-[#D6DEEA]"}`}>{step.label}</span>
              <span className="block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{hints[step.id]}</span>
            </span>
            <span className="sr-only">{state[step.id] === "done" ? " (completo)" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Pasos en fila deslizable (móvil / tablet). */
export function ReporteStepChips({ active, state, disabled, onSelect, idPrefix }: Omit<Props, "hints">) {
  const onKeyDown = useStepKeys(active, onSelect, idPrefix);
  return (
    <div role="tablist" aria-label="Secciones del reporte" className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {REPORTE_STEPS.map((step, index) => {
        const isActive = active === step.id;
        return (
          <button
            key={step.id}
            type="button"
            id={`${idPrefix}-tab-${step.id}-m`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => onSelect(step.id)}
            onKeyDown={onKeyDown}
            className={`cot-press inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-[13px] font-semibold ${focusRing} ${
              isActive ? "border-[#BFD3FF] bg-[#EEF3FF] text-[#1244D1] dark:border-[#2C3F7A] dark:bg-[#1B2A63] dark:text-[#C9D7FF]" : "border-[#E4E4E7] bg-white text-[#3F3F46] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#D6DEEA]"
            }`}
          >
            <span className="scale-[0.86]">
              <StepMarker index={index} done={state[step.id] === "done"} active={isActive} />
            </span>
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
