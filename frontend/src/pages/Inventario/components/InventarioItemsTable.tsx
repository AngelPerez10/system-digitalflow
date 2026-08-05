import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon } from "@/icons";
import {
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpTableRowHoverClass,
} from "../../Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import { erpTableHeaderClass, erpTableWrapClass } from "@/layout/erpPageStyles";
import type { InventarioFuente, InventarioItem } from "../shared/inventarioTypes";

function fuenteLabel(fuente: InventarioFuente): string {
  if (fuente === "syscom") return "Syscom";
  if (fuente === "tvc") return "TVC";
  return "Desconocido";
}

type InventarioItemsTableProps = {
  items: InventarioItem[];
  loading: boolean;
  canEdit: boolean;
  selectedItemId: number | null;
  onSelectItem: (item: InventarioItem | null) => void;
  onEdit: (item: InventarioItem) => void;
};

export default function InventarioItemsTable({
  items,
  loading,
  canEdit,
  selectedItemId,
  onSelectItem,
  onEdit,
}: InventarioItemsTableProps) {
  if (loading) {
    return (
      <p className="text-sm text-[#57534e] dark:text-[#b7c1d1]" role="status" aria-live="polite">
        Cargando ítems…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-[#57534e] dark:text-[#b7c1d1]">
        No hay ítems registrados. Escanea un código para dar de alta el primero.
      </p>
    );
  }

  return (
    <div className={erpTableWrapClass}>
      <Table>
        <TableHeader className={erpTableHeaderClass}>
          <TableRow>
            <TableCell isHeader>Código</TableCell>
            <TableCell isHeader>Nombre</TableCell>
            <TableCell isHeader>Marca</TableCell>
            <TableCell isHeader>Modelo</TableCell>
            <TableCell isHeader>Cantidad</TableCell>
            <TableCell isHeader>Fuente</TableCell>
            <TableCell isHeader>
              <span className="sr-only">Acciones</span>
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const selected = selectedItemId === item.id;
            return (
              <TableRow
                key={item.id}
                className={`${erpTableRowHoverClass} ${selected ? "bg-[#fff4eb]/80 dark:bg-[#fb923c]/10" : ""}`}
              >
                <TableCell>
                  <button
                    type="button"
                    className="text-left font-mono text-xs text-[#1c1917] underline-offset-2 hover:underline dark:text-[#f8fafc]"
                    onClick={() => onSelectItem(selected ? null : item)}
                    aria-pressed={selected}
                  >
                    {item.codigo_barras}
                  </button>
                </TableCell>
                <TableCell>{item.nombre || "—"}</TableCell>
                <TableCell>{item.marca || "—"}</TableCell>
                <TableCell>{item.modelo || "—"}</TableCell>
                <TableCell>{item.cantidad}</TableCell>
                <TableCell>{fuenteLabel(item.fuente)}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <div className={erpRowActionBarClass}>
                      <button
                        type="button"
                        className={erpRowActionBtnClass}
                        aria-label={`Editar ${item.nombre || item.codigo_barras}`}
                        onClick={() => onEdit(item)}
                      >
                        <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
