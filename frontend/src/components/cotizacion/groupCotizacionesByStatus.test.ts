import { describe, expect, it } from "vitest";
import { groupCotizacionesByStatus, type CotizacionRow } from "./cotizacionStatusSections";

const row = (id: number, status: string): CotizacionRow => ({
  id,
  idx: id,
  fecha: "2026-08-01",
  medioContacto: "WHATSAPP",
  status,
  creadaPor: "Ana",
  editadaPor: "Ana",
  cliente: `Cliente ${id}`,
  contacto: "—",
  tipoTrabajo: "GPS",
  monto: "$100.00",
  totalAmount: 100,
});

describe("groupCotizacionesByStatus", () => {
  it("ordena Pendientes → Autorizadas → Canceladas", () => {
    const sections = groupCotizacionesByStatus([
      row(1, "CANCELADA"),
      row(2, "AUTORIZADA"),
      row(3, "PENDIENTE"),
      row(4, "autorizada"),
      row(5, ""),
    ]);

    expect(sections.map((s) => s.key)).toEqual(["PENDIENTE", "AUTORIZADA", "CANCELADA"]);
    expect(sections[0].rows.map((r) => r.id)).toEqual([3, 5]);
    expect(sections[1].rows.map((r) => r.id)).toEqual([2, 4]);
    expect(sections[2].rows.map((r) => r.id)).toEqual([1]);
  });

  it("omite secciones vacías", () => {
    const sections = groupCotizacionesByStatus([row(1, "AUTORIZADA")]);
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe("AUTORIZADA");
  });
});
