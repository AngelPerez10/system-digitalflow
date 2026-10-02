/**
 * Navegación por pasos del alta/edición de cliente: riel vertical en
 * escritorio y chips deslizables en celular. Mismo lenguaje que el modal de
 * Proyectos (marcador numerado, palomita al completar, punto rojo con errores).
 *
 * Pestañas WAI-ARIA: flechas, Inicio/Fin; el foco va al botón visible.
 */
import type { KeyboardEvent } from "react";
import { Check } from "lucide-react";
import type { ClienteFormTab } from "../domain/clienteTipos";
import { focusRing } from "../ui/tokens";
import { CLIENTE_STEPS } from "./clienteStepMeta";
import { CLIENTE_STEP_ORDER, type ClienteStepState } from "../domain/clienteSteps";

type Props = {
  activeTab: ClienteFormTab;
  stepState: Record<ClienteFormTab, ClienteStepState>;
  tabId: (tab: ClienteFormTab) => string;
  panelId: (tab: ClienteFormTab) => string;
  disabled: boolean;
  onSelect: (tab: ClienteFormTab) => void;
};

function StepMarker({ index, state, active }: { index: number; state: ClienteStepState; active: boolean }) {
  if (state === "done" && !active) {
    return (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0E8A5F] text-white dark:bg-[#22A06B]">
        <Check key="done" className="cot-tick size-3.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={`relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-200 ${
        active ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]" : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#1B2539] dark:text-[#8EA0B8]"
      }`}
    >
      {index + 1}
      {state === "error" ? (
        <span className="cot-tick absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[#C22B2B] ring-2 ring-white dark:bg-[#F87171] dark:ring-[#111827]" aria-hidden />
      ) : null}
    </span>
  );
}

const stateLabel = (state: ClienteStepState) => (state === "done" ? " (completo)" : state === "error" ? " (tiene errores)" : "");

/** Flechas / Inicio / Fin entre pasos; enfoca el botón visible (riel o chip). */
function useStepKeys({ onSelect, tabId }: Pick<Props, "onSelect" | "tabId">) {
  return (e: KeyboardEvent<HTMLButtonElement>, current: ClienteFormTab) => {
    const idx = CLIENTE_STEP_ORDER.indexOf(current);
    const last = CLIENTE_STEP_ORDER.length - 1;
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
    const next = CLIENTE_STEP_ORDER[map[e.key]];
    onSelect(next);
    requestAnimationFrame(() => {
      const candidates = [document.getElementById(tabId(next)), document.getElementById(`${tabId(next)}-m`)];
      candidates.find((el) => el && el.getClientRects().length > 0)?.focus();
    });
  };
}

/** Riel vertical (escritorio). */
export function ClienteStepRail(props: Props) {
  const { activeTab, stepState, tabId, panelId, disabled, onSelect } = props;
  const onKeyDown = useStepKeys(props);
  return (
    <div role="tablist" aria-orientation="vertical" aria-label="Secciones del registro" className="flex flex-col gap-1">
      {CLIENTE_STEPS.map((step, index) => {
        const active = activeTab === step.id;
        const state = stepState[step.id];
        return (
          <button
            key={step.id}
            type="button"
            id={tabId(step.id)}
            role="tab"
            aria-selected={active}
            aria-controls={panelId(step.id)}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onSelect(step.id)}
            onKeyDown={(e) => onKeyDown(e, step.id)}
            className={`cot-press relative flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left disabled:cursor-not-allowed ${focusRing} ${
              active
                ? "bg-white shadow-[0_1px_2px_rgba(9,9,11,0.06)] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:ring-[#273244]"
                : "hover:bg-white/60 dark:hover:bg-white/[0.03]"
            }`}
          >
            <StepMarker index={index} state={state} active={active} />
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[14px] font-semibold tracking-[-0.1px] ${
                  active ? "text-[#09090B] dark:text-[#F8FAFC]" : "text-[#3F3F46] dark:text-[#D6DEEA]"
                }`}
              >
                {step.label}
              </span>
              <span className="block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{step.hint}</span>
            </span>
            <span className="sr-only">{stateLabel(state)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Chips en fila deslizable (celular / tablet). */
export function ClienteStepChips(props: Props) {
  const { activeTab, stepState, tabId, panelId, disabled, onSelect } = props;
  const onKeyDown = useStepKeys(props);
  return (
    <div
      role="tablist"
      aria-label="Secciones del registro"
      className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {CLIENTE_STEPS.map((step, index) => {
        const active = activeTab === step.id;
        const state = stepState[step.id];
        return (
          <button
            key={step.id}
            type="button"
            id={`${tabId(step.id)}-m`}
            role="tab"
            aria-selected={active}
            aria-controls={panelId(step.id)}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={(e) => {
              onSelect(step.id);
              // Solo desplaza la fila de chips (scrollIntoView movería también el modal).
              const chip = e.currentTarget;
              const rail = chip.parentElement;
              if (rail) {
                const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                const left =
                  rail.scrollLeft + chip.getBoundingClientRect().left - rail.getBoundingClientRect().left - (rail.clientWidth - chip.clientWidth) / 2;
                rail.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
              }
            }}
            onKeyDown={(e) => onKeyDown(e, step.id)}
            className={`cot-press inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-[13px] font-semibold ${focusRing} ${
              active
                ? "border-[#BFD3FF] bg-[#EEF3FF] text-[#1244D1] dark:border-[#2C3F7A] dark:bg-[#1B2A63] dark:text-[#C9D7FF]"
                : "border-[#E4E4E7] bg-white text-[#3F3F46] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#D6DEEA]"
            }`}
          >
            <span className="scale-[0.86]">
              <StepMarker index={index} state={state} active={active} />
            </span>
            {step.label}
            <span className="sr-only">{stateLabel(state)}</span>
          </button>
        );
      })}
    </div>
  );
}
