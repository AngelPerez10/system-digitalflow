import { describe, expect, it, vi } from "vitest";
import type { SyscomProducto } from "@/pages/ProductosYServicios/syscomCatalog";
import type { Concepto } from "./cotizacionFormTypes";
import { actualizarPreciosConceptos, type PreciosVigentesDeps } from "./cotizacionPreciosVigentes";

const concepto = (over: Partial<Concepto>): Concepto => ({
  id: "x",
  producto_externo_id: "",
  producto_nombre: "Producto",
  producto_descripcion: "",
  unidad: "PZA",
  cantidad: 1,
  precio_lista: 100,
  descuento_pct: 0,
  ...over,
});

const prod = (precio_mxn: number | null, extra: Partial<SyscomProducto> = {}): SyscomProducto => ({
  producto_id: "1",
  modelo: "M",
  total_existencia: 1,
  titulo: "T",
  marca: "B",
  precio_mxn: precio_mxn ?? undefined,
  ...extra,
});

const deps = (over: Partial<PreciosVigentesDeps> = {}): PreciosVigentesDeps => ({
  catalogoManual: [],
  tipoCambio: 18,
  fetchSyscomDetalle: vi.fn(async () => null),
  fetchTvcDetalle: vi.fn(async () => null),
  ...over,
});

describe("actualizarPreciosConceptos", () => {
  it("toma el precio vigente de SYSCOM cuando subió o bajó", async () => {
    const d = deps({
      fetchSyscomDetalle: vi.fn(async (id: string) => (id === "10" ? prod(150) : prod(80))),
    });
    const { conceptos, resumen } = await actualizarPreciosConceptos(
      [
        concepto({ id: "a", producto_externo_id: "10", precio_lista: 100 }),
        concepto({ id: "b", producto_externo_id: "20", precio_lista: 100 }),
      ],
      d,
    );
    expect(conceptos.map((c) => c.precio_lista)).toEqual([150, 80]);
    expect(resumen.actualizados).toHaveLength(2);
  });

  it("consulta TVC y manuales por su propia fuente", async () => {
    const d = deps({
      catalogoManual: [{ id: 7, precio: 55.5 }],
      fetchTvcDetalle: vi.fn(async () => prod(200)),
    });
    const { conceptos } = await actualizarPreciosConceptos(
      [
        concepto({ id: "a", producto_externo_id: "tvc:99" }),
        concepto({ id: "b", producto_externo_id: "manual:7" }),
      ],
      d,
    );
    expect(d.fetchTvcDetalle).toHaveBeenCalledWith("tvc:99");
    expect(conceptos.map((c) => c.precio_lista)).toEqual([200, 55.5]);
  });

  it("conserva el precio anterior si no se puede consultar", async () => {
    const d = deps({
      fetchSyscomDetalle: vi.fn(async () => {
        throw new Error("red");
      }),
    });
    const { conceptos, resumen } = await actualizarPreciosConceptos(
      [
        concepto({ id: "a", producto_externo_id: "10", precio_lista: 123 }),
        concepto({ id: "b", producto_externo_id: "manual:404", precio_lista: 45 }),
        concepto({ id: "c", producto_externo_id: "tvc:5", precio_lista: 67 }), // TVC sin precio
      ],
      d,
    );
    expect(conceptos.map((c) => c.precio_lista)).toEqual([123, 45, 67]);
    expect(resumen.noConsultados).toBe(3);
    expect(resumen.actualizados).toHaveLength(0);
  });

  it("no usa USD como MXN cuando falta el tipo de cambio", async () => {
    const d = deps({
      tipoCambio: null,
      fetchSyscomDetalle: vi.fn(async () => prod(null, { precios: { precio_lista: 10 } })),
    });
    const { conceptos, resumen } = await actualizarPreciosConceptos(
      [concepto({ producto_externo_id: "10", precio_lista: 500 })],
      d,
    );
    expect(conceptos[0].precio_lista).toBe(500);
    expect(resumen.noConsultados).toBe(1);
  });

  it("no toca conceptos manuales sin id, intrax ni partidas sin cambio; consulta una vez por id", async () => {
    const fetchSyscomDetalle = vi.fn(async () => prod(100));
    const { conceptos, resumen } = await actualizarPreciosConceptos(
      [
        concepto({ id: "a", producto_externo_id: "", precio_lista: 9 }),
        concepto({ id: "b", producto_externo_id: "intrax:3", precio_lista: 8 }),
        concepto({ id: "c", producto_externo_id: "10", precio_lista: 100 }),
        concepto({ id: "d", producto_externo_id: "10", precio_lista: 100 }),
      ],
      deps({ fetchSyscomDetalle }),
    );
    expect(conceptos.map((c) => c.precio_lista)).toEqual([9, 8, 100, 100]);
    expect(resumen).toEqual({ actualizados: [], sinCambio: 2, noConsultados: 0 });
    expect(fetchSyscomDetalle).toHaveBeenCalledTimes(1);
  });

  it("conserva descuento, cantidad e IVA de la partida", async () => {
    const { conceptos } = await actualizarPreciosConceptos(
      [concepto({ producto_externo_id: "10", precio_lista: 100, descuento_pct: 10, cantidad: 3, sin_iva: true })],
      deps({ fetchSyscomDetalle: vi.fn(async () => prod(120)) }),
    );
    expect(conceptos[0]).toMatchObject({ precio_lista: 120, descuento_pct: 10, cantidad: 3, sin_iva: true });
  });
});
