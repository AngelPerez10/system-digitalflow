import { describe, expect, it } from "vitest";
import {
  lineasSinUbicacion,
  marcarTodas,
  recepcionPayload,
  recibidaDe,
  resumirRecepcion,
  setRecibida,
  toggleLinea,
  ubicarNuevas,
} from "./facturaRecepcion";
import type { FacturaPreviewLinea } from "./inventarioTypes";

const linea = (indice: number, modelo: string, cantidad: number): FacturaPreviewLinea => ({
  indice,
  ref_externa: String(indice),
  modelo,
  nombre: modelo,
  marca: "",
  imagen_url: "",
  caracteristicas: "",
  cantidad,
  precio_unitario: null,
  en_inventario: null,
});

const bobina = linea(0, "DS1LN5ESB", 4);
const portero = linea(1, "DS-KV6113", 1);
const lineas = [bobina, portero];

describe("facturaRecepcion", () => {
  it("por defecto nada ha llegado", () => {
    expect(resumirRecepcion(lineas, {})).toEqual({
      lineasRecibidas: 0,
      unidadesRecibidas: 0,
      lineasEnEspera: 2,
      unidadesEnEspera: 5,
      unidadesTotales: 5,
    });
  });

  it("marcar una línea recibe todo lo facturado y desmarcar la regresa a 0", () => {
    const s = toggleLinea({}, bobina);
    expect(recibidaDe(s, bobina)).toBe(4);
    expect(recibidaDe(toggleLinea(s, bobina), bobina)).toBe(0);
  });

  it("la cantidad recibida se limita a lo facturado", () => {
    expect(recibidaDe(setRecibida({}, bobina, 99), bobina)).toBe(4);
    expect(recibidaDe(setRecibida({}, bobina, -2), bobina)).toBe(0);
    expect(recibidaDe(setRecibida({}, bobina, Number.NaN), bobina)).toBe(0);
  });

  it("una recepción parcial cuenta como recibida y en espera a la vez", () => {
    const s = setRecibida(marcarTodas(lineas, true), bobina, 3);
    expect(resumirRecepcion(lineas, s)).toMatchObject({
      lineasRecibidas: 2,
      unidadesRecibidas: 4,
      lineasEnEspera: 1,
      unidadesEnEspera: 1,
    });
  });

  it("el payload incluye todas las líneas con su modelo", () => {
    expect(recepcionPayload(lineas, { 0: 2 })).toEqual([
      { indice: 0, modelo: "DS1LN5ESB", recibida: 2 },
      { indice: 1, modelo: "DS-KV6113", recibida: 0 },
    ]);
  });

  it("los productos nuevos recibidos exigen ubicación; los existentes no", () => {
    const existente = { ...linea(2, "YA-EXISTE", 1), en_inventario: { id: 9, cantidad: 3, ubicacion: "almacen" as const } };
    const todas = [bobina, portero, existente];
    const recibido = marcarTodas(todas, true);
    expect(lineasSinUbicacion(todas, recibido, {}).map((l) => l.modelo)).toEqual(["DS1LN5ESB", "DS-KV6113"]);
    // Una línea nueva no recibida no pide ubicación.
    expect(lineasSinUbicacion(todas, setRecibida(recibido, bobina, 0), {}).map((l) => l.modelo)).toEqual(["DS-KV6113"]);
    const ubic = ubicarNuevas(todas, {}, "exhibicion");
    expect(ubic).toEqual({ 0: "exhibicion", 1: "exhibicion" });
    expect(lineasSinUbicacion(todas, recibido, ubic)).toEqual([]);
  });

  it("el payload lleva la ubicación solo donde se eligió", () => {
    expect(recepcionPayload(lineas, { 0: 1 }, { 0: "almacen" })).toEqual([
      { indice: 0, modelo: "DS1LN5ESB", recibida: 1, ubicacion: "almacen" },
      { indice: 1, modelo: "DS-KV6113", recibida: 0 },
    ]);
  });
});
