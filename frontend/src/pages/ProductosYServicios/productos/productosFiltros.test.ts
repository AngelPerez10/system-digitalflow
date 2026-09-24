import { describe, expect, it } from "vitest";
import type { SyscomProducto } from "../syscomCatalog";
import { filtrarEnPantalla, htmlAParrafos, precioPublico, precioTexto, stockDe, stockTexto } from "./productosFiltros";

const prod = (over: Partial<SyscomProducto>): SyscomProducto => ({
  producto_id: "1",
  modelo: "M",
  total_existencia: 0,
  titulo: "T",
  marca: "B",
  ...over,
});

describe("stock", () => {
  it("acepta número o texto", () => {
    expect(stockDe(prod({ total_existencia: 12 }))).toBe(12);
    expect(stockDe(prod({ total_existencia: "7" as unknown as number }))).toBe(7);
    expect(stockDe(prod({ total_existencia: undefined as unknown as number }))).toBeNull();
  });

  it("el 500 de SYSCOM es un tope; el de TVC o manual es exacto", () => {
    expect(stockTexto(prod({ total_existencia: 500, fuente: "syscom" }))).toBe("500+");
    expect(stockTexto(prod({ total_existencia: 500, fuente: "manual" }))).toBe("500");
    expect(stockTexto(prod({ total_existencia: 31, fuente: "tvc" }))).toBe("31");
    expect(stockTexto(prod({ total_existencia: 0 }))).toBe("Sin stock");
  });
});

describe("precio y filtros en pantalla", () => {
  const a = prod({ producto_id: "a", precio_mxn: 100, total_existencia: 5 });
  const b = prod({ producto_id: "b", precios: { precio_lista: 10 }, total_existencia: 0 });
  const c = prod({ producto_id: "c", total_existencia: 3 });

  it("calcula el precio público como la lista", () => {
    expect(precioPublico(a, null)).toBe(100);
    expect(precioPublico(b, 20)).toBeCloseTo(232);
    expect(precioPublico(c, 20)).toBeNull();
  });

  it("solo con existencia", () => {
    const r = filtrarEnPantalla([a, b, c], { soloExistencia: true, precioMin: "", precioMax: "" }, 20);
    expect(r.map((p) => p.producto_id)).toEqual(["a", "c"]);
  });

  it("rango de precio excluye los que no tienen precio", () => {
    const r = filtrarEnPantalla([a, b, c], { soloExistencia: false, precioMin: "150", precioMax: "" }, 20);
    expect(r.map((p) => p.producto_id)).toEqual(["b"]);
  });
});

describe("TVC: cotización y descripción", () => {
  it("precio bajo cotización en lugar de «—»", () => {
    const fmt = () => "$100.00";
    expect(precioTexto(prod({ precio_bajo_cotizacion: true }), fmt)).toBe("Bajo cotización");
    expect(precioTexto(prod({}), fmt)).toBe("$100.00");
  });

  it("sin dato de existencia no es «Sin stock»", () => {
    expect(stockTexto(prod({ total_existencia: null, fuente: "tvc" }))).toBeNull();
  });

  it("convierte el HTML del proveedor en párrafos sin etiquetas", () => {
    const html = "<div><p style='x'>Primera l&iacute;nea.</p><p>Segunda<br>tercera</p><script>alert(1)</script></div>";
    expect(htmlAParrafos(html)).toEqual(["Primera línea.", "Segunda", "tercera"]);
  });
});
