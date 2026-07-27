import { describe, expect, it } from "vitest";
import type { ApiCotizacionItem } from "@/pages/Ventas/Cotizacion/cotizacionFormTypes";
import {
  digitalFlowCotizacionId,
  inferEsEquipoDigitalFlow,
  inferEsEquipoSicar,
  mapDigitalFlowItemsToPresupuesto,
  mapDigitalFlowListRowToResumen,
  mapSicarItemsToPresupuesto,
  mapSicarListRowToResumen,
  parseCotizacionApiId,
  sicarCotizacionId,
} from "./proyectoCotizacionMappers";

describe("proyectoCotizacionMappers", () => {
  it("builds stable ids and parses them back", () => {
    expect(digitalFlowCotizacionId(1042)).toBe("df-1042");
    expect(sicarCotizacionId(892)).toBe("sicar-892");
    expect(parseCotizacionApiId("df-1042", "digitalflow")).toBe(1042);
    expect(parseCotizacionApiId("sicar-892", "sicar")).toBe(892);
    expect(parseCotizacionApiId("1042", "digitalflow")).toBe(1042);
  });

  it("maps DigitalFlow list row with COT folio", () => {
    const resumen = mapDigitalFlowListRowToResumen({
      id: 12,
      idx: 1042,
      cliente: "Acme",
      contacto: "Ana",
      fecha: "2026-01-15",
      total: 100,
    });
    expect(resumen).toMatchObject({
      id: "df-12",
      origen: "digitalflow",
      folio: "COT-1042",
      cliente: "Acme",
      contacto: "Ana",
    });
  });

  it("infers esEquipo for DigitalFlow items", () => {
    const withProduct: ApiCotizacionItem = {
      producto_externo_id: "12345",
      producto_nombre: "Cámara",
      producto_descripcion: "",
      unidad: "PZA",
      cantidad: 1,
      precio_lista: 10,
      descuento_pct: 0,
    };
    const conceptoLibre: ApiCotizacionItem = {
      producto_externo_id: "",
      producto_nombre: "Visita",
      producto_descripcion: "",
      unidad: "SERV",
      cantidad: 1,
      precio_lista: 10,
      descuento_pct: 0,
    };
    expect(inferEsEquipoDigitalFlow(withProduct)).toBe(true);
    expect(inferEsEquipoDigitalFlow(conceptoLibre)).toBe(false);

    const lineas = mapDigitalFlowItemsToPresupuesto([withProduct, conceptoLibre]);
    expect(lineas[0].esEquipo).toBe(true);
    expect(lineas[1].esEquipo).toBe(false);
  });

  it("maps SICAR list and items", () => {
    const resumen = mapSicarListRowToResumen({
      cot_id: 892,
      cliente_nombre: "Beta SA",
      fecha: "2026-03-01T12:00:00",
    });
    expect(resumen).toMatchObject({
      id: "sicar-892",
      origen: "sicar",
      folio: "892",
      cliente: "Beta SA",
      fecha: "2026-03-01",
    });

    expect(inferEsEquipoSicar({ unidad: "PZA", descripcion: "DVR 8ch" })).toBe(true);
    expect(inferEsEquipoSicar({ unidad: "SERV", descripcion: "Servicio de instalación" })).toBe(false);

    const lineas = mapSicarItemsToPresupuesto([
      { clave: "ABC", descripcion: "Router", cantidad: 2, unidad: "PZA", orden: 1 },
      { clave: "SRV", descripcion: "Mano de obra", cantidad: 1, unidad: "SERV", orden: 2 },
    ]);
    expect(lineas[0]).toMatchObject({ id: "1-ABC", esEquipo: true, productoId: "ABC" });
    expect(lineas[1].esEquipo).toBe(false);
  });
});
