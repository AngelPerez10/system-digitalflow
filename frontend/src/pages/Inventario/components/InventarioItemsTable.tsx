import { PencilIcon, TrashBinIcon } from "@/icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { erpTableHeaderClass, erpTableWrapClass } from "@/layout/erpPageStyles";
import {
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpTableRowHoverClass,
} from "../../Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import {
  existenciaBadgeClass,
  fuenteBadgeClass,
  inventarioEmptyPanelClass,
} from "../shared/inventarioStyles";
import type { InventarioFuente, InventarioItem } from "../shared/inventarioTypes";
import InventarioItemsMobileList from "./InventarioItemsMobileList";
import InventarioThumb from "./InventarioThumb";
import { BarcodeIcon, LinkIcon } from "./inventarioIcons";

function fuenteLabel(fuente: InventarioFuente): string {
  if (fuente === "syscom") return "SYSCOM";
  if (fuente === "tvc") return "TVC";
  return "Sin catálogo";
}

/** Nombre del proveedor de Contactos, o SYSCOM/TVC si solo hay vínculo de catálogo. */
function proveedorVisible(item: InventarioItem): string {
  const nombre = item.proveedor_nombre.trim();
  if (nombre) return nombre;
  if (item.fuente === "syscom" || item.fuente === "tvc") return fuenteLabel(item.fuente);
  return "";
}

