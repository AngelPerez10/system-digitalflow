import { describe, expect, it } from "vitest";
import { CAA_FILTROS_DEFAULT, agruparCuentas, agruparUnidades, filtrosActivos, pasaFiltros } from "./cuentasAntarixFiltros";
import type { WialonUnitSearchEntry, WialonUserRow } from "./wialonTypes";

const row = (id: number, o: Partial<WialonUserRow>): WialonUserRow => ({
  wialon_id: id,
  user_id: `u${id}`,
  name: `Cuenta ${id}`,
  creator: "",
  parent_account: "",
  dealer_rights: "No",
  assigned_units: 3,
  status: "Activo",
  blocked: "No",
  ...o,
});

const rows = [
  row(1, { name: "Zeta" }),
  row(2, { name: "Beta", assigned_units: 0 }),
  row(3, { name: "Alfa", status: "Bloqueado", blocked: "01/09/2026" }),
  row(4, { name: "Gamma", status: "Bloqueado", assigned_units: 0 }),
  row(5, { name: "Delta", dealer_rights: "Sí" }),
];

describe("agruparCuentas", () => {
  it("ordena bloqueadas → sin unidades → con unidades, y por nombre dentro de cada una", () => {
    const s = agruparCuentas(rows);
    expect(s.map((x) => x.key)).toEqual(["bloqueadas", "sin_unidades", "con_unidades"]);
    expect(s[0].rows.map((r) => r.name)).toEqual(["Alfa", "Gamma"]);
    expect(s[1].rows.map((r) => r.name)).toEqual(["Beta"]);
    expect(s[2].rows.map((r) => r.name)).toEqual(["Delta", "Zeta"]);
  });

  it("omite secciones vacías", () => {
    expect(agruparCuentas([rows[0]]).map((x) => x.key)).toEqual(["con_unidades"]);
  });
});

describe("pasaFiltros", () => {
  const ids = (f: Parameters<typeof pasaFiltros>[1]) => rows.filter((r) => pasaFiltros(r, f)).map((r) => r.wialon_id);

  it("por defecto deja pasar todo", () => {
    expect(ids(CAA_FILTROS_DEFAULT)).toEqual([1, 2, 3, 4, 5]);
  });
  it("filtra por estado, unidades y distribuidor", () => {
    expect(ids({ ...CAA_FILTROS_DEFAULT, estado: "bloqueadas" })).toEqual([3, 4]);
    expect(ids({ ...CAA_FILTROS_DEFAULT, estado: "activas", unidades: "sin" })).toEqual([2]);
    expect(ids({ ...CAA_FILTROS_DEFAULT, soloDistribuidores: true })).toEqual([5]);
  });
  it("cuenta los filtros activos", () => {
    expect(filtrosActivos({ estado: "activas", unidades: "sin", soloDistribuidores: true })).toBe(3);
  });
});

describe("agruparUnidades", () => {
  const u = (id: number, o: Partial<WialonUnitSearchEntry>): WialonUnitSearchEntry => ({
    unit_id: id,
    name: `U${id}`,
    uid: "",
    status: "Activo",
    users: [{ wialon_id: 1, user_id: "a", name: "A" }],
    ...o,
  });

  it("ordena inactivas → sin cuenta → activas", () => {
    const s = agruparUnidades([
      u(1, {}),
      u(2, { users: [] }),
      u(3, { status: "Inactivo", users: [] }),
      u(4, { status: undefined, is_active: false }),
    ]);
    expect(s.map((x) => [x.key, x.rows.map((r) => r.unit_id)])).toEqual([
      ["inactivas", [3, 4]],
      ["sin_cuenta", [2]],
      ["activas", [1]],
    ]);
  });
});
