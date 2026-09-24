/**
 * Costo y precio de venta del producto, en celdas separadas.
 *
 *  - Costo: lo que costó (última compra: factura o catálogo al dar de alta).
 *  - Precio de venta: precio de lista actual del proveedor (SYSCOM/TVC), que se
 *    actualiza solo; muestra si subió/bajó y el margen frente al costo.
 */
import { TrendingDown, TrendingUp } from "lucide-react";
import type { InventarioItem } from "../shared/inventarioTypes";
import { esDeProveedor, formatMxn, formatPct, precioMercadoInfo } from "../shared/precioMercado";

type PrecioItem = Pick<
  InventarioItem,
  "fuente" | "precio_mercado" | "precio_mercado_anterior" | "precio_unitario" | "precio_mercado_actualizado"
>;

type Props = { item: PrecioItem; align?: "left" | "right" };

const muted = "text-[#A1A1AA] dark:text-[#64748b]";

const fechaCorta = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function CostoCell({ item, align = "right" }: Props) {
  const costo = formatMxn(item.precio_unitario);
  return (
    <span
      className={`block font-semibold tabular-nums tracking-tight ${
        align === "right" ? "text-right" : "text-left"
      } ${costo ? "text-[#09090B] dark:text-[#F8FAFC]" : `font-normal ${muted}`}`}
      title={costo ? `Costo de la última compra ${costo}` : "Sin costo registrado"}
    >
      {costo ?? "—"}
    </span>
  );
}

export function PrecioVentaCell({ item, align = "right" }: Props) {
  const info = precioMercadoInfo(item);
  const alineado = align === "right" ? "items-end text-right" : "items-start text-left";

  if (!esDeProveedor(item)) {
    return (
      <span className={`block ${align === "right" ? "text-right" : "text-left"} ${muted}`} title="Solo productos de SYSCOM o TVC">
        —
      </span>
    );
  }
  if (info.mercado == null) {
    // Sin fecha: aún no se consulta. Con fecha: el proveedor no publica precio de lista.
    const consultando = !item.precio_mercado_actualizado;
    return (
      <span
        className={`block text-[11px] ${align === "right" ? "text-right" : "text-left"} ${muted} ${consultando ? "motion-safe:animate-pulse" : ""}`}
        title={consultando ? "Consultando el precio de lista al proveedor" : "El proveedor no publica precio de lista"}
      >
        {consultando ? "Consultando…" : "Sin precio de lista"}
      </span>
    );
  }

  const sube = info.tendencia === "sube";
  const baja = info.tendencia === "baja";
  const margen = info.vsCostoPct;
  const titulo = [
    `Precio de lista ${formatMxn(info.mercado)}`,
    info.variacionPct != null && (sube || baja)
      ? `${sube ? "subió" : "bajó"} ${formatPct(info.variacionPct)} (antes ${formatMxn(item.precio_mercado_anterior)})`
      : "",
    margen != null ? `margen sobre costo ${formatPct(margen)}` : "",
    item.precio_mercado_actualizado ? `consultado ${fechaCorta(item.precio_mercado_actualizado)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className={`flex flex-col gap-0.5 ${alineado}`} title={titulo}>
      <span className="inline-flex items-center gap-1">
        {sube || baja ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${
              sube
                ? "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
                : "bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]"
            }`}
          >
            {sube ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
            {formatPct(info.variacionPct)}
            <span className="sr-only">{sube ? "subió" : "bajó"}</span>
          </span>
        ) : null}
        <span className="font-semibold tabular-nums tracking-tight text-[#09090B] dark:text-[#F8FAFC]">
          {formatMxn(info.mercado)}
        </span>
      </span>
      {margen != null ? (
        <span
          className={`text-[10.5px] font-medium tabular-nums ${
            margen >= 0 ? "text-[#04724D] dark:text-[#4ADE80]" : "text-[#C22B2B] dark:text-[#F87171]"
          }`}
        >
          Margen {formatPct(margen)}
        </span>
      ) : (
        <span className="text-[10.5px] text-[#6E6E77] dark:text-[#8EA0B8]">Precio de lista</span>
      )}
    </span>
  );
}
