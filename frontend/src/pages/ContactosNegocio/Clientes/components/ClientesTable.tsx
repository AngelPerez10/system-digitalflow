/**
 * Listado en escritorio (≥ md): tabla semántica con encabezado fijo,
 * orden por nombre desde la cabecera (`aria-sort`) y acciones por fila.
 */
import type { CSSProperties } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Cliente } from "@/types/cliente";
import type { ClientesOrden } from "../shared/clientesListQuery";
import { focusRing, strongText } from "../shared/clientesTokens";
import { ContactoCell, TelefonoCell, UbicacionCell } from "./ClienteCells";
import { ClienteAvatar, RowActions, TipoBadge } from "./ClientesUi";

export type ClienteRowHandlers = {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (cliente: Cliente) => void;
  onDelete: (cliente: Cliente) => void;
  /** Renglón recién guardado (se resalta un momento). */
  highlightId?: number | null;
};

const thClass = "px-4 py-3 text-left text-[12px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]";

function NombreHeader({ orden, onSort }: { orden: ClientesOrden; onSort: (orden: ClientesOrden) => void }) {
  const dir = orden === "nombre" ? "ascending" : orden === "-nombre" ? "descending" : "none";
  const Icon = dir === "ascending" ? ArrowUp : dir === "descending" ? ArrowDown : ArrowUpDown;
  return (
    <th scope="col" aria-sort={dir} className={`${thClass} pl-6`}>
      <button
        type="button"
        onClick={() => onSort(dir === "ascending" ? "-nombre" : "nombre")}
        className={`-mx-1.5 inline-flex items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 hover:text-[#09090B] dark:hover:text-[#F8FAFC] ${focusRing} ${dir !== "none" ? strongText : ""}`}
      >
        Nombre
        <Icon className={`size-3.5 ${dir === "none" ? "opacity-50" : ""}`} aria-hidden />
        <span className="sr-only">
          {dir === "ascending" ? ", orden A a Z. Activar para Z a A" : ", activar para ordenar de A a Z"}
        </span>
      </button>
    </th>
  );
}

export function ClientesTable({
  rows,
  orden,
  onSort,
  handlers,
}: {
  rows: Cliente[];
  orden: ClientesOrden;
  onSort: (orden: ClientesOrden) => void;
  handlers: ClienteRowHandlers;
}) {
  const showActions = handlers.canEdit || handlers.canDelete;
  // Cambia solo cuando llegan otros registros: así la entrada no se repite al editar uno.
  const bodyKey = rows.map((r) => r.id).join(",");

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] table-fixed border-collapse">
        <caption className="sr-only">Contactos de negocio</caption>
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[15%]" />
          <col className="w-[23%]" />
          <col className="w-[20%]" />
          {showActions ? <col className="w-[8%]" /> : null}
        </colgroup>
        <thead className="border-b border-[#EDEDF0] bg-[#FAFAFB] dark:border-[#1F2A3C] dark:bg-[#0F1626]">
          <tr>
            <NombreHeader orden={orden} onSort={onSort} />
            <th scope="col" className={thClass}>
              Teléfono
            </th>
            <th scope="col" className={thClass}>
              Contacto
            </th>
            <th scope="col" className={thClass}>
              Ubicación
            </th>
            {showActions ? (
              <th scope="col" className={`${thClass} pr-6 text-right`}>
                <span className="sr-only">Acciones</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody key={bodyKey} className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
          {rows.map((cliente, i) => (
            <tr
              key={cliente.id}
              className={`cl-row cl-row-in transition-colors duration-150 hover:bg-[#FAFAFB] dark:hover:bg-white/[0.025] ${handlers.highlightId === cliente.id ? "cl-saved" : ""}`}
              style={{ "--cl-i": i } as CSSProperties}
            >
              <th scope="row" className="py-3 pl-6 pr-4 text-left font-normal">
                <div className="flex min-w-0 items-center gap-3">
                  <ClienteAvatar nombre={cliente.nombre} tipo={cliente.tipo} />
                  <div className="min-w-0">
                    <p className={`truncate text-[14px] font-semibold tracking-[-0.1px] ${strongText}`} title={cliente.nombre}>
                      {cliente.nombre}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <TipoBadge tipo={cliente.tipo} />
                      {cliente.is_prospecto ? (
                        <span className="text-[11px] font-medium text-[#8A5D0F] dark:text-[#F0B860]">Prospecto</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </th>
              <td className="px-4 py-3">
                <TelefonoCell telefono={cliente.telefono} />
              </td>
              <td className="px-4 py-3">
                <ContactoCell cliente={cliente} />
              </td>
              <td className="px-4 py-3">
                <UbicacionCell cliente={cliente} />
              </td>
              {showActions ? (
                <td className="py-3 pl-2 pr-5 text-right">
                  <RowActions
                    nombre={cliente.nombre}
                    canEdit={handlers.canEdit}
                    canDelete={handlers.canDelete}
                    onEdit={() => handlers.onEdit(cliente)}
                    onDelete={() => handlers.onDelete(cliente)}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
