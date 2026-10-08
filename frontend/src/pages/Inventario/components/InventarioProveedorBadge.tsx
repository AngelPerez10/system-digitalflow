/**
 * Píldora de proveedor del listado. Mismo esquema para todos: círculo con
 * monograma o ícono + nombre. Cada proveedor tiene su tono (sin depender solo
 * del color: el monograma y el texto lo identifican).
 *  - Intrax: marino con edificio dorado (marca propia).
 *  - SYSCOM «S» índigo · TVC «T» violeta.
 *  - Otro contacto: iniciales en gris.
 *  - Sin proveedor: borde punteado con caja abierta.
 * Si el proveedor solo sale del catálogo vinculado (no de una factura), lleva
 * un eslabón al final para distinguirlo de una compra real.
 */
import type { ReactNode } from "react";
import { Building2, Link2, PackageOpen } from "lucide-react";
import { proveedorTipo, proveedorVisible, type ProveedorTipo } from "../shared/inventarioProveedor";
import type { InventarioItem } from "../shared/inventarioTypes";

const base =
  "inline-flex max-w-[12.5rem] items-center gap-2 whitespace-nowrap rounded-full py-1 pl-1 pr-3 text-[12.5px] font-semibold leading-5 tracking-[-0.1px]";
const marca = "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold leading-none [&_svg]:size-3";

type Tono = { pill: string; mark: string };

const TONO: Record<Exclude<ProveedorTipo, "ninguno">, Tono> = {
  intrax: {
    pill: "bg-[#17235B] text-white ring-1 ring-inset ring-[#17235B] dark:bg-[#1B2A63] dark:ring-[#2C3F7A]",
    mark: "bg-[#E6A23C] text-[#17235B]",
  },
  syscom: {
    pill: "bg-[#EEF0FA] text-[#2E3A85] ring-1 ring-inset ring-[#D3D8F2] dark:bg-[#1E2550] dark:text-[#C3CBF5] dark:ring-[#2F3A78]",
    mark: "bg-[#4453A8] text-white dark:bg-[#7A8BE6] dark:text-[#111827]",
  },
  tvc: {
    pill: "bg-[#F4EFFE] text-[#5B21B6] ring-1 ring-inset ring-[#E2D6FB] dark:bg-[#2A1650] dark:text-[#D6C5FB] dark:ring-[#44267A]",
    mark: "bg-[#7C3AED] text-white dark:bg-[#A78BFA] dark:text-[#111827]",
  },
  contacto: {
    pill: "bg-[#F4F4F5] text-[#3F3F46] ring-1 ring-inset ring-[#E4E4E7] dark:bg-white/[0.06] dark:text-[#D6DEEA] dark:ring-[#273244]",
    mark: "bg-[#52525B] text-white dark:bg-[#8EA0B8] dark:text-[#111827]",
  },
  sin: {
    pill: "border border-dashed border-[#D3D3D8] bg-white text-[#52525B] dark:border-[#3A4661] dark:bg-transparent dark:text-[#B7C1D1]",
    mark: "bg-[#F4F4F5] text-[#71717A] dark:bg-white/[0.06] dark:text-[#8EA0B8]",
  },
};

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function contenidoMarca(tipo: Exclude<ProveedorTipo, "ninguno">, nombre: string): ReactNode {
  if (tipo === "intrax") return <Building2 strokeWidth={2.4} />;
  if (tipo === "sin") return <PackageOpen strokeWidth={2.2} />;
  if (tipo === "syscom") return "S";
  if (tipo === "tvc") return "T";
  return iniciales(nombre);
}

export default function InventarioProveedorBadge({ item }: { item: InventarioItem }) {
  const tipo = proveedorTipo(item);
  if (tipo === "ninguno") {
    return <span className="text-[12px] text-[#A1A1AA] dark:text-[#64748B]">—</span>;
  }
  const nombre = proveedorVisible(item);
  // SYSCOM/TVC sin contacto asignado: viene del catálogo, no de una compra.
  const soloCatalogo = (tipo === "syscom" || tipo === "tvc") && item.proveedor == null;
  const folio = (item.folio_factura ?? "").trim();
  const titulo =
    tipo === "sin"
      ? "Llegó sin pedido; no se atribuye a ningún proveedor"
      : soloCatalogo
        ? `${nombre} · según el catálogo vinculado (sin factura)`
        : folio
          ? `${nombre} · última factura ${folio}`
          : nombre;
  const tono = TONO[tipo];

  return (
    <span className={`${base} ${tono.pill}`} title={titulo}>
      <span className={`${marca} ${tono.mark}`} aria-hidden>
        {contenidoMarca(tipo, nombre)}
      </span>
      <span className="truncate">{nombre}</span>
      {soloCatalogo ? (
        <>
          <Link2 className="-ml-0.5 size-3.5 shrink-0 opacity-60" aria-hidden />
          <span className="sr-only">(según catálogo)</span>
        </>
      ) : null}
    </span>
  );
}
