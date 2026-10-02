/**
 * Encabezado vivo del formulario (mismo lenguaje que el modal de Proyectos):
 * refleja nombre, tipo y qué tan completo está el registro mientras se captura.
 */
import { UserPen, UserPlus, X } from "lucide-react";
import { formFont } from "../ui/tokens";

type Props = {
  titleId: string;
  descId: string;
  isEditing: boolean;
  /** Línea superior (p. ej. «Contactos de negocio · No. 12» o «Nuevo proveedor»). */
  eyebrow: string;
  tipoLabel: string;
  title: string;
  /** 0–100. */
  completion: number;
  closeDisabled: boolean;
  onClose: () => void;
};

export function ClienteFormHeader({ titleId, descId, isEditing, eyebrow, tipoLabel, title, completion, closeDisabled, onClose }: Props) {
  return (
    <header className="cot-sheen relative shrink-0 overflow-hidden bg-[#17235B] text-white dark:bg-[#1B2A63]" style={formFont}>
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
      <div className="relative flex items-start gap-3.5 px-5 pb-4 pr-16 pt-5 sm:px-6">
        <span
          className="hidden size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] sm:inline-flex"
          aria-hidden
        >
          {isEditing ? <UserPen className="size-5" /> : <UserPlus className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">{eyebrow}</p>
            <span
              key={tipoLabel}
              className="cot-pop inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[11px] font-medium text-white/85 ring-1 ring-white/15"
            >
              {tipoLabel}
            </span>
          </div>
          <h2 id={titleId} className="mt-1 truncate text-[20px] font-semibold leading-tight tracking-[-0.5px] sm:text-[22px]" title={title}>
            {title}
          </h2>
          <p id={descId} className="mt-1 text-[13px] text-white/65">
            Los campos con * son obligatorios.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Cerrar ventana"
          className="cot-press absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="relative flex items-center gap-3 px-5 pb-4 sm:px-6">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Registro completo"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion}
        >
          <div className="cot-bar h-full w-full rounded-full bg-[#E6A23C]" style={{ transform: `scaleX(${completion / 100})` }} />
        </div>
        <span key={completion} className="cot-flash w-11 text-right text-[13px] font-semibold tabular-nums text-white/85">
          {completion}%
        </span>
      </div>
    </header>
  );
}