function formatoPrecio(valor: string | null): string {
  if (valor == null || valor === "") return "";
  const n = Number(valor);
  if (!Number.isFinite(n)) return valor;
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

type InventarioItemsTableProps = {
  items: InventarioItem[];
  loading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  selectedItemId: number | null;
  onSelectItem: (item: InventarioItem | null) => void;
  onEdit: (item: InventarioItem) => void;
  onDelete: (item: InventarioItem) => void;
};

export default function InventarioItemsTable({
  items,
  loading,
  canEdit,
  canDelete,
  selectedItemId,
  onSelectItem,
  onEdit,
  onDelete,
}: InventarioItemsTableProps) {
  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-[#57534e] dark:text-[#b7c1d1]" role="status" aria-live="polite">
        Cargando ítems…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className={inventarioEmptyPanelClass}>
        <span
          className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff801f]/15 text-[#9a3412] dark:bg-[#fb923c]/15 dark:text-[#fdba74]"
          aria-hidden="true"
        >
          <BarcodeIcon className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
          Todavía no hay nada en inventario
        </p>
        <p className="mt-1 text-sm text-[#57534e] dark:text-[#b7c1d1]">
          Escanea un código en modo Entrada para dar de alta el primer ítem.
        </p>
      </div>
    );
  }

  return (
    <>
      <InventarioItemsMobileList
        items={items}
        canEdit={canEdit}
        canDelete={canDelete}
        selectedItemId={selectedItemId}
        proveedorLabel={proveedorVisible}
        onSelectItem={onSelectItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <div className={"hidden md:block " + erpTableWrapClass}>
        <Table className="w-full min-w-[1080px] table-fixed sm:min-w-0 xl:min-w-full">
          <TableHeader className={erpTableHeaderClass + " sticky top-0 z-10"}>
            <TableRow>
              <TableCell isHeader scope="col" className="w-2/5 min-w-[260px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                Producto
              </TableCell>
              <TableCell isHeader scope="col" className="w-[140px] min-w-[120px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                Marca
              </TableCell>
              <TableCell isHeader scope="col" className="w-[170px] min-w-[150px] px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                Modelo
              </TableCell>
              <TableCell isHeader scope="col" className="w-[110px] min-w-[100px] whitespace-nowrap px-2 py-2 text-center text-gray-700 dark:text-gray-300">
                Existencia
              </TableCell>
              <TableCell isHeader scope="col" className="w-[120px] min-w-[110px] whitespace-nowrap px-2 py-2 text-center text-gray-700 dark:text-gray-300">
                Proveedor
              </TableCell>
              <TableCell isHeader scope="col" className="w-[130px] min-w-[120px] whitespace-nowrap px-2 py-2 text-left text-gray-700 dark:text-gray-300">
                Folio
              </TableCell>
              <TableCell isHeader scope="col" className="w-[100px] min-w-[90px] whitespace-nowrap px-2 py-2 text-right text-gray-700 dark:text-gray-300">
                Precio
              </TableCell>
              <TableCell isHeader scope="col" className="w-[120px] min-w-[110px] whitespace-nowrap px-2 py-2 text-center text-gray-700 dark:text-gray-300">
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#f1e8db] text-[11px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb] sm:text-[12px]">
            {items.map((item) => {
              const selected = selectedItemId === item.id;
              const identificado = item.nombre.trim().length > 0;
              const nombreVisible = identificado ? item.nombre : "Producto sin identificar";
              const proveedor = proveedorVisible(item);
              const proveedorFuente: InventarioFuente =
                item.fuente === "syscom" || item.fuente === "tvc" ? item.fuente : "desconocido";
              return (
                <TableRow
                  key={item.id}
                  className={`${erpTableRowHoverClass} ${selected ? "bg-[#fff4eb]/80 dark:bg-[#fb923c]/10" : ""}`}
                >
                  <TableCell className="px-2 py-2 align-top">
                    <button
                      type="button"
                      className="flex w-full items-start gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40"
                      onClick={() => onSelectItem(selected ? null : item)}
                      aria-pressed={selected}
                      aria-label={`Filtrar historial por ${item.nombre || item.codigo_barras}`}
                    >
                      <InventarioThumb src={item.imagen_url} alt="" size={40} />
                      <span className="min-w-0 flex-1">
                        <span
                          className="line-clamp-2 font-medium leading-snug text-gray-900 dark:text-white sm:text-[12px]"
                          title={nombreVisible}
                        >
                          {nombreVisible}
                        </span>
                        <span className="mt-1 block truncate font-mono text-[11px] tracking-wide text-gray-500 dark:text-gray-400">
                          {item.codigo_barras}
                        </span>
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-top">
                    <span className="block truncate" title={item.marca || undefined}>
                      {item.marca || <span className="text-gray-500 dark:text-gray-400">—</span>}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-top">
                    <span className="block truncate font-mono" title={item.modelo || undefined}>
                      {item.modelo || <span className="font-sans text-gray-500 dark:text-gray-400">—</span>}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2 text-center align-middle">
                    <span className={existenciaBadgeClass(item.cantidad)}>{item.cantidad}</span>
                  </TableCell>
                  <TableCell className="px-2 py-2 text-center align-middle">
                    {proveedor ? (
                      <span className={fuenteBadgeClass(proveedorFuente)} title={proveedor}>
                        {proveedor}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2 align-top">
                    <span className="block truncate font-mono" title={item.folio_factura || undefined}>
                      {item.folio_factura || (
                        <span className="font-sans text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2 text-right align-middle tabular-nums">
                    {item.precio_unitario != null && item.precio_unitario !== "" ? (
                      formatoPrecio(item.precio_unitario)
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2 text-center align-middle">
                    {canEdit || canDelete ? (
                      <div className={erpRowActionBarClass}>
                        {canEdit ? (
                          <button
                            type="button"
                            className={erpRowActionBtnClass}
                            onClick={() => onEdit(item)}
                            aria-label={
                              identificado
                                ? `Editar ficha de ${item.nombre}`
                                : `Vincular ${item.codigo_barras} con un producto del catálogo`
                            }
                            title={identificado ? "Editar" : "Vincular"}
                          >
                            {identificado ? (
                              <PencilIcon className="h-4 w-4" />
                            ) : (
                              <LinkIcon className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className={erpRowActionBtnClass}
                            onClick={() => onDelete(item)}
                            aria-label={`Eliminar ${item.nombre || item.codigo_barras} del inventario`}
                            title="Eliminar"
                          >
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
