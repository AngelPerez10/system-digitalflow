/**
 * Al clonar una cotización, los precios de las partidas se toman del catálogo
 * vigente (SYSCOM, TVC y productos manuales) en lugar del precio guardado.
 *
 * Criterio conservador: si un precio no se puede consultar (sin red, producto
 * descontinuado, TVC «bajo cotización», sin tipo de cambio) la partida conserva
 * el precio de la cotización original y se cuenta como «no consultada».
 */
import type { SyscomProducto } from "@/pages/ProductosYServicios/syscomCatalog";
import type { Concepto, ProductoManualCatalogo } from "./cotizacionFormTypes";
import { getSyscomPrecioListaMxnConIva, round2, toFinite, toNumber } from "./cotizacionFormUtils";

export type PrecioActualizado = {
  nombre: string;
  anterior: number;
  nuevo: number;
};

export type ResumenPrecios = {
  actualizados: PrecioActualizado[];
  sinCambio: number;
  /** Partidas de catálogo cuyo precio vigente no se pudo obtener (conservan el anterior). */
  noConsultados: number;
};

export type PreciosVigentesDeps = {
  catalogoManual: Pick<ProductoManualCatalogo, "id" | "precio">[];
  tipoCambio: number | null;
  fetchSyscomDetalle: (id: string) => Promise<SyscomProducto | null>;
  fetchTvcDetalle: (id: string) => Promise<SyscomProducto | null>;
};

const LOTE = 5;

/** Precio de lista MXN con IVA de un detalle de proveedor; null si no es confiable. */
function precioDeDetalle(p: SyscomProducto | null, tipoCambio: number | null): number | null {
  if (!p) return null;
  const directo = toFinite(p.precio_mxn);
  // Sin precio MXN directo hace falta el tipo de cambio: sin él el helper devolvería USD.
  if (!(directo !== null && directo > 0) && !tipoCambio) return null;
  const precio = round2(getSyscomPrecioListaMxnConIva(p, tipoCambio));
  return precio > 0 ? precio : null;
}

type Fuente = "syscom" | "tvc" | "manual" | null;

function fuenteDe(externoId: string): Fuente {
  const id = externoId.trim().toLowerCase();
  if (!id) return null;
  if (id.startsWith("manual:")) return "manual";
  if (id.startsWith("tvc:")) return "tvc";
  if (/^\d+$/.test(id)) return "syscom";
  return null; // `intrax:` u otros: sin fuente de precio vigente.
}

export async function actualizarPreciosConceptos(
  conceptos: Concepto[],
  deps: PreciosVigentesDeps,
): Promise<{ conceptos: Concepto[]; resumen: ResumenPrecios }> {
  const vigentes = new Map<string, number | null>();

  // Un solo fetch por producto externo distinto, en lotes para no saturar al proveedor.
  const porConsultar = [
    ...new Set(
      conceptos
        .map((c) => String(c.producto_externo_id || "").trim())
        .filter((id) => {
          const f = fuenteDe(id);
          return f === "syscom" || f === "tvc";
        }),
    ),
  ];
  for (let i = 0; i < porConsultar.length; i += LOTE) {
    const lote = porConsultar.slice(i, i + LOTE);
    const resultados = await Promise.allSettled(
      lote.map((id) =>
        fuenteDe(id) === "tvc" ? deps.fetchTvcDetalle(id) : deps.fetchSyscomDetalle(id),
      ),
    );
    resultados.forEach((r, idx) => {
      vigentes.set(lote[idx], r.status === "fulfilled" ? precioDeDetalle(r.value, deps.tipoCambio) : null);
    });
  }

  const resumen: ResumenPrecios = { actualizados: [], sinCambio: 0, noConsultados: 0 };
  const salida = conceptos.map((c) => {
    const externo = String(c.producto_externo_id || "").trim();
    const fuente = fuenteDe(externo);
    if (!fuente) return c;

    let nuevo: number | null = null;
    if (fuente === "manual") {
      const manual = deps.catalogoManual.find((p) => p.id === Number(externo.split(":")[1]));
      const precio = manual ? round2(toNumber(manual.precio, 0)) : 0;
      nuevo = precio > 0 ? precio : null;
    } else {
      nuevo = vigentes.get(externo) ?? null;
    }

    if (nuevo === null) {
      resumen.noConsultados += 1;
      return c;
    }
    const anterior = toNumber(c.precio_lista, 0);
    if (Math.abs(nuevo - anterior) < 0.01) {
      resumen.sinCambio += 1;
      return c;
    }
    resumen.actualizados.push({ nombre: c.producto_nombre, anterior, nuevo });
    return { ...c, precio_lista: nuevo };
  });

  return { conceptos: salida, resumen };
}
