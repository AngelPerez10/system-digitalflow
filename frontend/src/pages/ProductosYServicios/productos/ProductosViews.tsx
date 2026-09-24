/**
 * Piezas de la lista de Productos: tarjetas, tabla, esqueletos, vacío y paginación.
 * Presentacionales: reciben datos y callbacks, no consultan nada.
 *
 * Movimiento: entrada escalonada (`cot-rise`) y, al pasar el cursor, la tarjeta
 * se eleva y la foto crece un poco — solo `transform`/`opacity`/sombra.
 */
import { memo, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, ImageOff, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { SyscomProducto } from "../syscomCatalog";
import { STOCK_TOPE, stockDe, stockEsTope, stockTexto } from "./productosFiltros";
import { focusRing, iconBtn } from "./productosStyles";

/* --------------------------------------------------------------------------
   Etiquetas
   -------------------------------------------------------------------------- */

const FUENTE: Record<string, { label: string; cls: string }> = {
  syscom: { label: "SYSCOM", cls: "bg-[rgba(27,92,255,0.08)] text-[#1244D1] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]" },
  tvc: { label: "TVC", cls: "bg-[rgba(4,114,77,0.09)] text-[#04724D] dark:bg-[rgba(74,222,128,0.12)] dark:text-[#4ADE80]" },
  intrax: { label: "Intrax", cls: "bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-white/[0.08] dark:text-[#D6DEEA]" },
  manual: { label: "Manual", cls: "bg-[rgba(230,162,60,0.16)] text-[#8A5D0F] dark:text-[#E6A23C]" },
};

export function FuenteBadge({ fuente }: { fuente?: string | null }) {
  const f = FUENTE[(fuente || "syscom").toLowerCase()] ?? { label: fuente || "—", cls: FUENTE.intrax.cls };
  return (
    <span className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] ${f.cls}`}>
      {f.label}
    </span>
  );
}

export function StockBadge({ p }: { p: Pick<SyscomProducto, "total_existencia" | "fuente" | "precio_bajo_cotizacion"> }) {
  const n = stockDe(p);
  if (n == null) {
    // El proveedor no publica existencia (TVC «Proyecto»): no es «sin stock».
    return p.fuente === "tvc" || p.precio_bajo_cotizacion ? (
      <span
        title="TVC no publica la existencia de este producto; consúltala al cotizar"
        className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-[rgba(230,162,60,0.14)] px-2 text-[10.5px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]"
      >
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        Consultar existencia
      </span>
    ) : null;
  }
  const hay = n > 0;
  const tope = stockEsTope(p);
  return (
    <span
      title={tope ? `El proveedor reporta ${STOCK_TOPE} o más` : undefined}
      className={`inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[10.5px] font-semibold tabular-nums ${
        hay
          ? "bg-[rgba(4,114,77,0.09)] text-[#04724D] dark:bg-[rgba(74,222,128,0.12)] dark:text-[#4ADE80]"
          : "bg-[#F4F4F5] text-[#6E6E77] dark:bg-white/[0.06] dark:text-[#8EA0B8]"
      }`}
    >
      <span className={`size-1.5 rounded-full ${hay ? "bg-current" : "bg-[#A1A1AA]"}`} aria-hidden />
      {hay ? `${stockTexto(p)} en stock` : "Sin stock"}
    </span>
  );
}

export function ProductThumb({ src, alt, className = "" }: { src: string | null | undefined; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" decoding="async" className={`h-full w-full object-contain ${className}`} />
  ) : (
    <span className="flex h-full w-full items-center justify-center text-[#D4D4D8] dark:text-[#3A4661]" aria-hidden>
      <ImageOff className="size-1/3 max-h-8 max-w-8" strokeWidth={1.5} />
    </span>
  );
}

/* --------------------------------------------------------------------------
   Tarjeta
   -------------------------------------------------------------------------- */

export type ProductoAcciones = {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

type CardProps = {
  p: SyscomProducto;
  index: number;
  precio: string;
  imagen: string | null;
  link: string;
  onOpen: (id: string) => void;
} & ProductoAcciones;

function ManualActions({ p, canEdit, canDelete, onEdit, onDelete }: { p: SyscomProducto } & ProductoAcciones) {
  if (!canEdit && !canDelete) return null;
  return (
    <div className="flex items-center gap-1.5">
      {canEdit ? (
        <button type="button" className={iconBtn} onClick={(e) => { e.stopPropagation(); onEdit(p.producto_id); }} aria-label={`Editar ${p.titulo}`} title="Editar">
          <Pencil aria-hidden />
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          className={`${iconBtn} hover:border-[#F6CFCF] hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:hover:border-[#7F1D1D] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171]`}
          onClick={(e) => { e.stopPropagation(); onDelete(p.producto_id); }}
          aria-label={`Eliminar ${p.titulo}`}
          title="Eliminar"
        >
          <Trash2 aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function ProductCardImpl({ p, index, precio, imagen, link, onOpen, ...acciones }: CardProps) {
  const manual = p.fuente === "manual";
  return (
    <article
      className="cot-rise group relative flex flex-col overflow-hidden rounded-[18px] border border-[#E7E7EA] bg-white transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#D3D3D8] hover:shadow-[0_14px_32px_-18px_rgba(9,9,11,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-[#273244] dark:bg-[#151E32] dark:hover:border-[#3A4661]"
      style={{ "--cot-i": Math.min(index, 12) } as CSSProperties}
    >
      <button
        type="button"
        onClick={() => onOpen(p.producto_id)}
        className={`flex flex-1 flex-col text-left ${focusRing} rounded-[18px]`}
        aria-label={`Ver detalle de ${p.titulo}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden border-b border-[#F0F0F2] bg-white p-4 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
          <div className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <ProductThumb src={imagen} alt={p.titulo} />
          </div>
          <div className="absolute left-3 top-3">
            <FuenteBadge fuente={p.fuente} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="truncate text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
            {p.marca || "Sin marca"} · <span className="font-mono">{p.modelo || p.sku || "—"}</span>
          </p>
          <h3 className="line-clamp-2 min-h-[2.6em] text-[14px] font-medium leading-[1.3] text-[#09090B] dark:text-[#F8FAFC]">{p.titulo}</h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="min-w-0">
              <p
                className={`font-semibold tabular-nums tracking-[-0.4px] ${
                  p.precio_bajo_cotizacion ? "text-[15px] text-[#8A5D0F] dark:text-[#E6A23C]" : "text-[18px] text-[#09090B] dark:text-[#F8FAFC]"
                }`}
              >
                {precio}
              </p>
              <p className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
                {p.precio_bajo_cotizacion ? "Producto de proyecto" : "Precio público con IVA"}
              </p>
            </div>
            <StockBadge p={p} />
          </div>
        </div>
      </button>
      <div className="flex min-h-12 items-center justify-between gap-2 border-t border-[#F0F0F2] px-4 py-2 dark:border-[#1F2A3C]">
        {p.sat_key?.trim() ? (
          <span className="truncate font-mono text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]" title={p.sat_description || undefined}>
            SAT {p.sat_key}
          </span>
        ) : (
          <span className="text-[11px] text-[#A1A1AA] dark:text-[#64748B]">Sin clave SAT</span>
        )}
        {manual ? (
          <ManualActions p={p} {...acciones} />
        ) : link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[12.5px] font-semibold text-[#1B5CFF] transition-colors hover:bg-[rgba(27,92,255,0.07)] dark:text-[#7EA0FF] ${focusRing}`}
          >
            Proveedor
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardImpl);

export function ProductCardSkeleton({ index }: { index: number }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#F0F0F2] dark:border-[#1F2A3C]" style={{ opacity: 1 - Math.min(index, 6) * 0.1 }} aria-hidden>
      <div className="aspect-[4/3] bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32]" />
      <div className="space-y-2.5 p-4">
        <span className="block h-3 w-1/2 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
        <span className="block h-3.5 w-full rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
        <span className="block h-3.5 w-3/4 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
        <span className="block h-5 w-1/3 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Tabla
   -------------------------------------------------------------------------- */

const th = "whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]";

export function ProductosTable({
  rows,
  loading,
  precioDe,
  imagenDe,
  linkDe,
  onOpen,
  acciones,
}: {
  rows: SyscomProducto[];
  loading: boolean;
  precioDe: (p: SyscomProducto) => string;
  imagenDe: (p: SyscomProducto) => string | null;
  linkDe: (p: SyscomProducto) => string;
  onOpen: (id: string) => void;
  acciones: ProductoAcciones;
}) {
  return (
    <div className="overflow-x-auto rounded-[16px] border border-[#E7E7EA] dark:border-[#273244]" tabIndex={0} aria-label="Tabla de productos; desplaza horizontalmente si hace falta">
      <Table className="w-full min-w-[900px]">
        <TableHeader className="sticky top-0 z-10 border-b border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A]">
          <TableRow>
            <TableCell isHeader className={`${th} w-[46%]`}>Producto</TableCell>
            <TableCell isHeader className={th}>Clave SAT</TableCell>
            <TableCell isHeader className={th}>Fuente</TableCell>
            <TableCell isHeader className={`${th} text-right`}>Precio</TableCell>
            <TableCell isHeader className={th}>Existencia</TableCell>
            <TableCell isHeader className={`${th} text-right`}>Acción</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#F0F0F2] text-[13px] text-[#3F3F46] dark:divide-[#1F2A3C] dark:text-[#D6DEEA]">
          {loading
            ? [0, 1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="px-3 py-3">
                    <div className="flex items-center gap-3" style={{ opacity: 1 - i * 0.13 }} aria-hidden>
                      <span className="size-11 shrink-0 rounded-[10px] bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                      <span className="h-3.5 w-1/3 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                      <span className="ml-auto h-3.5 w-24 rounded-full bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32]" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            : rows.map((p, i) => {
                const link = linkDe(p);
                return (
                  <TableRow
                    key={p.producto_id}
                    className="cot-rise transition-colors duration-150 hover:bg-[#FAFAFB] dark:hover:bg-white/[0.03]"
                    style={{ "--cot-i": Math.min(i, 12) } as CSSProperties}
                  >
                    <TableCell className="px-3 py-2.5">
                      <button type="button" onClick={() => onOpen(p.producto_id)} className={`flex w-full items-center gap-3 rounded-lg text-left ${focusRing}`}>
                        <span className="size-11 shrink-0 overflow-hidden rounded-[10px] border border-[#E7E7EA] bg-white p-1 dark:border-[#273244] dark:bg-[#0F172A]">
                          <ProductThumb src={imagenDe(p)} alt="" />
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-medium leading-snug text-[#09090B] hover:text-[#1B5CFF] dark:text-[#F8FAFC] dark:hover:text-[#7EA0FF]" title={p.titulo}>
                            {p.titulo}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
                            {p.marca || "Sin marca"} · <span className="font-mono">{p.modelo || p.sku || "—"}</span>
                          </span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 font-mono text-[12px]">
                      {p.sat_key?.trim() ? <span title={p.sat_description || undefined}>{p.sat_key}</span> : <span className="font-sans text-[#A1A1AA]">—</span>}
                    </TableCell>
                    <TableCell className="px-3 py-2.5"><FuenteBadge fuente={p.fuente} /></TableCell>
                    <TableCell
                      className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${
                        p.precio_bajo_cotizacion ? "text-[13px] text-[#8A5D0F] dark:text-[#E6A23C]" : "text-[14px] text-[#09090B] dark:text-[#F8FAFC]"
                      }`}
                    >
                      <span title={p.precio_bajo_cotizacion ? "TVC no publica el precio; se vende por proyecto" : undefined}>{precioDe(p)}</span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5"><StockBadge p={p} /></TableCell>
                    <TableCell className="px-3 py-2.5">
                      <div className="flex justify-end">
                        {p.fuente === "manual" ? (
                          <ManualActions p={p} {...acciones} />
                        ) : link ? (
                          <a href={link} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[12.5px] font-semibold text-[#1B5CFF] hover:bg-[rgba(27,92,255,0.07)] dark:text-[#7EA0FF] ${focusRing}`}>
                            Proveedor
                            <ExternalLink className="size-3.5" aria-hidden />
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Vacío y paginación
   -------------------------------------------------------------------------- */

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="cot-fade flex flex-col items-center px-6 py-16 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-[14px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF] [&_svg]:size-6">
        {icon}
      </span>
      <p className="mt-3 text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-[19px] text-[#6E6E77] dark:text-[#8EA0B8]">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  const btnCls = `cot-press inline-flex size-10 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#3F3F46] hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#D6DEEA] dark:hover:bg-[#243048] [&_svg]:size-4 ${focusRing}`;
  return (
    <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Paginación">
      <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
        <span className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{total.toLocaleString("es-MX")}</span> resultado{total === 1 ? "" : "s"}
      </p>
      {pages > 1 ? (
        <div className="flex items-center gap-1.5">
          <button type="button" className={btnCls} onClick={() => onPage(1)} disabled={page <= 1} aria-label="Primera página"><ChevronsLeft aria-hidden /></button>
          <button type="button" className={btnCls} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Página anterior"><ChevronLeft aria-hidden /></button>
          <span className="min-w-[7.5rem] px-2 text-center text-[13px] text-[#52525B] dark:text-[#B7C1D1]" aria-live="polite">
            Página <b className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{page}</b> de <span className="tabular-nums">{pages}</span>
          </span>
          <button type="button" className={btnCls} onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Página siguiente"><ChevronRight aria-hidden /></button>
          <button type="button" className={btnCls} onClick={() => onPage(pages)} disabled={page >= pages} aria-label="Última página"><ChevronsRight aria-hidden /></button>
        </div>
      ) : null}
    </nav>
  );
}
