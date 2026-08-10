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
import InventarioSeccionBadge from "./InventarioSeccionBadge";
import InventarioThumb from "./InventarioThumb";
import { BarcodeIcon, LinkIcon } from "./inventarioIcons";

function fuenteLabel(fuente: InventarioFuente): string {
  if (fuente === "syscom") return "SYSCOM";
  if (fuente === "tvc") return "TVC";
  return "Sin catálogo";
}

/** Nombre del proveedor de Contactos, o SYSCOM/TVC si solo hay vínculo de catálogo. */
function proveedorVisible(item: InventarioItem): string {
  const nombre = (item.proveedor_nombre ?? "").trim();
  if (nombre) return nombre;
  if (item.fuente === "syscom" || item.fuente === "tvc") return fuenteLabel(item.fuente);
  return "";
}

function formatoPrecio(valor: string | number | null | undefined): string {
  if (valor == null || valor === "") return "";
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n)) return String(valor);
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

const thClass = "whitespace-nowrap px-2 py-2.5 text-gray-700 dark:text-gray-300";
const tdMuted = "text-gray-500 dark:text-gray-400";

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
        formatPrecio={formatoPrecio}
        onSelectItem={onSelectItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* min-width fijo: sin sm:min-w-0, para que Folio/Precio no se aplasten fuera de vista */}
      <div className={"hidden md:block " + erpTableWrapClass} tabIndex={0} aria-label="Tabla de ítems; desplaza horizontalmente si hace falta">
        <Table className="w-full min-w-[1120px] table-fixed">
          <TableHeader className={erpTableHeaderClass + " sticky top-0 z-10"}>
            <TableRow>
              <TableCell isHeader scope="col" className={`w-[28%] min-w-[220px] text-left ${thClass}`}>
                Producto
              </TableCell>
              <TableCell isHeader scope="col" className={`w-[12%] min-w-[100px] text-left ${thClass}`}>
                Marca
              </TableCell>
              <TableCell isHeader scope="col" className={`w-[12%] min-w-[110px] text-left ${thClass}`}>
                Modelo
              </TableCell>
              <TableCell isHeader scope="col" className={`w-[88px] text-center ${thClass}`}>
                Existencia
              </TableCell>
              <TableCell isHeader scope="col" className={`w-[120px] text-right ${thClass}`}>
                Precio
              </TableCell>
              <TableCell isHeader scope="col" className={`w-[140px] text-left ${thClass}`}>
                Folio
              </TableCell>
              <TableCell isHeader scope="col" className={`w-[110px] text-center ${thClass}`}>
                Proveedor
              </TableCell>
              <TableCell isHeader scope="col" className={`w-[100px] text-center ${thClass}`}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#f1e8db] text-[11px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb] sm:text-[12px]">
            {items.map((item) => {
              const selected = selectedItemId === item.id;
              const identificado = (item.nombre ?? "").trim().length > 0;
              const nombreVisible = identificado ? item.nombre : "Producto sin identificar";
              const proveedor = proveedorVisible(item);
              const proveedorFuente: InventarioFuente =
                item.fuente === "syscom" || item.fuente === "tvc" ? item.fuente : "desconocido";
              const folio = (item.folio_factura ?? "").trim();
              const precioTxt = formatoPrecio(item.precio_unitario);
              return (
                <TableRow
                  key={item.id}
                  className={`${erpTableRowHoverClass} ${selected ? "bg-[#fff4eb]/80 dark:bg-[#fb923c]/10" : ""}`}
                >
                  <TableCell className="px-2 py-2.5 align-top">
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
                        <span className="mt-1.5 block">
                          <InventarioSeccionBadge seccion={item.seccion} compact />
                        </span>
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 align-top">
                    <span className="block truncate" title={item.marca || undefined}>
                      {item.marca || <span className={tdMuted}>—</span>}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 align-top">
                    <span className="block truncate font-mono" title={item.modelo || undefined}>
                      {item.modelo || <span className={`font-sans ${tdMuted}`}>—</span>}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-center align-middle">
                    <span className={existenciaBadgeClass(item.cantidad)}>{item.cantidad}</span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-right align-middle">
                    {precioTxt ? (
                      <span
                        className="inline-block font-semibold tabular-nums tracking-tight text-[#1c1917] dark:text-[#f8fafc]"
                        title={`Precio unitario ${precioTxt}`}
                      >
                        {precioTxt}
                      </span>
                    ) : (
                      <span className={tdMuted}>—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2.5 align-middle">
                    {folio ? (
                      <span
                        className="inline-flex max-w-full items-center truncate rounded-md border border-[#e7ded0] bg-[#fcfaf6] px-2 py-1 font-mono text-[11px] font-medium text-[#44403c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]"
                        title={`Folio de factura ${folio}`}
                      >
                        {folio}
                      </span>
                    ) : (
                      <span className={tdMuted}>—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-center align-middle">
                    {proveedor ? (
                      <span className={fuenteBadgeClass(proveedorFuente)} title={proveedor}>
                        {proveedor}
                      </span>
                    ) : (
                      <span className={tdMuted}>—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-center align-middle">
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
                      <span className={`text-[11px] ${tdMuted}`}>—</span>
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
