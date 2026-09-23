import { describe, expect, it } from "vitest";
import type { CotizacionResumen } from "../../shared/proyectoTypes";

/** Pure annotation logic mirrored from useCotizacionPicker (for stable unit tests). */
export function annotatePickerRows(input: {
  results: CotizacionResumen[];
  pickerTarget: "principal" | "adicional";
  vinculadas: Set<string>;
  ocupadasById: Record<string, { id: number; folio: string }>;
  adicionalId: string | null;
}): Array<
  CotizacionResumen & {
    yaVinculada: boolean;
    ocupadaPorFolio: string | null;
  }
> {
  const rows = [];
  for (const c of input.results) {
    const yaVinculada = input.vinculadas.has(c.id);
    if (input.pickerTarget === "principal" && yaVinculada) continue;
    const ocupada = input.ocupadasById[c.id];
    const esAdicionalActual =
      input.pickerTarget === "adicional" && input.adicionalId === c.id;
    rows.push({
      ...c,
      yaVinculada: input.pickerTarget === "adicional" ? yaVinculada : false,
      ocupadaPorFolio: ocupada && !esAdicionalActual ? ocupada.folio : null,
    });
  }
  return rows;
}

const base = (id: string, folio: string): CotizacionResumen => ({
  id,
  origen: "digitalflow",
  folio,
  cliente: "Acme",
  fecha: "2026-09-01",
});

describe("annotatePickerRows", () => {
  it("hides already linked principales and marks ocupadas", () => {
    const rows = annotatePickerRows({
      results: [base("df-1", "1"), base("df-2", "2"), base("df-3", "3")],
      pickerTarget: "principal",
      vinculadas: new Set(["df-1"]),
      ocupadasById: { "df-2": { id: 9, folio: "PRJ-10009" } },
      adicionalId: null,
    });
    expect(rows.map((r) => r.id)).toEqual(["df-2", "df-3"]);
    expect(rows[0].ocupadaPorFolio).toBe("PRJ-10009");
    expect(rows[1].ocupadaPorFolio).toBeNull();
  });

  it("marks principal as blocked when picking adicional", () => {
    const rows = annotatePickerRows({
      results: [base("df-1", "1")],
      pickerTarget: "adicional",
      vinculadas: new Set(["df-1"]),
      ocupadasById: {},
      adicionalId: null,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].yaVinculada).toBe(true);
  });
});
