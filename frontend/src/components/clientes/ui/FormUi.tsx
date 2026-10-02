/**
 * Piezas de UI de los modales de cliente (alta/edición, mapa, libretas de
 * contactos y direcciones). Mismo lenguaje que el resto de la app: cabecera
 * marina, cuerpo en lienzo, azul eléctrico como único acento de acción.
 *
 * Accesibilidad: cada campo enlaza su etiqueta, ayuda y error por `id`
 * (`aria-describedby`, `aria-invalid`); el error se anuncia al aparecer.
 * Movimiento: solo `transform`/`opacity` vía `modal-kit/motion.css`.
 */
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert, X } from "lucide-react";
import { inputClass, textareaClass, selectClass } from "./tokens";
import { btnSmDanger, btnSmSecondary, focusRing } from "./tokens";

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />;
}

/* --------------------------------------------------------------------------
   Estructura del modal
   -------------------------------------------------------------------------- */

export function ModalHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  titleId,
  descId,
  onClose,
  closeDisabled = false,
}: {
  icon: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  titleId: string;
  descId?: string;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  return (
    <header className="relative shrink-0 overflow-hidden bg-[#17235B] px-5 py-5 pr-16 text-white dark:bg-[#1B2A63] sm:px-6">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#E6A23C]/12 blur-3xl" aria-hidden />
      <div className="relative flex min-w-0 items-start gap-3.5">
        <span className="cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">{eyebrow}</p>
          ) : null}
          <h2 id={titleId} className="mt-0.5 truncate text-[19px] font-semibold leading-[1.3] tracking-[-0.4px] sm:text-[20px]">
            {title}
          </h2>
          {subtitle ? (
            <p id={descId} className="mt-1 text-[13.5px] leading-5 text-white/75">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {/* Mismo `aria-label` que el botón del `Modal` base: recibe el foco inicial. */}
      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        aria-label="Cerrar ventana"
        className="cot-press absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:right-4 sm:top-4"
      >
        <X className="size-5" aria-hidden />
      </button>
    </header>
  );
}


/* --------------------------------------------------------------------------
   Avisos
   -------------------------------------------------------------------------- */

type NoticeTone = "error" | "warning" | "info" | "success";

const NOTICE: Record<NoticeTone, { icon: typeof Info; box: string; icon_: string; title: string }> = {
  error: {
    icon: CircleAlert,
    box: "border-[#F6CFCF] bg-[#FEF2F2] dark:border-[#7F1D1D] dark:bg-[#3F1518]",
    icon_: "text-[#C22B2B] dark:text-[#F87171]",
    title: "text-[#9F1F1F] dark:text-[#FCA5A5]",
  },
  warning: {
    icon: TriangleAlert,
    box: "border-[rgba(230,162,60,0.4)] bg-[#FFF8EC] dark:border-[rgba(230,162,60,0.3)] dark:bg-[rgba(230,162,60,0.08)]",
    icon_: "text-[#9A6B15] dark:text-[#E6A23C]",
    title: "text-[#7A5410] dark:text-[#F0B860]",
  },
  info: {
    icon: Info,
    box: "border-[rgba(27,92,255,0.22)] bg-[#F3F7FF] dark:border-[rgba(75,124,255,0.3)] dark:bg-[rgba(75,124,255,0.08)]",
    icon_: "text-[#1B5CFF] dark:text-[#7FA2FF]",
    title: "text-[#17235B] dark:text-[#C7D6FF]",
  },
  success: {
    icon: CircleCheck,
    box: "border-[#BFE6D4] bg-[#E9F8F0] dark:border-[#1E5A42] dark:bg-[#0F2A1C]",
    icon_: "text-[#04724D] dark:text-[#4ADE80]",
    title: "text-[#04724D] dark:text-[#4ADE80]",
  },
};

