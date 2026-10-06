import { ESTADO_TONO } from "../shared/polizaStyles";
import { estadoPolizaLabel } from "./polizaEstado";
import type { PolizaEstado } from "./polizaListTypes";

export default function EstadoPolizaBadge({ estado }: { estado: PolizaEstado }) {
  const tono = ESTADO_TONO[estado];
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${tono.badge}`}
    >
      <span className={`size-1.5 rounded-full ${tono.dot}`} aria-hidden />
      {estadoPolizaLabel(estado)}
    </span>
  );
}
