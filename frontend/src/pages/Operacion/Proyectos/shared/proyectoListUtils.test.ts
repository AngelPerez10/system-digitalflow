import { describe, expect, it } from "vitest";
import { createEmptyProyectoDraft } from "./proyectoFormUtils";
import {
  countSecondaryProyectoFilters,
  proyectoIncluyeUsuario,
  proyectoMatchesSecondaryFilters,
  proyectoPeriodo,
  proyectoTeam,
  shiftYearMonth,
} from "./proyectoListUtils";
import type { ProyectoDraft, ProyectoRow } from "./proyectoTypes";

function row(patch: Partial<ProyectoDraft> = {}, fecha = "2026-09-10"): ProyectoRow {
  return {
    id: "1",
    folio: "PRJ-1",
    cliente: "Cliente",
    fecha,
    estado: "en_proceso",
    cotizacionFolio: "—",
    cotizacionOrigen: "digitalflow",
    cotizacionesCount: 0,
    equiposTotal: 0,
    equiposEntregados: 0,
    equiposInstalados: 0,
    draft: { ...createEmptyProyectoDraft(), ...patch },
  };
}

const sinFiltros = { tipos: [], date: "", tecnicoId: null };

describe("proyectoTeam", () => {
  it("pone al responsable primero y agrega auxiliares al final", () => {
    const team = proyectoTeam(
      row({
        tecnicos: [
          { id: 2, nombre: "Ana", responsable: false },
          { id: 3, nombre: "Luis", responsable: true },
        ],
        auxiliares: [{ id: 9, nombre: "Pepe" }],
      })
    );
    expect(team.responsable?.nombre).toBe("Luis");
    expect(team.todos.map((p) => p.id)).toEqual([3, 2, 9]);
  });

  it("propaga avatar_url del equipo", () => {
    const team = proyectoTeam(
      row({
        tecnicos: [
          {
            id: 3,
            nombre: "Luis",
            responsable: true,
            avatar_url: "https://cdn.example/luis.jpg",
          },
        ],
        auxiliares: [{ id: 9, nombre: "Pepe", avatar_url: "" }],
      })
    );
    expect(team.responsable?.avatar_url).toBe("https://cdn.example/luis.jpg");
    expect(team.todos[0].avatar_url).toBe("https://cdn.example/luis.jpg");
  });
});

describe("proyectoIncluyeUsuario", () => {
  it("reconoce técnicos y auxiliares", () => {
    const r = row({
      tecnicos: [{ id: 2, nombre: "Ana", responsable: true }],
      auxiliares: [{ id: 9, nombre: "Pepe" }],
    });
    expect(proyectoIncluyeUsuario(r, 2)).toBe(true);
    expect(proyectoIncluyeUsuario(r, 9)).toBe(true);
    expect(proyectoIncluyeUsuario(r, 7)).toBe(false);
    expect(proyectoIncluyeUsuario(r, null)).toBe(false);
  });
});

describe("proyectoPeriodo", () => {
  it("calcula el rango y el día en curso", () => {
    const r = row({ fechasInicio: ["2026-09-12", "2026-09-10", "2026-09-11"] });
    const p = proyectoPeriodo(r, new Date(2026, 8, 11));
    expect(p).toEqual({ desde: "2026-09-10", hasta: "2026-09-12", dias: 3, diaActual: 2 });
  });

  it("devuelve null sin jornadas y diaActual null fuera del rango", () => {
    expect(proyectoPeriodo(row({ fechasInicio: [""] }))).toBeNull();
    expect(proyectoPeriodo(row({ fechasInicio: ["2026-09-10"] }), new Date(2026, 8, 20))?.diaActual).toBeNull();
  });
});

describe("proyectoMatchesSecondaryFilters", () => {
  it("filtra por técnico, sin asignar, tipo y fecha", () => {
    const conAna = row({
      tecnicos: [{ id: 2, nombre: "Ana", responsable: true }],
      tiposTrabajo: [{ id: 1, nombre: "Alarmas" }],
    });
    const sinTecnico = row();

    expect(proyectoMatchesSecondaryFilters(conAna, { ...sinFiltros, tecnicoId: 2 })).toBe(true);
    expect(proyectoMatchesSecondaryFilters(conAna, { ...sinFiltros, tecnicoId: 3 })).toBe(false);
    expect(proyectoMatchesSecondaryFilters(sinTecnico, { ...sinFiltros, tecnicoId: 0 })).toBe(true);
    expect(proyectoMatchesSecondaryFilters(conAna, { ...sinFiltros, tecnicoId: 0 })).toBe(false);
    expect(proyectoMatchesSecondaryFilters(conAna, { ...sinFiltros, tipos: ["Alarmas"] })).toBe(true);
    expect(proyectoMatchesSecondaryFilters(conAna, { ...sinFiltros, tipos: ["CCTV"] })).toBe(false);
    expect(proyectoMatchesSecondaryFilters(conAna, { ...sinFiltros, date: "2026-09-10" })).toBe(true);
    expect(proyectoMatchesSecondaryFilters(conAna, { ...sinFiltros, date: "2026-09-11" })).toBe(false);
  });

  it("cuenta los filtros activos", () => {
    expect(countSecondaryProyectoFilters(sinFiltros)).toBe(0);
    expect(countSecondaryProyectoFilters({ tipos: ["A"], date: "2026-01-01", tecnicoId: 0 })).toBe(3);
  });
});

describe("shiftYearMonth", () => {
  it("cruza límites de año", () => {
    expect(shiftYearMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftYearMonth("2026-12", 1)).toBe("2027-01");
  });
});
