/**
 * Pie del formulario: navegación entre pasos, estado (fase de guardado,
 * errores, cambios sin guardar) y botón de guardar con su confirmación
 * «¡Guardado!». Al pedir cerrar con cambios, se convierte en la confirmación
 * de descarte.
 */
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Spinner } from "../ui/FormUi";
import { btnPrimary, btnSecondary } from "../ui/tokens";
import { PHASE_LABEL, type SavePhase } from "./clienteFormCopy";

const footerShell =
  "relative shrink-0 border-t border-[#F0F0F2] bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-[#1F2A3C] dark:bg-[#111827] sm:px-5 sm:pb-3";

type Props = {
  confirmDiscard: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;

  phase: SavePhase;
  errorCount: number;
  dirty: boolean;
  step: { index: number; count: number; label: string };
  onPrev: () => void;
  onNext: () => void;
  onCancel: () => void;

  saveDisabled: boolean;
  /** Editando sin cambios: el botón dice «Sin cambios». */
  nothingToSave: boolean;
  saveLabel: string;
  saveShortLabel: string;
  /** id del aviso de error (para `aria-describedby`). */
  errorId?: string;
};

export function ClienteFormFooter(props: Props) {
  const { confirmDiscard, onKeepEditing, onDiscard } = props;

  if (confirmDiscard) {
    return (
      <footer className={`${footerShell} cot-fade flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`} role="alert">
        <p className="text-[13.5px] font-medium text-[#09090B] dark:text-[#F8FAFC]">Tienes cambios sin guardar. ¿Descartarlos?</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onKeepEditing} className={btnSecondary} autoFocus>
            Seguir editando
          </button>
          <button type="button" onClick={onDiscard} className={`${btnSecondary} !text-[#B42318] dark:!text-[#FCA5A5]`}>
            Descartar cambios
          </button>
        </div>
      </footer>
    );
  }

  const { phase, errorCount, dirty, step, onPrev, onNext, onCancel, saveDisabled, nothingToSave, saveLabel, saveShortLabel, errorId } = props;
  const saving = phase !== "idle";
  const isFirst = step.index === 0;
  const isLast = step.index === step.count - 1;

  return (
    /* Celular: rejilla a todo el ancho ([←] [Siguiente] [Guardar]); escritorio: acciones a la derecha. */
    <footer
      className={`${footerShell} grid gap-2 sm:flex sm:items-center ${isLast ? "grid-cols-[2.75rem_1fr]" : "grid-cols-[2.75rem_1fr_1fr]"}`}
    >
      {saving && phase !== "done" ? <div className="cf-saving-bar" aria-hidden /> : null}

      <button
        type="button"
        disabled={saving}
        onClick={isFirst ? onCancel : onPrev}
        className={`${btnSecondary} !w-auto !px-0 sm:!px-4`}
        aria-label={isFirst ? "Cancelar" : "Paso anterior"}
        title={isFirst ? "Cancelar" : "Paso anterior"}
      >
        {isFirst ? <X className="size-4" aria-hidden /> : <ArrowLeft className="size-4" aria-hidden />}
        <span className="hidden sm:inline">{isFirst ? "Cancelar" : "Anterior"}</span>
      </button>

      {/* Estado del formulario (anunciado a lectores de pantalla). */}
      <span className="hidden flex-1 text-center text-[12.5px] lg:block" role="status" aria-live="polite">
        {phase !== "idle" ? (
          <span className={phase === "done" ? "font-medium text-[#04724D] dark:text-[#4ADE80]" : "text-[#1244D1] dark:text-[#9BB6FF]"}>
            {PHASE_LABEL[phase]}
          </span>
        ) : errorCount > 0 ? (
          <span className="font-medium text-[#B42318] dark:text-[#FCA5A5]">
            {errorCount === 1 ? "Hay 1 campo por corregir" : `Hay ${errorCount} campos por corregir`}
          </span>
        ) : dirty ? (
          <span className="inline-flex items-center gap-1.5 text-[#8A5D0F] dark:text-[#F0B860]">
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            Cambios sin guardar
          </span>
        ) : (
          <span className="text-[#71717A] dark:text-[#8EA0B8]">
            Paso {step.index + 1} de {step.count} · {step.label}
          </span>
        )}
      </span>

      {!isLast ? (
        <button type="button" disabled={saving} onClick={onNext} className={`${btnSecondary} !w-auto !px-3 sm:!px-4 sm:ml-auto lg:ml-0`}>
          Siguiente
          <ArrowRight className="size-4" aria-hidden />
        </button>
      ) : null}
      <button
        type="submit"
        disabled={saveDisabled}
        aria-busy={saving || undefined}
        aria-describedby={errorId}
        title={nothingToSave ? "No hay cambios por guardar" : "Guardar (Ctrl+S)"}
        className={`${btnPrimary} !w-auto !px-3 sm:!px-5 sm:min-w-[11rem] ${isLast ? "sm:ml-auto lg:ml-0" : ""} ${
          phase === "done"
            ? "cf-saved !border-[#0E8A5F] !bg-[#0E8A5F] !text-white !opacity-100 dark:!border-[#22A06B] dark:!bg-[#22A06B]"
            : ""
        }`}
      >
        {phase === "done" ? (
          <Check className="cot-tick size-4" strokeWidth={3} aria-hidden />
        ) : saving ? (
          <Spinner />
        ) : (
          <Check className="size-4" strokeWidth={2.4} aria-hidden />
        )}
        <span className="sm:hidden">{phase === "done" ? "¡Listo!" : saving ? "Guardando…" : saveShortLabel}</span>
        <span className="hidden sm:inline">{phase !== "idle" ? PHASE_LABEL[phase] : saveLabel}</span>
      </button>
    </footer>
  );
}
