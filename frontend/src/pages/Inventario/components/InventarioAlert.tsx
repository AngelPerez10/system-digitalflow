import { invAlertTone, type InvAlertVariant } from "../shared/inventarioStyles";

type InventarioAlertProps = {
  variant: InvAlertVariant;
  title: string;
  message?: string;
  onDismiss?: () => void;
  className?: string;
};

/** Aviso inline: mismo tono y estructura que InlineAlert de Tareas / Productos. */
export default function InventarioAlert({
  variant,
  title,
  message,
  onDismiss,
  className = "",
}: InventarioAlertProps) {
  const tone = invAlertTone[variant];
  const assertive = variant === "error" || variant === "warning";
  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 ${tone.border} ${tone.bg} ${className}`.trim()}
    >
      <span className={`mt-1.5 size-[7px] shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-medium ${tone.title}`}>{title}</p>
        {message ? <p className={`mt-0.5 text-[13px] leading-[18px] ${tone.msg}`}>{message}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Descartar aviso"
          className={`-mr-1 -mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06] ${tone.title}`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
            <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
