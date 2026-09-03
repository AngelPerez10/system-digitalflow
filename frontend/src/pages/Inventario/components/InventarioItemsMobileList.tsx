import { PencilIcon, TrashBinIcon } from "@/icons";
import {
  fuenteBadgeClass,
  inventarioMobileCardClass,
  inventarioMobileCardSelectedClass,
} from "../shared/inventarioStyles";
import type { InventarioFuente, InventarioItem } from "../shared/inventarioTypes";
import InventarioSeccionBadge from "./InventarioSeccionBadge";
import InventarioThumb from "./InventarioThumb";
import { LinkIcon } from "./inventarioIcons";

const mobileActionBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]";

type InventarioItemsMobileListProps = {
  items: InventarioItem[];
  canEdit: boolean;
  canDelete: boolean;
  selectedItemId: number | null;
  proveedorLabel: (item: InventarioItem) => string;
  formatPrecio: (valor: string | number | null | undefined) => string;
  onSelectItem: (item: InventarioItem | null) => void;
  onEdit: (item: InventarioItem) => void;
  onDelete: (item: InventarioItem) => void;
};

function badgeFuente(item: InventarioItem): InventarioFuente {
  if (item.fuente === "syscom" || item.fuente === "tvc") return item.fuente;
  return "desconocido";
}

export default function InventarioItemsMobileList({
  items,
  canEdit,
  canDelete,
  selectedItemId,
  proveedorLabel,
  formatPrecio,
  onSelectItem,
  onEdit,
  onDelete,
}: InventarioItemsMobileListProps) {
  return (
    <ul className="space-y-3 md:hidden" aria-label="Ítems en inventario">
      {items.map((item) => {
        const selected = selectedItemId === item.id;
        const identificado = (item.nombre ?? "").trim().length > 0;
        const detalle = [item.marca, item.modelo].filter(Boolean).join(" · ");
        const proveedor = proveedorLabel(item);
        const folio = (item.folio_factura ?? "").trim();
        const precioTxt = formatPrecio(item.precio_unitario);
        return (
          <li key={item.id}>
            <article
              className={`${inventarioMobileCardClass} ${selected ? inventarioMobileCardSelectedClass : ""}`}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 rounded-[12px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)]"
                onClick={() => onSelectItem(selected ? null : item)}
                aria-pressed={selected}
                aria-label={`Filtrar historial por ${item.nombre || item.codigo_barras}`}
              >
                <InventarioThumb src={item.imagen_url} alt="" size={52} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                    {identificado ? item.nombre : "Producto sin identificar"}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] tracking-wide text-[#6E6E77] dark:text-[#8EA0B8]">
                    {item.codigo_barras}
                  </span>
                  {detalle ? (
                    <span className="mt-0.5 block truncate text-xs text-[#52525B] dark:text-[#B7C1D1]">
                      {detalle}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={`block text-xl font-bold leading-none tracking-[-0.5px] ${
                      item.cantidad > 0
                        ? "text-[#09090B] dark:text-[#F8FAFC]"
                        : "text-[#9A6B15] dark:text-[#E6A23C]"
                    }`}
                  >
                    {item.cantidad}
                  </span>
                  <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                    en piso
                  </span>
                </span>
              </button>

              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-[#EDEDED] pt-3 dark:border-[#273244]">
                <div className="min-w-0 rounded-[10px] bg-[#FAFAFA] px-2.5 py-2 dark:bg-[#1B2539]">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                    Precio
                  </dt>
                  <dd
                    className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${
                      precioTxt
                        ? "text-[#09090B] dark:text-[#F8FAFC]"
                        : "font-normal text-[#A1A1AA] dark:text-[#64748b]"
                    }`}
                  >
                    {precioTxt || "—"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-[10px] bg-[#FAFAFA] px-2.5 py-2 dark:bg-[#1B2539]">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                    Folio
                  </dt>
                  <dd
                    className={`mt-0.5 truncate font-mono text-sm ${
                      folio
                        ? "font-medium text-[#09090B] dark:text-[#F8FAFC]"
                        : "font-sans font-normal text-[#A1A1AA] dark:text-[#64748b]"
                    }`}
                    title={folio || undefined}
                  >
                    {folio || "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <InventarioSeccionBadge seccion={item.seccion} showEmpty compact />
                {proveedor ? (
                  <span className={fuenteBadgeClass(badgeFuente(item))}>{proveedor}</span>
                ) : (
                  <span className="text-[11px] text-[#A1A1AA] dark:text-[#64748b]">Sin proveedor</span>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  {canEdit ? (
                    <button
                      type="button"
                      className={mobileActionBtnClass}
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
                      className={mobileActionBtnClass}
                      onClick={() => onDelete(item)}
                      aria-label={`Eliminar ${item.nombre || item.codigo_barras} del inventario`}
                      title="Eliminar"
                    >
                      <TrashBinIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
