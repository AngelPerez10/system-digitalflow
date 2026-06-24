import type { ReactNode } from "react";
import { erpSectionLabelClass } from "@/layout/erpPageStyles";

export const facturaHintClass = "text-xs leading-relaxed text-[#78716c] dark:text-[#94a3b8]";

export const facturaSectionClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#334155] dark:bg-[#0f172a]/90 sm:p-5";

type SectionIntroProps = {
  id: string;
  label: string;
  title: string;
  description?: string;
};

export function FacturaSectionIntro({ id, label, title, description }: SectionIntroProps) {
  return (
    <header className="mb-4 border-b border-[#e7ded0]/80 pb-3 dark:border-white/[0.06]">
      <p className={erpSectionLabelClass}>{label}</p>
      <h3
        id={id}
        className="mt-0.5 [font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.05rem,1.8vw,1.25rem)] font-medium leading-[1.2] tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc]"
      >
        {title}
      </h3>
      {description ? <p className={`mt-1.5 max-w-2xl ${facturaHintClass}`}>{description}</p> : null}
    </header>
  );
}

type TotalItem = { label: string; value: string; emphasis?: boolean };

type TotalsBarProps = {
  items: TotalItem[];
  ariaLabel: string;
};

export function FacturaTotalsBar({ items, ariaLabel }: TotalsBarProps) {
  return (
    <dl
      className="grid grid-cols-1 gap-2 border-b border-[#e7ded0] px-4 py-3 dark:border-[#334155] sm:grid-cols-3 sm:gap-3 sm:px-5 sm:py-4"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-start sm:px-4 sm:py-3 ${
            item.emphasis
              ? "border border-[#ff801f]/25 bg-[#fff8f1]/90 dark:border-[#fb923c]/30 dark:bg-[#ff801f]/8"
              : "border border-[#e7ded0]/80 bg-[#fffdfa]/80 dark:border-[#334155] dark:bg-[#111827]/50"
          }`}
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8]">
            {item.label}
          </dt>
          <dd
            className={`font-mono text-sm font-semibold tabular-nums sm:text-right sm:text-base ${
              item.emphasis ? "text-[#c2410c] dark:text-[#fb923c]" : "text-[#1c1917] dark:text-[#f8fafc]"
            }`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function FacturaCfdiBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#ff801f]/30 bg-[#ff801f]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a3412] dark:border-[#fb923c]/35 dark:bg-[#ff801f]/15 dark:text-[#fdba74]">
      {children}
    </span>
  );
}

export function FacturaNeutralBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#e7ded0] bg-[#fcfaf6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#57534e] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#aeb8c8]">
      {children}
    </span>
  );
}
