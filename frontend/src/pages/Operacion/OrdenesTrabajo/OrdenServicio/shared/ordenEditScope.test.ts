import { describe, expect, it } from "vitest";
import type { Orden } from "./ordenesPageTypes";
import { isOrdenLimitedEdit, isOrdenOwnedByUser } from "./ordenEditScope";
import { isOrdenesOwnOnly } from "../useOrdenesPagePermissions";

function orden(partial: Partial<Orden> & { id: number }): Orden {
  return {
    folio: partial.folio ?? `ODT-${partial.id}`,
    cliente: partial.cliente ?? "Cliente",
    status: partial.status ?? "PENDIENTE",
    fotos_urls: partial.fotos_urls ?? [],
    tecnico_asignado: null,
    creado_por: null,
    ...partial,
  } as Orden;
}

describe("ordenEditScope + own_only", () => {
  it("marca como propia si es técnico asignado o creador", () => {
    expect(isOrdenOwnedByUser(orden({ id: 1, tecnico_asignado: 7 }), 7)).toBe(true);
    expect(isOrdenOwnedByUser(orden({ id: 2, creado_por: 7 }), 7)).toBe(true);
    expect(isOrdenOwnedByUser(orden({ id: 3, tecnico_asignado: 9 }), 7)).toBe(false);
  });

  it("con own_only true limita edición de órdenes ajenas", () => {
    expect(
      isOrdenLimitedEdit({
        orden: orden({ id: 1, tecnico_asignado: 9 }),
        userId: 7,
        isAdmin: false,
        canEdit: true,
        ownOnly: true,
      }),
    ).toBe(true);
  });

  it("con «Ver todas las órdenes» (own_only false) no limita edición ajena", () => {
    expect(
      isOrdenLimitedEdit({
        orden: orden({ id: 1, tecnico_asignado: 9 }),
        userId: 7,
        isAdmin: false,
        canEdit: true,
        ownOnly: false,
      }),
    ).toBe(false);
  });

  it("isOrdenesOwnOnly alinea default con backend (técnico sin bandera = solo propias)", () => {
    expect(isOrdenesOwnOnly({}, false)).toBe(true);
    expect(isOrdenesOwnOnly({ ordenes: { view: true, own_only: false } }, false)).toBe(false);
    expect(isOrdenesOwnOnly({ ordenes: { view: true, own_only: true } }, false)).toBe(true);
    expect(isOrdenesOwnOnly({ ordenes: { view: true, own_only: true } }, true)).toBe(false);
  });
});
