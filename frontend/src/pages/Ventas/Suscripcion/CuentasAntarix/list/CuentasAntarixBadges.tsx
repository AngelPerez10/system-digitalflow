import { cn } from "@/lib/utils";
import { caaStatusBadgeClass, erpSectionLabelClass } from "../shared/cuentasAntarixStyles";

const uiLabel = erpSectionLabelClass;
const uiValue = "text-sm font-medium leading-snug text-[#09090B] dark:text-[#F8FAFC]";

export function StatusBadge({ status }: { status: string }) {
  const s = String(status || "").trim();
  const kind = s === "Activo" ? "ok" : s === "Inactivo" || s === "Bloqueado" ? "bad" : "neutral";
  return <span className={caaStatusBadgeClass(kind)}>{s || "—"}</span>;
}

export function DealerBadge({ value }: { value: string }) {
  if (value !== "Sí") return null;
  return <span className={caaStatusBadgeClass("neutral")}>Distribuidor</span>;
}

export function MetaItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className={uiLabel}>{label}</dt>
      <dd className={cn("mt-1 break-words leading-snug tabular-nums", uiValue)}>{value || "—"}</dd>
    </div>
  );
}
