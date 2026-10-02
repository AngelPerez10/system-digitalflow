/**
 * Listado en celular (< md): una tarjeta compacta por contacto; las acciones
 * siempre visibles y con área táctil de 36 px + separación.
 */
import type { CSSProperties } from "react";
import { Phone } from "lucide-react";
import type { Cliente } from "@/types/cliente";
import { contactoPrincipal, telHref, ubicacion } from "../shared/clientesFormat";
import { linkClass, mutedText, strongText } from "../shared/clientesTokens";
import type { ClienteRowHandlers } from "./ClientesTable";
import { ClienteAvatar, RowActions, TipoBadge } from "./ClientesUi";

export function ClientesMobileList({ rows, handlers }: { rows: Cliente[]; handlers: ClienteRowHandlers }) {
  const listKey = rows.map((r) => r.id).join(",");
  return (
    <ul key={listKey} className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" aria-label="Contactos de negocio">
      {rows.map((cliente, i) => {
        const tel = telHref(cliente.telefono);
        const lugar = ubicacion(cliente);
        const { nombre: contacto } = contactoPrincipal(cliente);
        return (
          <li key={cliente.id} className={`cl-row cl-row-in flex gap-3 px-4 py-4 ${handlers.highlightId === cliente.id ? "cl-saved" : ""}`} style={{ "--cl-i": i } as CSSProperties}>
            <ClienteAvatar nombre={cliente.nombre} tipo={cliente.tipo} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`truncate text-[15px] font-semibold tracking-[-0.1px] ${strongText}`}>{cliente.nombre}</p>
                  <div className="mt-1">
                    <TipoBadge tipo={cliente.tipo} />
                  </div>
                </div>
                <RowActions
                  nombre={cliente.nombre}
                  canEdit={handlers.canEdit}
                  canDelete={handlers.canDelete}
                  onEdit={() => handlers.onEdit(cliente)}
                  onDelete={() => handlers.onDelete(cliente)}
                />
              </div>
              <dl className={`mt-2 space-y-1 text-[13px] ${mutedText}`}>
                {contacto ? (
                  <div className="flex gap-1.5">
                    <dt className="sr-only">Contacto</dt>
                    <dd className="truncate">{contacto}</dd>
                  </div>
                ) : null}
                <div className="flex gap-1.5">
                  <dt className="sr-only">Ubicación</dt>
                  <dd className="truncate">{lugar || "Sin ubicación"}</dd>
                </div>
              </dl>
              {tel ? (
                <a href={tel} className={`mt-2 inline-flex min-h-9 items-center gap-1.5 text-[13.5px] tabular-nums ${linkClass}`}>
                  <Phone className="size-3.5" aria-hidden />
                  {cliente.telefono}
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
