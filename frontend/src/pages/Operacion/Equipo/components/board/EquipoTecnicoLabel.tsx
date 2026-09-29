/** Identidad de un técnico en el tablero: foto, nombre, carga y aviso al soltar. */
import { ArrowDownToLine } from "lucide-react";
import type { EquipoSeccion } from "../../shared/equipoGrouping";
import { EquipoAvatar } from "../EquipoUi";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function EquipoTecnicoLabel({
  seccion,
  trabajos,
  abiertos,
  carga,
  isOver,
}: {
  seccion: EquipoSeccion;
  trabajos: number;
  abiertos: number;
  /** 0–1 respecto al técnico con más abiertos (`null` = no aplica). */
  carga: number | null;
  isOver: boolean;
}) {
  const { tecnico } = seccion;
  const sin = tecnico.id == null;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative shrink-0">
        <EquipoAvatar id={tecnico.id} nombre={tecnico.nombre} avatarUrl={tecnico.avatarUrl} size="md" />
        {/* Estado de carga solo si tiene trabajo (azul / ámbar cargado); sin trabajo lo dice el texto. */}
        {carga != null && abiertos > 0 ? (
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white dark:ring-[#111827] ${
              carga >= 0.85 ? "bg-[#D08A1E] dark:bg-[#E6A23C]" : "bg-[#1B5CFF] dark:bg-[#4B7CFF]"
            }`}
            title={carga >= 0.85 ? "Carga alta" : "Con trabajo"}
            aria-hidden
          />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13.5px] font-semibold tracking-[-0.1px] ${sin ? "text-[#8A5D0F] dark:text-[#F2C27A]" : "text-[#09090B] dark:text-[#F8FAFC]"}`} title={tecnico.nombre}>
          {tecnico.nombre}
        </p>
        {isOver ? (
          <p className="cot-pop mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#1B5CFF] px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-[#4B7CFF]">
            <ArrowDownToLine className="size-3" aria-hidden />
            {sin ? "Quitar técnico" : "Asignar aquí"}
          </p>
        ) : (
          <p className="truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
            {trabajos === 0 ? (sin ? "Todo asignado" : "Sin trabajos") : `${plural(trabajos, "trabajo", "trabajos")} · ${plural(abiertos, "abierto", "abiertos")}`}
          </p>
        )}
        {carga != null && !isOver && trabajos > 0 ? (
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[#EDEDF0] dark:bg-[#1F2A3C]" aria-hidden>
            <span
              className={`cot-bar block h-full w-full rounded-full ${carga >= 0.85 ? "bg-[#D08A1E] dark:bg-[#E6A23C]" : "bg-[#1B5CFF] dark:bg-[#4B7CFF]"}`}
              style={{ transform: `scaleX(${carga})` }}
            />
          </span>
        ) : null}
      </div>
    </div>
  );
}
