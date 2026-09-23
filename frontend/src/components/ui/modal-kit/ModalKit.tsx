/**
 * Kit de modales de la app (Cotizaciones, Órdenes de servicio…).
 *
 * Un solo lenguaje para todos los diálogos (confirmar, formularios, progreso):
 * panel blanco con esquinas de 16 px, encabezado con ícono en mosaico de tono,
 * pie hundido con acciones a la derecha, y la cancelación siempre primero en
 * el orden de foco (acción segura por defecto).
 *
 * Se apoya en `@/components/ui/modal` (portal, foco atrapado, Escape, bloqueo
 * de scroll y animación de entrada/salida); aquí solo vive la presentación.
 */
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import "./motion.css";
import { appModalBtn } from "./modalKitStyles";

export type AppModalTone = "danger" | "warning" | "info" | "success" | "neutral";

const toneTileClass: Record<AppModalTone, string> = {
  danger:
    "bg-[#FEF2F2] text-[#C22B2B] ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]",
  warning:
    "bg-[#FFF8EB] text-[#9A6B15] ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#E6A23C] dark:ring-[rgba(230,162,60,0.3)]",
  info: "bg-[#EEF3FF] text-[#1B5CFF] ring-[#D7E3FF] dark:bg-[#1B2A63] dark:text-[#9BB6FF] dark:ring-[#3A4A6B]",
  success:
    "bg-[#E9F8F0] text-[#04724D] ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#4ADE80] dark:ring-[#1E5A42]",
  neutral:
    "bg-[#F4F4F5] text-[#3F3F46] ring-[#E4E4E7] dark:bg-[#1B2539] dark:text-[#D6DEEA] dark:ring-[#273244]",
};

const sizeClass = {
  sm: "max-w-[26rem]",
  md: "max-w-lg",
  lg: "max-w-xl",
} as const;

/* --------------------------------------------------------------------------
   Estructura
   -------------------------------------------------------------------------- */

type CotModalProps = {
  open: boolean;
  onClose: () => void;
  size?: keyof typeof sizeClass;
  /** Mientras es true no se puede cerrar (Escape / fondo). */
  busy?: boolean;
  /** Cerrar al hacer clic en el fondo. Solo para diálogos sin datos capturados. */
  dismissOnBackdrop?: boolean;
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  /** Clases extra del panel (p. ej. alto fijo para listas). */
  className?: string;
  children: ReactNode;
};

export function AppModal({
  open,
  onClose,
  size = "sm",
  busy = false,
  dismissOnBackdrop = false,
  labelledBy,
  describedBy,
  ariaLabel,
  className = "",
  children,
}: CotModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={busy ? () => {} : onClose}
      closeOnBackdropClick={dismissOnBackdrop && !busy}
      closeOnEscape={!busy}
      showCloseButton={false}
      ariaLabelledBy={labelledBy}
      ariaDescribedBy={describedBy}
      ariaLabel={labelledBy ? undefined : ariaLabel}
      className={`mx-4 w-[calc(100%-2rem)] overflow-hidden rounded-2xl! border border-[#E4E4E7] bg-white! p-0 shadow-[0_32px_64px_-24px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:bg-[#111827]! dark:shadow-[0_32px_64px_-24px_rgba(0,0,0,0.7)] sm:mx-auto sm:w-full ${sizeClass[size]} ${className}`}
    >
      <div className="relative flex min-h-0 flex-1 flex-col" aria-busy={busy || undefined}>
        {children}
      </div>
    </Modal>
  );
}

export function AppModalIcon({ tone = "neutral", children }: { tone?: AppModalTone; children: ReactNode }) {
  return (
    <span
      className={`cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${toneTileClass[tone]}`}
      aria-hidden
    >
      {children}
    </span>
  );
}

type CotModalHeaderProps = {
  icon: ReactNode;
  tone?: AppModalTone;
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId: string;
  description?: ReactNode;
  descriptionId?: string;
  /** Si se pasa, muestra el botón de cerrar (X). */
  onClose?: () => void;
  closeDisabled?: boolean;
  /** Separador inferior: para diálogos con cuerpo propio. */
  divided?: boolean;
};

