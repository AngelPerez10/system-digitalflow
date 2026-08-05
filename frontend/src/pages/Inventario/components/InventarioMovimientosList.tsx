import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  erpSecondaryBtnClass,
  erpTableRowHoverClass,
} from "../../Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import { erpTableHeaderClass, erpTableWrapClass } from "@/layout/erpPageStyles";
import type { InventarioItem, InventarioMovimiento } from "../shared/inventarioTypes";

function formatFecha(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function tipoLabel(tipo: InventarioMovimiento["tipo"]): string {
  return tipo === "entrada" ? "Entrada" : "Salida";
}

type InventarioMovimientosListProps = {
  movimientos: InventarioMovimiento[];
  itemsById: Map<number, InventarioItem>;
  loading: boolean;
  filterItem: InventarioItem | null;
  onClearFilter: () => void;
};

export default function InventarioMovimientosList({
  movimientos,
  itemsById,
  loading,
  filterItem,
  onClearFilter,
}: InventarioMovimientosListProps) {
  return (
    <div className="space-y-3">
      {filterItem ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#57534e] dark:text-[#b7c1d1]">
          <span>
            Filtrando por:{" "}
            <strong className="text-[#1c1917] dark:text-[#f8fafc]">
              {filterItem.nombre || filterItem.codigo_barras}
            </strong>
          </span>
          <button type="button" className={erpSecondaryBtnClass} onClick={onClearFilter}>
            Ver todos
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
          Últimos movimientos registrados. Haz clic en un código de la tabla para filtrar.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[#57534e] dark:text-[#b7c1d1]" role="status" aria-live="polite">
          Cargando historial…
        </p>
      ) : movimientos.length === 0 ? (
        <p className="text-sm text-[#57534e] dark:text-[#b7c1d1]">
          {filterItem ? "Este ítem aún no tiene movimientos." : "Aún no hay movimientos registrados."}
        </p>
      ) : (
        <div className={erpTableWrapClass}>
          <Table>
            <TableHeader className={erpTableHeaderClass}>
              <TableRow>
                <TableCell isHeader>Fecha</TableCell>
                <TableCell isHeader>Tipo</TableCell>
                <TableCell isHeader>Ítem</TableCell>
                <TableCell isHeader>Cantidad</TableCell>
                <TableCell isHeader>Nota</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.map((mov) => {
                const item = itemsById.get(mov.item);
                const itemLabel = item
                  ? item.nombre || item.codigo_barras
                  : `#${mov.item}`;
                return (
                  <TableRow key={mov.id} className={erpTableRowHoverClass}>
                    <TableCell>{formatFecha(mov.creado_en)}</TableCell>
                    <TableCell>{tipoLabel(mov.tipo)}</TableCell>
                    <TableCell>{itemLabel}</TableCell>
                    <TableCell>{mov.cantidad}</TableCell>
                    <TableCell>{mov.nota?.trim() || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
