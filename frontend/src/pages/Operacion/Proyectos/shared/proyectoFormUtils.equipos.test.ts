import { describe, expect, it } from "vitest";
import {
  buildEquiposFromCotizaciones,
  buildEquiposFromPresupuesto,
} from "./proyectoFormUtils";
import type { PresupuestoLinea, ProyectoCotizacionBloque, ProyectoEquipoLinea } from "./proyectoTypes";

const cable: PresupuestoLinea = {
  id: "lin-cable",
  descripcion: "METRO DE CABLE UTP CAT5E",
  cantidad: 40,
  unidad: "PZA",
  esEquipo: true,
  productoId: "manual:73",
  fuenteProducto: "manual",
};

const router: PresupuestoLinea = {
  id: "lin-router",
  descripcion: "Router MESH",
  cantidad: 1,
  unidad: "PZA",
  esEquipo: true,
  productoId: "225299",
  fuenteProducto: "syscom",
};

const servicio: PresupuestoLinea = {
  id: "lin-serv",
  descripcion: "SERVICIO DE CABLEADO",
  cantidad: 1,
  unidad: "PZA",
  esEquipo: false,
};

describe("buildEquiposFromPresupuesto", () => {
  it("crea una fila por partida con cantidad (no explota unidades)", () => {
    const eqs = buildEquiposFromPresupuesto([router, cable, servicio], {
      cotizacionVinculoId: "v1",
      cotizacionOrden: 1,
      cotizacionFolio: "COT-10344",
    });
    expect(eqs).toHaveLength(2);
    expect(eqs.map((e) => ({ id: e.lineaId, cantidad: e.cantidad }))).toEqual([
      { id: "v1:lin-router", cantidad: 1 },
      { id: "v1:lin-cable", cantidad: 40 },
    ]);
  });
});

describe("buildEquiposFromCotizaciones", () => {
  const bloque: ProyectoCotizacionBloque = {
    vinculoId: "v1",
    orden: 1,
    cotizacion: {
      id: "c1",
      origen: "digitalflow",
      folio: "COT-10344",
      cliente: "Demo",
      fecha: "2026-01-01",
    },
    lineas: [router, cable],
  };

  it("consolida filas legacy por unidad y conserva entrega total", () => {
    const legacy: ProyectoEquipoLinea[] = Array.from({ length: 40 }, (_, i) => ({
      lineaId: `v1:lin-cable-${i + 1}`,
      modelo: cable.descripcion,
      modeloOriginal: cable.descripcion,
      cantidad: 1,
      productoId: "manual:73",
      fuenteProducto: "manual" as const,
      estadoInstalacion: "instalado" as const,
      equipoEntregado: true,
      cotizacionVinculoId: "v1",
    }));
    legacy.push({
      lineaId: "v1:lin-router",
      modelo: "Router custom",
      modeloOriginal: router.descripcion,
      cantidad: 1,
      productoId: "225299",
      fuenteProducto: "syscom",
      estadoInstalacion: "instalado",
      equipoEntregado: true,
      cotizacionVinculoId: "v1",
    });

    const next = buildEquiposFromCotizaciones([bloque], legacy);
    expect(next).toHaveLength(2);
    const cableEq = next.find((e) => e.lineaId === "v1:lin-cable");
    expect(cableEq?.cantidad).toBe(40);
    expect(cableEq?.equipoEntregado).toBe(true);
    expect(cableEq?.estadoInstalacion).toBe("instalado");
    expect(next.find((e) => e.lineaId === "v1:lin-router")?.modelo).toBe("Router custom");
  });
});
