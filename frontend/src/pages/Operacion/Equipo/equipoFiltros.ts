/**
 * Filtros del listado Equipo (tipo, estado, búsqueda, orden) — lógica pura.
 */
import type { Orden } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { displayOrdenFolio } from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { proyectoMatchesSearch } from "../Proyectos/shared/proyectoListUtils";
import type { ProyectoRow } from "../Proyectos/shared/proyectoTypes";
import { ordenAbierta, proyectoActivo, type EquipoSeccion } from "./equipoGrouping";

export type EquipoTipoFiltro = "todo" | "ordenes" | "proyectos";
export type EquipoEstadoFiltro = "abiertos" | "todos";
export type EquipoOrden = "recientes" | "cliente";

export type EquipoFiltros = {
  q: string;
  tipo: EquipoTipoFiltro;
  estado: EquipoEstadoFiltro;
  orden: EquipoOrden;
};

export const EQUIPO_FILTROS_DEFAULT: EquipoFiltros = { q: "", tipo: "todo", estado: "abiertos", orden: "recientes" };

function ordenCoincide(o: Orden, q: string): boolean {
  return displayOrdenFolio(o).toLowerCase().includes(q) || String(o.cliente || "").toLowerCase().includes(q);
}

const porCliente = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

/**
 * Aplica los filtros a cada sección. Con búsqueda, si el nombre del técnico
 * coincide se ven todas sus filas; si no, solo las que coinciden por folio o
 * cliente. Las secciones quedan aunque se vacíen (el riel sigue mostrándolas).
 */
export function filtrarSeccionesEquipo(secciones: EquipoSeccion[], f: EquipoFiltros): EquipoSeccion[] {
  const q = f.q.trim().toLowerCase();
  const soloAbiertos = f.estado === "abiertos";
  return secciones.map((s) => {
    const nombreCoincide = !q || s.tecnico.nombre.toLowerCase().includes(q);
    let ordenes =
      f.tipo === "proyectos"
        ? []
        : s.ordenes.filter((o) => (!soloAbiertos || ordenAbierta(o)) && (nombreCoincide || ordenCoincide(o, q)));
    let proyectos =
      f.tipo === "ordenes"
        ? []
        : s.proyectos.filter((r: ProyectoRow) => (!soloAbiertos || proyectoActivo(r)) && (nombreCoincide || proyectoMatchesSearch(r, q)));
    if (f.orden === "cliente") {
      ordenes = [...ordenes].sort((a, b) => porCliente(a.cliente || "", b.cliente || ""));
      proyectos = [...proyectos].sort((a, b) => porCliente(a.cliente || "", b.cliente || ""));
    }
    return { ...s, ordenes, proyectos };
  });
}
