import { ChevronLeft, ChevronRight } from "lucide-react";
import { CLIENTES_PAGE_SIZE, paginationRange, totalPages } from "../shared/clientesListQuery";
import { focusRing, mutedText, strongText } from "../shared/clientesTokens";

const numberFmt = new Intl.NumberFormat("es-MX");

const pageBtn = (current: boolean) =>
  `cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-medium tabular-nums ${focusRing} ${
    current
      ? "bg-[#17235B] text-white dark:bg-[#4B7CFF]"
      : "text-[#3F3F46] hover:bg-[#F4F4F5] dark:text-[#CBD5E1] dark:hover:bg-white/[0.06]"
  }`;

const arrowBtn = `cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#E7E7EA] text-[#3F3F46] hover:bg-[#FAFAFA] disabled:pointer-events-none disabled:opacity-40 dark:border-[#273244] dark:text-[#CBD5E1] dark:hover:bg-white/[0.06] ${focusRing}`;

export function ClientesPagination({
  page,
  count,
  onPage,
}: {
  page: number;
  count: number;
  onPage: (page: number) => void;
}) {
  const pages = totalPages(count);
  const from = count === 0 ? 0 : (page - 1) * CLIENTES_PAGE_SIZE + 1;
  const to = Math.min(page * CLIENTES_PAGE_SIZE, count);

  return (
    <div className="flex flex-col gap-3 border-t border-[#F0F0F2] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-[#1F2A3C]">
      <p className={`text-[13px] ${mutedText}`} aria-live="polite">
        <span className={`font-medium tabular-nums ${strongText}`}>
          {numberFmt.format(from)}–{numberFmt.format(to)}
        </span>{" "}
        de <span className={`font-medium tabular-nums ${strongText}`}>{numberFmt.format(count)}</span>
      </p>

      {pages > 1 ? (
        <nav aria-label="Paginación de contactos" className="flex items-center gap-1 overflow-x-auto">
          <button type="button" className={arrowBtn} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Página anterior">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <ul className="flex items-center gap-1">
            {paginationRange(page, pages).map((p, i) =>
              p === "gap" ? (
                <li key={`gap-${i}`} className="w-6 text-center text-[#A1A1AA]" aria-hidden>
                  …
                </li>
              ) : (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => onPage(p)}
                    aria-current={p === page ? "page" : undefined}
                    aria-label={`Página ${p}`}
                    className={pageBtn(p === page)}
                  >
                    {p}
                  </button>
                </li>
              ),
            )}
          </ul>
          <button type="button" className={arrowBtn} onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Página siguiente">
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
