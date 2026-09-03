import { cn } from "@/lib/utils";
import {
  caaAvatarClass,
  caaMobileCardClass,
  erpSansStyle,
} from "../shared/cuentasAntarixStyles";
import type { WialonUnitSearchEntry } from "../shared/wialonTypes";
import { accountInitial } from "../shared/wialonAccountUtils";
import { MetaItem, StatusBadge } from "./CuentasAntarixBadges";

function unitStatusLabel(entry: WialonUnitSearchEntry): string {
  if (entry.status === "Activo" || entry.status === "Inactivo") return entry.status;
  if (entry.is_active === true) return "Activo";
  if (entry.is_active === false) return "Inactivo";
  return entry.status?.trim() || "—";
}

type Props = {
  rows: WialonUnitSearchEntry[];
  canEdit?: boolean;
  onOpen: (entry: WialonUnitSearchEntry) => void;
};

export default function CuentasAntarixUnitsMobileList({
  rows,
  canEdit = true,
  onOpen,
}: Props) {
  return (
    <div className="space-y-3" style={erpSansStyle}>
      {rows.map((entry) => {
        const owners =
          entry.users?.length > 0
            ? entry.users
                .map((u) => u.name || u.user_id || `ID ${u.wialon_id}`)
                .filter(Boolean)
                .join(" · ")
            : "Sin cuenta";
        const unitStatus = unitStatusLabel(entry);
        return (
          <article key={entry.unit_id} className={caaMobileCardClass}>
            <div className="flex items-start gap-3">
              <span className={cn(caaAvatarClass, "size-10 shrink-0 text-base")} aria-hidden>
                {accountInitial(entry.name || "")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                  {entry.name || "Sin nombre"}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-[#1B5CFF] dark:text-[#4B7CFF]">
                  {entry.uid?.trim() ? entry.uid : "Sin IMEI"}
                </p>
                <div className="mt-2">
                  <StatusBadge status={unitStatus} />
                </div>
              </div>
            </div>

            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#E7E7EA] pt-3.5 dark:border-[#273244]">
              <MetaItem label="Teléfono" value={entry.phone?.trim() || "—"} />
              <MetaItem label="Cuentas" value={owners} className="col-span-2" />
              <MetaItem label="Campos" value={entry.custom_fields?.trim() || "—"} className="col-span-2" />
            </dl>

            {canEdit ? (
              <div className="mt-3.5 flex sm:justify-end">
                <button
                  type="button"
                  onClick={() => onOpen(entry)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[13px] font-semibold text-[#09090B] transition-colors hover:border-[#1B5CFF] hover:text-[#1B5CFF] active:scale-[0.99] motion-reduce:transition-none dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#4B7CFF] dark:hover:text-[#4B7CFF] sm:w-auto"
                  aria-label={`Abrir unidad ${entry.name || entry.uid || entry.unit_id}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                  </svg>
                  Abrir unidad
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
