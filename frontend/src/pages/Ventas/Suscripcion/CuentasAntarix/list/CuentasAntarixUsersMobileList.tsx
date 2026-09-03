import { cn } from "@/lib/utils";
import {
  caaAvatarClass,
  caaMobileCardClass,
  erpSansStyle,
} from "../shared/cuentasAntarixStyles";
import type { WialonUserRow } from "../shared/wialonTypes";
import { accountInitial } from "../shared/wialonAccountUtils";
import { DealerBadge, MetaItem, StatusBadge } from "./CuentasAntarixBadges";

const uiLabel = "text-[11px] font-medium uppercase tracking-wide text-[#6E6E77] dark:text-[#8EA0B8]";
const uiCaption = "text-xs font-normal leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]";

type Props = {
  rows: WialonUserRow[];
  canEdit?: boolean;
  search?: string;
  matchedUnitsByUser?: Map<number, string[]>;
  onEdit: (row: WialonUserRow) => void;
};

export default function CuentasAntarixUsersMobileList({
  rows,
  canEdit = true,
  search = "",
  matchedUnitsByUser,
  onEdit,
}: Props) {
  return (
    <div className="space-y-3" style={erpSansStyle}>
      {rows.map((row) => {
        const matched = matchedUnitsByUser?.get(Number(row.wialon_id));
        const blockedLabel =
          row.status === "Bloqueado" && row.blocked !== "No" ? row.blocked : "";
        return (
          <article key={row.wialon_id} className={caaMobileCardClass}>
            <div className="flex items-start gap-3">
              <span className={cn(caaAvatarClass, "size-10 shrink-0 text-base")} aria-hidden>
                {accountInitial(row.name || "")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                  {row.name || "Sin nombre"}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-[#1B5CFF] dark:text-[#4B7CFF]">
                  {row.user_id || "—"}
                  {row.creator ? ` · ${row.creator}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={row.status} />
                  <DealerBadge value={row.dealer_rights} />
                </div>
              </div>
            </div>

            {search.trim() && matched?.length ? (
              <div className="mt-3 rounded-[10px] border border-[rgba(27,92,255,0.2)] bg-[rgba(27,92,255,0.06)] px-3 py-2 dark:border-[#4B7CFF]/25 dark:bg-[rgba(75,124,255,0.1)]">
                <p className={uiLabel}>Unidades coincidentes</p>
                <p className={cn("mt-1 break-words", uiCaption)}>{matched.join(" · ")}</p>
              </div>
            ) : null}

            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#E7E7EA] pt-3.5 dark:border-[#273244]">
              <MetaItem label="Cuenta padre" value={row.parent_account} className="col-span-2" />
              <MetaItem label="Unidades" value={String(row.assigned_units)} />
              <MetaItem label="Bloqueada" value={blockedLabel || "No"} />
            </dl>

            {canEdit ? (
              <div className="mt-3.5 flex sm:justify-end">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[13px] font-semibold text-[#09090B] transition-colors hover:border-[#1B5CFF] hover:text-[#1B5CFF] active:scale-[0.99] motion-reduce:transition-none dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#4B7CFF] dark:hover:text-[#4B7CFF] sm:w-auto"
                  aria-label={`Editar ${row.name || row.user_id}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                  </svg>
                  Editar cuenta
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
