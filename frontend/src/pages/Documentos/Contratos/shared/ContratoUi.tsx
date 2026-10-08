import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContratoEstado } from "./contratoApi";
import { ESTADO_CONTRATO_TONE, erpStatCardClass, fieldError, fieldHint, fieldLabel, requiredMark } from "./contratoTokens";

export function EstadoPill({ estado, className }: { estado: ContratoEstado; className?: string }) {
  const tone = ESTADO_CONTRATO_TONE[estado];
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ring-1 ring-inset",
        tone.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
      {tone.label}
    </span>
  );
}

/** Dos puntos: P(restador) y C(liente). Relleno = ya firmó. */
export function FirmasIndicator({ prestador, cliente }: { prestador: boolean; cliente: boolean }) {
  const item = (ok: boolean, letra: string, nombre: string) => (
    <span
      title={`${nombre}: ${ok ? "firmado" : "pendiente"}`}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-[10.5px] font-semibold transition-colors duration-300",
        ok
          ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
          : "border border-dashed border-[#D4D4D8] text-[#A1A1AA] dark:border-[#3A4661] dark:text-[#64748B]",
      )}
    >
      {ok ? <Check className="cot-tick size-3" strokeWidth={3} aria-hidden /> : letra}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Prestador ${prestador ? "firmó" : "pendiente"}, cliente ${cliente ? "firmó" : "pendiente"}`}>
      {item(prestador, "P", "Prestador")}
      <span className={cn("h-px w-2.5", prestador && cliente ? "bg-[#04724D] dark:bg-[#22A06B]" : "bg-[#E4E4E7] dark:bg-[#273244]")} aria-hidden />
      {item(cliente, "C", "Cliente")}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  iconClass,
  hint,
  order = 0,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconClass: string;
  hint?: string;
  order?: number;
}) {
  return (
    <div className={cn(erpStatCardClass, "cot-rise min-w-0")} style={{ "--cot-i": order } as CSSProperties}>
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <span
          className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg border sm:size-10 [&_svg]:size-4 sm:[&_svg]:size-5", iconClass)}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] sm:text-[10px]">{label}</p>
          <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
            <span key={String(value)} className="cot-flash inline-block">
              {value}
            </span>
          </p>
          {hint ? <p className="truncate text-[11px] text-[#A1A1AA] dark:text-[#64748B]">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

export const STAT_ICON = {
  neutral: "border-[#E7E7EA] bg-white/90 text-[#1B5CFF] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#4B7CFF]",
  blue: "border-sky-200/70 bg-sky-50/90 text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300",
  gold: "border-orange-200/80 bg-orange-50/90 text-orange-900 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-200",
  green: "border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
} as const;

/** Sección numerada con palomita al completarse (misma que Nueva cotización). */
export function SectionCard({
  id,
  step,
  title,
  description,
  done,
  optional,
  actions,
  order = 0,
  children,
}: {
  id: string;
  step: number;
  title: string;
  description: string;
  done?: boolean;
  optional?: boolean;
  actions?: ReactNode;
  order?: number;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      style={{ "--cot-i": order } as CSSProperties}
      className="cot-rise relative min-w-0 max-w-full scroll-mt-24 overflow-x-clip rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C] sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-300",
              done
                ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                : "border border-[#D4D4D8] bg-white text-[#52525B] dark:border-[#3A4661] dark:bg-[#111827] dark:text-[#B7C1D1]",
            )}
            aria-hidden
          >
            {done ? <Check className="cot-tick size-3.5" strokeWidth={3} /> : step}
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="flex flex-wrap items-center gap-2 text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
              {title}
              {optional && (
                <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium tracking-normal text-[#71717A] dark:bg-[#1B2539] dark:text-[#8EA0B8]">
                  Opcional
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="min-w-0 px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  full,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", full && "sm:col-span-2")}>
      <label htmlFor={htmlFor} className={fieldLabel}>
        {label}
        {required && (
          <span className={requiredMark} aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className={cn(fieldError, "cot-fade")} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={fieldHint}>{hint}</p>
      ) : null}
    </div>
  );
}
