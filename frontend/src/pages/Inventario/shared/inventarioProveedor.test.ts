import { describe, expect, it } from "vitest";
import {
  patchDesdeSeleccion,
  proveedorBadgeFuente,
  proveedorTipo,
  proveedorVisible,
  seleccionDesdeItem,
} from "./inventarioProveedor";
import type { InventarioItem } from "./inventarioTypes";

function item(partial: Partial<InventarioItem>): InventarioItem {
  return {
    id: 1,
    codigo_barras: "CAM-1",
    nombre: "",
    marca: "",
    modelo: "",
    notas: "",
    fuente: "syscom",
    ref_externa: "99",
    imagen_url: "",
    seccion: "",
    cantidad: 10,
    folio_factura: "",
    proveedor: null,
    proveedor_nombre: "",
    sin_proveedor: false,
    precio_unitario: null,
    ubicacion: "",
    precio_mercado: null,
    precio_mercado_anterior: null,
    precio_mercado_actualizado: null,
    fecha_creacion: "",
    fecha_actualizacion: "",
    ...partial,
  } as InventarioItem;
}

describe("proveedor del inventario", () => {
  it("sin elegir, muestra el catálogo vinculado", () => {
    expect(proveedorVisible(item({}))).toBe("SYSCOM");
    expect(proveedorBadgeFuente(item({}))).toBe("syscom");
  });

  it("sin proveedor no se atribuye a SYSCOM", () => {
    const it_ = item({ sin_proveedor: true });
    expect(proveedorVisible(it_)).toBe("Sin proveedor");
    expect(proveedorBadgeFuente(it_)).toBe("desconocido");
  });

  it("Intrax se reconoce y no usa el tono de SYSCOM", () => {
    const it_ = item({ proveedor: 7, proveedor_nombre: "Intrax" });
    expect(seleccionDesdeItem(it_)).toEqual({ modo: "intrax", otroId: "" });
    expect(proveedorVisible(it_)).toBe("Intrax");
    expect(proveedorBadgeFuente(it_)).toBe("desconocido");
  });

  it("arma el patch según la opción", () => {
    expect(patchDesdeSeleccion({ modo: "intrax", otroId: "" })).toEqual({ proveedor_intrax: true, sin_proveedor: false });
    expect(patchDesdeSeleccion({ modo: "sin", otroId: "" })).toEqual({ proveedor: null, sin_proveedor: true });
    expect(patchDesdeSeleccion({ modo: "otro", otroId: "5" })).toEqual({ proveedor: 5, sin_proveedor: false });
    // «Otro» sin contacto elegido no toca lo guardado.
    expect(patchDesdeSeleccion({ modo: "otro", otroId: "" })).toEqual({});
    expect(patchDesdeSeleccion({ modo: "catalogo", otroId: "" })).toEqual({ proveedor: null, sin_proveedor: false });
  });

  it("elige el tipo de píldora del listado", () => {
    expect(proveedorTipo(item({ proveedor: 7, proveedor_nombre: "Intrax" }))).toBe("intrax");
    expect(proveedorTipo(item({ sin_proveedor: true }))).toBe("sin");
    expect(proveedorTipo(item({}))).toBe("syscom");
    expect(proveedorTipo(item({ proveedor: 3, proveedor_nombre: "Distribuidora Norte" }))).toBe("contacto");
    expect(proveedorTipo(item({ fuente: "desconocido", ref_externa: "" }))).toBe("ninguno");
  });
});
