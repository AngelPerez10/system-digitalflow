import type { ReactNode } from "react";

export const facturaHintClass = "text-xs leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]";

export const facturaSectionClass =
  "rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-4 dark:border-[#273244] dark:bg-[#1B2539] sm:p-5";

export const facturaSectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]";

export const facturaSubheadingClass =
  "text-[16px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC] sm:text-[17px]";

type SectionIntroProps = {
  id: string;
  label: string;
  title: string;
  description?: string;
};

export function FacturaSectionIntro({ id, label, title, description }: SectionIntroProps) {
  return (
    <header className="mb-4 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
      <p className={facturaSectionLabelClass}>{label}</p>
      <h3 id={id} className={`mt-0.5 ${facturaSubheadingClass}`}>
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
      className="grid grid-cols-1 gap-2 border-b border-[#E7E7EA] px-4 py-3 dark:border-[#273244] sm:grid-cols-3 sm:gap-3 sm:px-5 sm:py-4"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-start sm:px-4 sm:py-3 ${
            item.emphasis
              ? "border border-[rgba(230,162,60,0.35)] bg-[rgba(230,162,60,0.10)] dark:border-[rgba(230,162,60,0.3)] dark:bg-[rgba(230,162,60,0.12)]"
              : "border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]/50"
          }`}
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
            {item.label}
          </dt>
          <dd
            className={`font-mono text-sm font-semibold tabular-nums sm:text-right sm:text-base ${
              item.emphasis ? "text-[#9A6B15] dark:text-[#E6A23C]" : "text-[#09090B] dark:text-[#F8FAFC]"
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
    <span className="inline-flex rounded-full border border-[rgba(230,162,60,0.35)] bg-[rgba(230,162,60,0.16)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E6A23C]">
      {children}
    </span>
  );
}

export function FacturaNeutralBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#E7E7EA] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#52525B] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#aeb8c8]">
      {children}
    </span>
  );
}
