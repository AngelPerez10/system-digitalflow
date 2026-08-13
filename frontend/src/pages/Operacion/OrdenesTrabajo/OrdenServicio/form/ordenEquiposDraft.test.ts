import { describe, expect, it } from "vitest";
import type { InventarioItem } from "@/pages/Inventario/shared/inventarioTypes";
import {
  addEquipoFromItem,
  createEquipoLineaFromItem,
  filterEquiposForWritePayload,
  normalizeEquiposInventario,
  removeEquipoLinea,
  updateEquipoLinea,
} from "./ordenEquiposDraft";

function makeItem(partial: Partial<InventarioItem> & { id: number }): InventarioItem {
  return {
    codigo_barras: "750123",
    nombre: "GPS Pro",
    marca: "Intrax",
    modelo: "GP-1",
    notas: "",
    fuente: "desconocido",
    ref_externa: "",
    imagen_url: "",
    seccion: "",
    cantidad: 5,
    folio_factura: "",
    proveedor: null,
    proveedor_nombre: "",
    precio_unitario: null,
    fecha_creacion: "",
    fecha_actualizacion: "",
    ...partial,
  };
}

describe("ordenEquiposDraft", () => {
  it("createEquipoLineaFromItem starts undelivered with qty 1", () => {
    const linea = createEquipoLineaFromItem(makeItem({ id: 9 }));
    expect(linea.inventarioItemId).toBe(9);
    expect(linea.cantidad).toBe(1);
    expect(linea.equipoEntregado).toBe(false);
    expect(linea.estadoInstalacion).toBe("no_instalado");
    expect(linea.movimientoSalidaId).toBeNull();
    expect(linea.lineaId.length).toBeGreaterThan(8);
  });

  it("addEquipoFromItem dedupes by inventarioItemId and clamps qty to stock", () => {
    const item = makeItem({ id: 3, cantidad: 2 });
    const once = addEquipoFromItem([], item);
    expect(once).toHaveLength(1);
    expect(once[0].cantidad).toBe(1);

    const twice = addEquipoFromItem(once, item);
    expect(twice).toHaveLength(1);
    expect(twice[0].cantidad).toBe(2);
    expect(twice[0].lineaId).toBe(once[0].lineaId);

    const thrice = addEquipoFromItem(twice, item);
    expect(thrice).toHaveLength(1);
    expect(thrice[0].cantidad).toBe(2);
  });

  it("updateEquipoLinea never changes movimientoSalidaId", () => {
    const base = addEquipoFromItem([], makeItem({ id: 1 }));
    const withMov = [{ ...base[0], movimientoSalidaId: 99 }];
    const patched = updateEquipoLinea(withMov, withMov[0].lineaId, {
      equipoEntregado: true,
      estadoInstalacion: "instalado",
    });
    expect(patched[0].movimientoSalidaId).toBe(99);
    expect(patched[0].equipoEntregado).toBe(true);
    expect(patched[0].estadoInstalacion).toBe("instalado");
  });

  it("updateEquipoLinea clamps cantidad to stockMax and blocks qty when delivered", () => {
    const [row] = addEquipoFromItem([], makeItem({ id: 2, cantidad: 10 }));
    const raised = updateEquipoLinea([row], row.lineaId, { cantidad: 9 }, { stockMax: 4 });
    expect(raised[0].cantidad).toBe(4);

    const delivered = [{ ...row, equipoEntregado: true, cantidad: 2 }];
    const blocked = updateEquipoLinea(delivered, row.lineaId, { cantidad: 5 });
    expect(blocked[0].cantidad).toBe(2);
  });

  it("removeEquipoLinea drops the matching line", () => {
    const a = addEquipoFromItem([], makeItem({ id: 1 }));
    const both = addEquipoFromItem(a, makeItem({ id: 2, codigo_barras: "999" }));
    expect(both).toHaveLength(2);
    const left = removeEquipoLinea(both, both[0].lineaId);
    expect(left).toHaveLength(1);
    expect(left[0].inventarioItemId).toBe(2);
  });

  it("normalizeEquiposInventario dedupes and echoes movimientoSalidaId", () => {
    const rows = normalizeEquiposInventario([
      {
        lineaId: "a",
        inventarioItemId: 1,
        cantidad: 2,
        equipoEntregado: true,
        estadoInstalacion: "instalado",
        movimientoSalidaId: 44,
      },
      {
        lineaId: "b",
        inventarioItemId: 1,
        cantidad: 9,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].movimientoSalidaId).toBe(44);
    expect(rows[0].cantidad).toBe(2);
  });

  it("filterEquiposForWritePayload lets admin send draft as-is", () => {
    const draft = [
      {
        lineaId: "new",
        inventarioItemId: 9,
        cantidad: 3,
        equipoEntregado: true,
        estadoInstalacion: "instalado" as const,
        movimientoSalidaId: null,
        codigoBarras: "",
        nombre: "X",
        marca: "",
        modelo: "",
        imagenUrl: "",
      },
    ];
    const out = filterEquiposForWritePayload({ isAdmin: true, draft, baseline: [] });
    expect(out).toHaveLength(1);
    expect(out[0].cantidad).toBe(3);
    expect(out[0].equipoEntregado).toBe(true);
  });

  it("filterEquiposForWritePayload freezes qty/entrega/adds for non-admin", () => {
    const baseline = [
      {
        lineaId: "l1",
        inventarioItemId: 1,
        cantidad: 2,
        equipoEntregado: true,
        estadoInstalacion: "no_instalado" as const,
        movimientoSalidaId: 10,
        codigoBarras: "750",
        nombre: "GPS",
        marca: "",
        modelo: "",
        imagenUrl: "",
      },
    ];
    const draft = [
      {
        ...baseline[0],
        cantidad: 99,
        equipoEntregado: false,
        estadoInstalacion: "instalado" as const,
      },
      {
        lineaId: "sneak",
        inventarioItemId: 2,
        cantidad: 1,
        equipoEntregado: true,
        estadoInstalacion: "instalado" as const,
        movimientoSalidaId: null,
        codigoBarras: "",
        nombre: "Hack",
        marca: "",
        modelo: "",
        imagenUrl: "",
      },
    ];
    const out = filterEquiposForWritePayload({ isAdmin: false, draft, baseline });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      lineaId: "l1",
      inventarioItemId: 1,
      cantidad: 2,
      equipoEntregado: true,
      estadoInstalacion: "instalado",
      movimientoSalidaId: 10,
    });
  });

  it("filterEquiposForWritePayload returns [] on create for non-admin", () => {
    const draft = [
      {
        lineaId: "x",
        inventarioItemId: 1,
        cantidad: 1,
        equipoEntregado: false,
        estadoInstalacion: "instalado" as const,
        movimientoSalidaId: null,
        codigoBarras: "",
        nombre: "",
        marca: "",
        modelo: "",
        imagenUrl: "",
      },
    ];
    expect(filterEquiposForWritePayload({ isAdmin: false, draft, baseline: [] })).toEqual([]);
  });
});
