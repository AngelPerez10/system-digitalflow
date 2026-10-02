/**
 * Piezas pequeñas compartidas por la tabla (escritorio) y la lista (celular).
 */
import type { ReactNode } from "react";
import { CloudOff, Pencil, SearchX, Trash2, UserPlus, Users } from "lucide-react";
import type { ClienteTipo } from "@/components/clientes";
import { initialsFromName, tipoLabel } from "../shared/clientesFormat";
import { focusRing, iconBtnClass, iconDangerBtnClass, mutedText, strongText, tipoTone } from "../shared/clientesTokens";

export function ClienteAvatar({ nombre, tipo, size = "md" }: { nombre: string; tipo?: ClienteTipo; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "size-8 text-[11px]" : "size-10 text-[12.5px]";
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-[0.02em] ${dims} ${tipoTone(tipo).avatar}`}
      aria-hidden
    >
      {initialsFromName(nombre)}
    </span>
  );
}

export function TipoBadge({ tipo }: { tipo?: ClienteTipo }) {
  const tone = tipoTone(tipo);
  return (
    <span className={`inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-medium ${tone.badge}`}>
      <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {tipoLabel(tipo)}
    </span>
  );
}

export function RowActions({
  nombre,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  nombre: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!canEdit && !canDelete) return null;
  return (
    <div className="cl-row-actions inline-flex items-center gap-0.5">
      {canEdit ? (
        <button type="button" onClick={onEdit} className={iconBtnClass} aria-label={`Editar ${nombre}`} title="Editar">
          <Pencil className="size-4" aria-hidden />
        </button>
      ) : null}
      {canDelete ? (
        <button type="button" onClick={onDelete} className={iconDangerBtnClass} aria-label={`Eliminar ${nombre}`} title="Eliminar">
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

const stateBtnClass = `cot-press mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[14px] font-medium text-[#09090B] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:bg-[#243048] ${focusRing}`;

function StateBlock({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children?: ReactNode }) {
  return (
    <div className="cot-fade flex flex-col items-center px-6 py-16 text-center sm:py-20">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-[14px] border border-[#EDEDF0] bg-[#FAFAFB] text-[#A1A1AA] dark:border-[#1F2A3C] dark:bg-white/[0.04] dark:text-[#64748B]">
        {icon}
      </span>
      <p className={`text-[15px] font-semibold ${strongText}`}>{title}</p>
      <p className={`mt-1 max-w-sm text-[13.5px] leading-5 ${mutedText}`}>{hint}</p>
      {children}
    </div>
  );
}

export function ClientesEmptyState({
  filtered,
  canCreate,
  onClearFilters,
  onCreate,
}: {
  filtered: boolean;
  canCreate: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  if (filtered) {
    return (
      <StateBlock
        icon={<SearchX className="size-5" aria-hidden />}
        title="Sin resultados"
        hint="Ningún contacto coincide con la búsqueda o los filtros. Prueba con otro término o quita los filtros."
      >
        <button type="button" onClick={onClearFilters} className={stateBtnClass}>
          Quitar búsqueda y filtros
        </button>
      </StateBlock>
    );
  }
  return (
    <StateBlock
      icon={<Users className="size-5" aria-hidden />}
      title="Aún no hay contactos"
      hint="Registra empresas, personas físicas y proveedores para usarlos en cotizaciones, órdenes y facturas."
    >
      {canCreate ? (
        <button type="button" onClick={onCreate} className={stateBtnClass}>
          <UserPlus className="size-4" aria-hidden />
          Registrar el primero
        </button>
      ) : null}
    </StateBlock>
  );
}

export function ClientesErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <StateBlock icon={<CloudOff className="size-5" aria-hidden />} title="No se pudo cargar" hint={message}>
        <button type="button" onClick={onRetry} className={stateBtnClass}>
          Reintentar
        </button>
      </StateBlock>
    </div>
  );
}

/** Reserva la misma altura que los renglones reales (sin salto al llegar los datos). */
export function ClientesListSkeleton({ rows = 8 }: { rows?: number }) {
  const bar = "cl-skeleton rounded-full bg-[#F1F1F3] dark:bg-white/[0.06]";
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando contactos…</span>
      <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex h-[68px] items-center gap-3 px-4 sm:px-6">
            <span className={`size-10 shrink-0 ${bar}`} />
            <div className="min-w-0 flex-1 space-y-2">
              <span className={`block h-3 w-[38%] ${bar}`} />
              <span className={`block h-2.5 w-[22%] ${bar}`} />
            </div>
            <span className={`hidden h-3 w-24 md:block ${bar}`} />
            <span className={`hidden h-3 w-32 lg:block ${bar}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
