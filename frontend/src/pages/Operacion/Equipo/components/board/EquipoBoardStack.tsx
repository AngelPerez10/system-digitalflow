/**
 * Tablero semanal en pantallas angostas: una tarjeta por técnico con su
 * agenda de la semana (solo los días con trabajo). Cada tarjeta también es
 * zona de soltar (cambia el técnico); en táctil se usan «Mover a…» y
 * «Cambiar día».
 */
import { memo, useMemo, useRef } from "react";
import { useTecnicoDropTarget } from "../../hooks/useTecnicoDropTarget";
import { columnKey } from "../../shared/equipoDnd";
import type { EquipoSeccion } from "../../shared/equipoGrouping";
import { DIAS_LARGOS, diasDeSemana, parseYmd, tarjetasPorDia } from "../../shared/equipoSemana";
import { EquipoJobCard } from "./EquipoJobCard";
import { EquipoTecnicoLabel } from "./EquipoTecnicoLabel";
import { cargaDe, conteoFila, type EquipoBoardProps, type EquipoBoardRowCommon } from "./equipoBoardShared";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const StackCard = memo(function StackCard({ seccion, index, maxAbiertos, ...c }: EquipoBoardRowCommon & { seccion: EquipoSeccion; index: number; maxAbiertos: number }) {
  const ref = useRef<HTMLElement | null>(null);
  const key = columnKey(seccion.tecnico.id);
  useTecnicoDropTarget(ref, key, c.onOverChange);

  const dias = useMemo(() => tarjetasPorDia(seccion, c.lunes), [seccion, c.lunes]);
  const { trabajos, abiertos } = conteoFila(dias);
  const fechas = useMemo(() => diasDeSemana(c.lunes), [c.lunes]);
  const isOver = c.overKey === key;
  const accepts = c.dragFromKey != null && c.dragFromKey !== key;
  const sin = seccion.tecnico.id == null;

  return (
    <section
      ref={ref}
      aria-label={seccion.tecnico.nombre}
      className={`cot-rise overflow-hidden rounded-[16px] border bg-white transition-[border-color,box-shadow] duration-150 dark:bg-[#111827] ${
        isOver
          ? "border-[#1B5CFF] shadow-[0_0_0_3px_rgba(27,92,255,0.15)] dark:border-[#4B7CFF]"
          : accepts
            ? "border-dashed border-[#BFD3FF] dark:border-[#2C3F7A]"
            : "border-[#E4E4E7] dark:border-[#273244]"
      }`}
      style={{ ["--cot-i" as string]: Math.min(index, 8) }}
    >
      <header className={`px-4 py-3 ${trabajos > 0 ? "border-b border-[#EDEDF0] dark:border-[#1F2A3C]" : ""} ${sin ? "bg-[#FFFAF1] dark:bg-[rgba(230,162,60,0.07)]" : ""}`}>
        <EquipoTecnicoLabel seccion={seccion} trabajos={trabajos} abiertos={abiertos} carga={sin ? null : cargaDe(abiertos, maxAbiertos)} isOver={isOver} />
      </header>
      {trabajos > 0 ? (
        <ol className="divide-y divide-[#F2F2F4] dark:divide-[#1B2436]">
          {dias.map((tarjetas, i) => {
            if (!tarjetas.length) return null;
            const d = parseYmd(fechas[i]);
            const esHoy = fechas[i] === c.hoy;
            return (
              <li key={i} className="px-3 py-2.5">
                <p className={`mb-2 flex items-center gap-1.5 px-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] ${esHoy ? "text-[#1B5CFF] dark:text-[#9BB6FF]" : "text-[#6E6E77] dark:text-[#8EA0B8]"}`}>
                  {DIAS_LARGOS[i]} {d ? `${d.getDate()} ${MESES[d.getMonth()]}` : ""}
                  {esHoy ? <span className="rounded-full bg-[#1B5CFF] px-1.5 py-px text-[10px] text-white dark:bg-[#4B7CFF]">Hoy</span> : null}
                </p>
                <div className="space-y-1.5">
                  {tarjetas.map((t) => (
                    <EquipoJobCard
                      key={t.uid}
                      tarjeta={t}
                      variant="row"
                      semana={fechas}
                      dragging={c.draggingItemKey === t.key}
                      justMoved={c.justMovedKey === t.key}
                      destinos={c.destinos}
                      handlers={c.handlers}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
});

export function EquipoBoardStack({ secciones, ...c }: Omit<EquipoBoardProps, "porDia">) {
  const maxAbiertos = useMemo(
    () => Math.max(1, ...secciones.filter((s) => s.tecnico.id != null).map((s) => conteoFila(tarjetasPorDia(s, c.lunes)).abiertos)),
    [secciones, c.lunes]
  );
  return (
    <div className="space-y-3">
      {secciones.map((s, i) => (
        <StackCard key={columnKey(s.tecnico.id)} seccion={s} index={i} maxAbiertos={maxAbiertos} {...c} />
      ))}
    </div>
  );
}
