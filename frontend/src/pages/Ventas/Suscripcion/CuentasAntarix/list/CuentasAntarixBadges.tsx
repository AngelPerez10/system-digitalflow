import { Ban, Car, CircleCheck, Lock, PackageOpen, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { caaStatusBadgeClass, erpSectionLabelClass } from "../shared/cuentasAntarixStyles";
import { esBloqueada, seccionDe, type CaaSeccionKey } from "../shared/cuentasAntarixFiltros";
import { accountInitial } from "../shared/wialonAccountUtils";
import { CAA_TONE, SECCION_TONE, type CaaSeccionTone } from "../shared/cuentasAntarixTonos";
import type { WialonUserRow } from "../shared/wialonTypes";

/* --------------------------------------------------------------------------
   Listado de cuentas: etiquetas de color (estado, unidades, distribuidor),
   avatar por sección y encabezado de sección.

   Etiquetas suaves: fondo teñido + anillo interior del mismo tono + texto
   oscuro (contraste ≥ 4.5:1 en ambos temas). Tonos con significado:
   verde = activa, rosa = bloqueada, ámbar (marca) = sin unidades,
   azul = unidades, índigo = distribuidor.
   -------------------------------------------------------------------------- */

const pill =
  "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ring-1 ring-inset [&_svg]:size-3.5 [&_svg]:shrink-0";

/** Estado de la cuenta: «Activa» (verde) o «Bloqueada» (rosa, con fecha debajo si la hay). */
export function CaaEstado({ row, conFecha = true }: { row: WialonUserRow; conFecha?: boolean }) {
  if (esBloqueada(row)) {
    const fecha = row.blocked && row.blocked !== "No" ? row.blocked : "";
    return (
      <span className="inline-flex min-w-0 flex-col items-start gap-1">
        <span className={cn(pill, CAA_TONE.bloqueada)}>
          <Ban aria-hidden />
          Bloqueada
        </span>
        {conFecha && fecha ? <span className="truncate pl-1 text-[11px] tabular-nums text-[#8A8A93] dark:text-[#7F8DAB]">desde {fecha}</span> : null}
      </span>
    );
  }
  return (
    <span className={cn(pill, CAA_TONE.activa)}>
      <CircleCheck aria-hidden />
      Activa
    </span>
  );
}

/** Estado de una unidad: «Activa» (verde) o «Inactiva» (rosa). */
export function CaaUnidadEstado({ activa }: { activa: boolean }) {
  return activa ? (
    <span className={cn(pill, CAA_TONE.activa)}>
      <CircleCheck aria-hidden />
      Activa
    </span>
  ) : (
    <span className={cn(pill, CAA_TONE.bloqueada)}>
      <Ban aria-hidden />
      Inactiva
    </span>
  );
}

/** Unidades asignadas: cifra en azul; «Sin unidades» en ámbar cuando es 0. */
export function CaaUnidades({ n }: { n: number }) {
  if (n === 0) {
    return (
      <span className={cn(pill, CAA_TONE.sinUnidades)}>
        <PackageOpen aria-hidden />
        Sin unidades
      </span>
    );
  }
  return (
    <span className={cn(pill, CAA_TONE.unidades, "tabular-nums")}>
      <Car aria-hidden />
      {n.toLocaleString("es-MX")} {n === 1 ? "unidad" : "unidades"}
    </span>
  );
}

export function CaaDistribuidor() {
  return (
    <span className={cn(pill, CAA_TONE.distribuidor)}>
      <Store aria-hidden />
      Distribuidor
    </span>
  );
}

const AVATAR_TONE: Record<CaaSeccionKey, string> = {
  bloqueadas: "bg-[#FFE4EA] text-[#B4234A] ring-1 ring-inset ring-[#FBCFD9] dark:bg-[#3A0F1C] dark:text-[#FDA4B8] dark:ring-[#6B1E35]",
  sin_unidades: "bg-[#FFF1D6] text-[#8A5D0F] ring-1 ring-inset ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)]",
  con_unidades: "bg-[#17235B] text-[#E6A23C] dark:bg-[#1B2A63]",
};

/** Avatar con la inicial (o candado si está bloqueada), teñido según su sección. */
export function CaaAvatar({ row, className }: { row: WialonUserRow; className?: string }) {
  const key = seccionDe(row);
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-[12px] font-semibold", AVATAR_TONE[key], className)} aria-hidden>
      {key === "bloqueadas" ? <Lock className="size-4" /> : accountInitial(row.name || "")}
    </span>
  );
}

/** Encabezado de sección (tabla y celular): barra de color, título, conteo y descripción. */
export function CaaSeccionHeader({
  seccion,
  tone = SECCION_TONE[seccion.key as CaaSeccionKey],
}: {
  seccion: { key: string; label: string; hint: string; rows: unknown[] };
  tone?: CaaSeccionTone;
}) {
  return (
    <p className="flex items-center gap-2.5 text-[12px]">
      <span className={cn("h-4 w-[3px] shrink-0 rounded-full", tone.bar)} aria-hidden />
      <span className={cn("font-semibold uppercase tracking-[0.1em]", tone.text)}>{seccion.label}</span>
      <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ring-1 ring-inset", tone.count)}>
        {seccion.rows.length}
      </span>
      <span className="hidden truncate text-[#8A8A93] sm:inline dark:text-[#7F8DAB]">{seccion.hint}</span>
    </p>
  );
}

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