export function Notice({
  tone,
  title,
  children,
  id,
  className = "",
}: {
  tone: NoticeTone;
  title?: string;
  children?: ReactNode;
  id?: string;
  className?: string;
}) {
  const t = NOTICE[tone];
  const Icon = t.icon;
  const assertive = tone === "error" || tone === "warning";
  return (
    <div
      id={id}
      role={assertive ? "alert" : "status"}
      className={`cot-pop flex items-start gap-3 rounded-[12px] border px-3.5 py-3 ${t.box} ${className}`}
    >
      <Icon className={`mt-px size-[18px] shrink-0 ${t.icon_}`} aria-hidden />
      <div className="min-w-0 text-[13px] leading-[19px] text-[#3F3F46] dark:text-[#CBD5E1]">
        {title ? <p className={`text-[13.5px] font-semibold ${t.title}`}>{title}</p> : null}
        {children ? <div className={title ? "mt-0.5 whitespace-pre-line" : "whitespace-pre-line"}>{children}</div> : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Secciones y campos
   -------------------------------------------------------------------------- */

const sectionTone = {
  azul: "bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#7FA2FF]",
  dorado: "bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]",
  marino: "bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]",
} as const;

export function FormSection({
  icon,
  tone,
  title,
  hint,
  extra,
  children,
}: {
  icon: ReactNode;
  tone: keyof typeof sectionTone;
  title: string;
  hint?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[16px] border border-[#E7E7EA] bg-white p-4 shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827] sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] ${sectionTone[tone]}`} aria-hidden>
            {icon}
          </span>
          <div className="min-w-0">
            <h3 id={headingId} className="text-[14.5px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
              {title}
            </h3>
            {hint ? <p className="mt-0.5 text-[12.5px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">{hint}</p> : null}
          </div>
        </div>
        {extra}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const invalidClass =
  "!border-[#C22B2B] focus:!ring-[rgba(194,43,43,0.18)] dark:!border-[#F87171] dark:focus:!ring-[rgba(248,113,113,0.22)]";

export type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

/**
 * Etiqueta + control + ayuda + error enlazados. El control llega por
 * render-prop para cubrir inputs, selects, textareas o compuestos.
 */
export function Field({
  label,
  required = false,
  hint,
  error,
  className = "",
  labelAside,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  labelAside?: ReactNode;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // Solo uno se muestra a la vez: el error reemplaza a la ayuda.
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-[#3F3F46] dark:text-[#CBD5E1]">
          {label}
          {required ? (
            <>
              <span className="ml-0.5 text-[#C22B2B] dark:text-[#F87171]" aria-hidden>
                *
              </span>
              <span className="sr-only"> (obligatorio)</span>
            </>
          ) : null}
        </label>
        {labelAside}
      </div>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}
      {error ? (
        <p id={errorId} className="cot-fade mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-[#B42318] dark:text-[#FCA5A5]">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[12px] leading-[17px] text-[#6E6E77] dark:text-[#8EA0B8]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ invalid, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} className={`${inputClass} ${invalid ? invalidClass : ""} ${className}`} />;
}

export function SelectInput({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${selectClass} ${className}`} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${textareaClass} ${className}`} />;
}

/** Interruptor accesible (`role="switch"`) con su texto como nombre. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center gap-3">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${focusRing} ${
          checked ? "bg-[#1B5CFF] dark:bg-[#4B7CFF]" : "bg-[#D3D3D8] dark:bg-[#3A4661]"
        }`}
      >
        <span
          className={`inline-block size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-out ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
          aria-hidden
        />
      </button>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-[13.5px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
          {label}
        </span>
        {description ? (
          <span id={`${id}-desc`} className="block text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
            {description}
          </span>
        ) : null}
      </label>
    </div>
  );
}

/** Confirmación en línea (eliminar un renglón de la libreta). */
export function InlineConfirm({
  message,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  message: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={message}
      className="cot-pop mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#F6CFCF] bg-[#FEF2F2] px-3 py-2.5 dark:border-[#7F1D1D] dark:bg-[#3F1518]"
    >
      <p className="text-[13px] font-medium text-[#9F1F1F] dark:text-[#FCA5A5]">{message}</p>
      <div className="flex gap-2 max-sm:w-full">
        {/* Foco en la acción segura al aparecer. */}
        <button type="button" onClick={onCancel} disabled={busy} className={btnSmSecondary} autoFocus>
          Cancelar
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} aria-busy={busy} className={btnSmDanger}>
          {busy ? <Spinner className="size-3.5" /> : null}
          {busy ? "Eliminando…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}