export function AppModalHeader({
  icon,
  tone = "neutral",
  eyebrow,
  title,
  titleId,
  description,
  descriptionId,
  onClose,
  closeDisabled,
  divided = false,
}: CotModalHeaderProps) {
  return (
    <header
      className={`relative shrink-0 px-6 pb-5 pt-6 ${onClose ? "pr-16" : ""} ${
        divided ? "border-b border-[#F0F0F2] dark:border-[#1F2A3C]" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <AppModalIcon tone={tone}>{icon}</AppModalIcon>
        <div className="min-w-0 flex-1 pt-0.5">
          {eyebrow ? (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">
              {eyebrow}
            </p>
          ) : null}
          <h2
            id={titleId}
            className="text-[18px] font-semibold leading-snug tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]"
          >
            {title}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className="mt-1.5 text-[14px] leading-relaxed text-[#52525B] dark:text-[#B7C1D1]"
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Cerrar ventana"
          className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#64748B] dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA]"
        >
          <X className="size-4.5" aria-hidden />
        </button>
      ) : null}
    </header>
  );
}

export function AppModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-h-0 px-6 pb-6 ${className}`}>{children}</div>;
}

export function AppModalFooter({
  children,
  note,
  stretch = false,
}: {
  children: ReactNode;
  note?: ReactNode;
  /** Botones a partes iguales ocupando todo el ancho (diálogos de dos acciones). */
  stretch?: boolean;
}) {
  if (stretch) {
    return (
      <footer className="shrink-0 border-t border-[#F0F0F2] bg-[#FAFAFA] px-6 py-5 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60">
        {note ? (
          <div className="mb-3 text-[12px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">{note}</div>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:grid sm:grid-cols-2">{children}</div>
      </footer>
    );
  }
  return (
    <footer className="flex shrink-0 flex-col gap-3 border-t border-[#F0F0F2] bg-[#FAFAFA] px-6 py-5 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 sm:flex-row sm:items-center sm:justify-between">
      {note ? (
        <div className="min-w-0 text-[12px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">{note}</div>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>
    </footer>
  );
}

/** Tarjeta de contexto: qué registro se va a afectar. */
export function AppModalContext({
  rows,
  children,
}: {
  rows?: { label: string; value: ReactNode; strong?: boolean }[];
  children?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A]/60">
      {rows && rows.length > 0 ? (
        <dl className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="shrink-0 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">{r.label}</dt>
              <dd
                className={`min-w-0 truncate text-right text-[13px] ${
                  r.strong
                    ? "font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]"
                    : "font-medium text-[#3F3F46] dark:text-[#D6DEEA]"
                }`}
              >
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </div>
  );
}

export function AppSpinner({ className = "size-4" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />;
}

/* --------------------------------------------------------------------------
   Confirmación
   -------------------------------------------------------------------------- */

type CotConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Puede ser asíncrona: el diálogo muestra «trabajando» y espera antes de cerrar. */
  onConfirm: () => void | Promise<unknown>;
  tone?: Extract<AppModalTone, "danger" | "warning" | "info">;
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  /** Contexto opcional (qué se va a eliminar, qué se pierde). */
  detail?: ReactNode;
  confirmLabel?: string;
  busyLabel?: string;
  cancelLabel?: string;
};

export function AppConfirmDialog({
  open,
  onClose,
  onConfirm,
  tone = "danger",
  icon,
  title,
  description,
  detail,
  confirmLabel = "Confirmar",
  busyLabel = "Procesando…",
  cancelLabel = "Cancelar",
}: CotConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;
    try {
      const result = onConfirm();
      if (result && typeof (result as Promise<unknown>).then === "function") {
        setBusy(true);
        await result;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal open={open} onClose={onClose} busy={busy} labelledBy={titleId} describedBy={descId}>
      <AppModalHeader
        icon={icon}
        tone={tone}
        title={title}
        titleId={titleId}
        description={description}
        descriptionId={descId}
      />
      {detail ? <AppModalBody>{detail}</AppModalBody> : null}
      <AppModalFooter>
        <button type="button" onClick={onClose} disabled={busy} className={appModalBtn.secondary}>
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={busy}
          className={tone === "danger" ? appModalBtn.danger : appModalBtn.primary}
        >
          {busy ? <AppSpinner /> : null}
          {busy ? busyLabel : confirmLabel}
        </button>
      </AppModalFooter>
    </AppModal>
  );
}

/* --------------------------------------------------------------------------
   Progreso (generar PDF / Excel)
   -------------------------------------------------------------------------- */

type CotProgressDialogProps = {
  open: boolean;
  icon: ReactNode;
  tone?: AppModalTone;
  title: string;
  description: string;
  /** 0–100. Se muestra como máximo 99 % hasta que el proceso termina. */
  progress: number;
  /** Documento en curso (p. ej. folio «COT-42»). */
  subject?: string;
  /** Pasos visibles; el activo se deriva del progreso. */
  steps?: string[];
  /** Texto de estado cuando no hay `steps`. */
  stepLabel?: string;
};

/** Hoja de papel que «se va escribiendo»: indicador de carga sin spinner. */
function AppWritingSheet({ icon, tone }: { icon: ReactNode; tone: AppModalTone }) {
  return (
    <div className="relative mx-auto mb-6 h-[84px] w-[68px]" aria-hidden>
      <div className="absolute inset-0 rotate-[-6deg] rounded-lg bg-[#EEF3FF] dark:bg-[#1B2A63]/60" />
      <div className="absolute inset-0 overflow-hidden rounded-lg bg-white shadow-[0_10px_24px_-12px_rgba(9,9,11,0.35)] ring-1 ring-[#E4E4E7] dark:bg-[#F8FAFC] dark:ring-[#3A4661]">
        <div className="h-2 bg-[#17235B]" />
        <div className="space-y-[7px] px-2.5 pt-3">
          {[100, 82, 92, 60].map((w, i) => (
            <span
              key={i}
              className="cot-write block h-[3px] rounded-full bg-[#D4D4D8]"
              style={{ width: `${w}%`, "--cot-i": i } as CSSProperties}
            />
          ))}
        </div>
      </div>
      <span
        className={`absolute -bottom-2 -right-3 inline-flex size-8 items-center justify-center rounded-full ring-4 ring-white dark:ring-[#111827] ${toneTileClass[tone]} [&_svg]:size-4`}
      >
        {icon}
      </span>
    </div>
  );
}

export function AppProgressDialog({
  open,
  icon,
  tone = "info",
  title,
  description,
  progress,
  subject,
  steps,
  stepLabel,
}: CotProgressDialogProps) {
  const titleId = useId();
  const descId = useId();
  const pct = Math.min(99, Math.max(0, Math.round(progress)));
  const activeStep = steps && steps.length > 0 ? Math.min(steps.length - 1, Math.floor(pct / (100 / steps.length))) : -1;

  return (
    <AppModal open={open} onClose={() => {}} busy labelledBy={titleId} describedBy={descId}>
      <div className="px-6 pb-7 pt-8 sm:px-8">
        <AppWritingSheet icon={icon} tone={tone} />

        <div className="text-center">
          {subject ? (
            <p className="mb-1 font-mono text-[12px] font-semibold tracking-wide text-[#1244D1] dark:text-[#9BB6FF]">
              {subject}
            </p>
          ) : null}
          <h2 id={titleId} className="text-[19px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
            {title}
          </h2>
          <p id={descId} className="mx-auto mt-1.5 max-w-xs text-[14px] leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
            {description}
          </p>
        </div>

        {steps && steps.length > 0 ? (
          <ol className="mx-auto mt-6 max-w-xs space-y-2.5" aria-live="polite">
            {steps.map((label, i) => {
              const done = i < activeStep;
              const active = i === activeStep;
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300 ${
                      done
                        ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                        : active
                          ? "bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
                          : "bg-[#F4F4F5] text-[#A1A1AA] dark:bg-[#1B2539] dark:text-[#64748B]"
                    }`}
                    aria-hidden
                  >
                    {done ? <Check className="cot-tick size-3.5" strokeWidth={3} /> : active ? <AppSpinner className="size-3.5" /> : i + 1}
                  </span>
                  <span
                    className={`text-[14px] transition-colors duration-300 ${
                      done
                        ? "text-[#71717A] dark:text-[#8EA0B8]"
                        : active
                          ? "font-medium text-[#09090B] dark:text-[#F8FAFC]"
                          : "text-[#A1A1AA] dark:text-[#64748B]"
                    }`}
                  >
                    {label}
                    <span className="sr-only">{done ? " (listo)" : active ? " (en curso)" : " (pendiente)"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}

        <div className="mt-6">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#71717A] dark:text-[#8EA0B8]" aria-live="polite">
              {steps ? "Progreso" : (stepLabel ?? "Procesando…")}
            </span>
            <span className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{pct}%</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F0F0F2] dark:bg-[#1F2A3C]"
            role="progressbar"
            aria-label={title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div
              className="cot-bar h-full w-full rounded-full bg-[#1B5CFF] dark:bg-[#4B7CFF]"
              style={{ transform: `scaleX(${pct / 100})` }}
            />
          </div>
          <p className="mt-3 text-center text-[12px] text-[#A1A1AA] dark:text-[#64748B]">No cierres esta ventana.</p>
        </div>
      </div>
    </AppModal>
  );
}
