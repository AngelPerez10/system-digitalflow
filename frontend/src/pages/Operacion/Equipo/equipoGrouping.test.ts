import { describe, expect, it } from "vitest";
import type { Orden, Usuario } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { createEmptyProyectoDraft } from "../Proyectos/shared/proyectoFormUtils";
import { proyectoTeam } from "../Proyectos/shared/proyectoListUtils";
import type { ProyectoRow } from "../Proyectos/shared/proyectoTypes";
import {
  aplicarEquipoProyecto,
  buildEquipoSecciones,
  equipoActualProyecto,
  moverEquipoProyecto,
  proyectoRolDe,
} from "./equipoGrouping";

function orden(partial: Partial<Orden> & { id: number }): Orden {
  return {
    folio: partial.folio ?? `ODT-${partial.id}`,
    cliente: partial.cliente ?? "Cliente",
    status: partial.status ?? "pendiente",
    fotos_urls: partial.fotos_urls ?? [],
    tecnico_asignado: null,
    creado_por: null,
    ...partial,
  } as Orden;
}

function proyecto(
  partial: Partial<ProyectoRow> & {
    id: string;
    tecnicos?: { id: number; nombre: string; responsable?: boolean }[];
    auxiliares?: { id: number; nombre: string }[];
  }
): ProyectoRow {
  const draft = createEmptyProyectoDraft();
  if (partial.tecnicos) {
    draft.tecnicos = partial.tecnicos.map((t, i) => ({
      id: t.id,
      nombre: t.nombre,
      avatar_url: "",
      responsable: t.responsable ?? i === 0,
    }));
  }
  if (partial.auxiliares) {
    draft.auxiliares = partial.auxiliares.map((a) => ({ id: a.id, nombre: a.nombre, avatar_url: "" }));
  }
  return {
    id: partial.id,
    folio: partial.folio ?? `PRJ-${partial.id}`,
    cliente: partial.cliente ?? "Cliente",
    fecha: partial.fecha ?? "2026-08-01",
    estado: partial.estado ?? "en_proceso",
    cotizacionFolio: "—",
    cotizacionOrigen: "digitalflow",
    cotizacionesCount: 0,
    equiposTotal: 0,
    equiposEntregados: 0,
    equiposInstalados: 0,
    draft,
  };
}

function usuario(id: number, first_name: string, last_name: string): Usuario {
  return { id, first_name, last_name, email: `${first_name}@x.com`.toLowerCase() };
}

const ana = { id: 1, nombre: "Ana Pérez" };
const beto = { id: 2, nombre: "Beto Ruiz" };
const caro = { id: 3, nombre: "Caro Díaz" };

describe("buildEquipoSecciones", () => {
  const usuarios = [usuario(1, "Ana", "Pérez"), usuario(2, "Beto", "Ruiz")];

  it("«Sin asignar» siempre va primero, luego técnicos por nombre", () => {
    const secciones = buildEquipoSecciones(
      [orden({ id: 1, tecnico_asignado: 2 }), orden({ id: 2, tecnico_asignado: 1 })],
      [],
      usuarios
    );
    expect(secciones.map((s) => s.tecnico.nombre)).toEqual(["Sin asignar", "Ana Pérez", "Beto Ruiz"]);
    expect(secciones[1].ordenes.map((o) => o.id)).toEqual([2]);
    expect(secciones[2].ordenes.map((o) => o.id)).toEqual([1]);
  });

  it("incluye a los técnicos de la plantilla aunque no tengan carga (para soltarles trabajo)", () => {
    const secciones = buildEquipoSecciones([], [], [], usuarios);
    expect(secciones.map((s) => s.tecnico.nombre)).toEqual(["Sin asignar", "Ana Pérez", "Beto Ruiz"]);
    expect(secciones.every((s) => s.ordenes.length === 0 && s.proyectos.length === 0)).toBe(true);
  });

  it("órdenes sin técnico caen en «Sin asignar»", () => {
    const secciones = buildEquipoSecciones([orden({ id: 2, tecnico_asignado: null })], [], usuarios);
    expect(secciones[0].ordenes.map((o) => o.id)).toEqual([2]);
  });

  it("un proyecto con varios técnicos aparece en la columna de cada uno", () => {
    const p = proyecto({ id: "p1", tecnicos: [ana, beto] });
    const secciones = buildEquipoSecciones([], [p], usuarios);
    expect(secciones[1].proyectos.map((r) => r.id)).toEqual(["p1"]);
    expect(secciones[2].proyectos.map((r) => r.id)).toEqual(["p1"]);
  });

  it("abiertos primero dentro de la columna", () => {
    const secciones = buildEquipoSecciones(
      [
        orden({ id: 1, tecnico_asignado: 1, status: "resuelto", fecha_inicio: "2026-08-20" }),
        orden({ id: 2, tecnico_asignado: 1, status: "pendiente", fecha_inicio: "2026-08-01" }),
      ],
      [],
      usuarios
    );
    expect(secciones[1].ordenes.map((o) => o.id)).toEqual([2, 1]);
  });

  it("cuenta la carga: órdenes abiertas + proyectos activos", () => {
    const secciones = buildEquipoSecciones(
      [
        orden({ id: 1, tecnico_asignado: 1, status: "pendiente" }),
        orden({ id: 2, tecnico_asignado: 1, status: "resuelto" }),
      ],
      [proyecto({ id: "p1", tecnicos: [ana], estado: "en_proceso" })],
      usuarios
    );
    expect(secciones[1].pendientes).toBe(2);
  });

  it("asignado fuera del catálogo toma el nombre de la orden", () => {
    const secciones = buildEquipoSecciones(
      [orden({ id: 1, tecnico_asignado: 99, tecnico_asignado_full_name: "Zoe Luna" })],
      [],
      usuarios
    );
    expect(secciones.map((s) => s.tecnico.nombre)).toContain("Zoe Luna");
  });
});

describe("moverEquipoProyecto", () => {
  it("técnico → otro técnico: toma su lugar y su marca de responsable", () => {
    const p = proyecto({ id: "p1", tecnicos: [ana, beto] });
    const eq = moverEquipoProyecto(p, 1, caro);
    expect(eq.tecnicos).toEqual([
      { id: 3, nombre: "Caro Díaz", responsable: true },
      { id: 2, nombre: "Beto Ruiz", responsable: false },
    ]);
  });

  it("si el destino ya está en el equipo solo sale el origen (sin duplicar)", () => {
    const p = proyecto({ id: "p1", tecnicos: [ana, beto] });
    const eq = moverEquipoProyecto(p, 1, beto);
    expect(eq.tecnicos).toEqual([{ id: 2, nombre: "Beto Ruiz", responsable: true }]);
  });

  it("auxiliar → otro: el destino entra como auxiliar", () => {
    const p = proyecto({ id: "p1", tecnicos: [ana], auxiliares: [beto] });
    const eq = moverEquipoProyecto(p, 2, caro);
    expect(eq.auxiliares).toEqual([{ id: 3, nombre: "Caro Díaz" }]);
    expect(eq.tecnicos.map((t) => t.id)).toEqual([1]);
  });

  it("un auxiliar que hereda lugar de técnico deja de ser auxiliar", () => {
    const p = proyecto({ id: "p1", tecnicos: [ana], auxiliares: [beto] });
    const eq = moverEquipoProyecto(p, 1, beto);
    expect(eq.tecnicos).toEqual([{ id: 2, nombre: "Beto Ruiz", responsable: true }]);
    expect(eq.auxiliares).toEqual([]);
  });

  it("desde «Sin asignar» el destino entra como responsable", () => {
    const p = proyecto({ id: "p1", tecnicos: [] });
    const eq = moverEquipoProyecto(p, null, ana);
    expect(eq.tecnicos).toEqual([{ id: 1, nombre: "Ana Pérez", responsable: true }]);
  });

  it("hacia «Sin asignar» sale el origen y se promueve otro responsable", () => {
    const p = proyecto({ id: "p1", tecnicos: [ana, beto] });
    const eq = moverEquipoProyecto(p, 1, null);
    expect(eq.tecnicos).toEqual([{ id: 2, nombre: "Beto Ruiz", responsable: true }]);
  });
});

describe("equipoActualProyecto / aplicarEquipoProyecto", () => {
  it("aplicar y leer el equipo son inversos (sirve para deshacer)", () => {
    const p = proyecto({ id: "p1", tecnicos: [ana, beto], auxiliares: [caro] });
    const antes = equipoActualProyecto(p);
    const movido = aplicarEquipoProyecto(p, moverEquipoProyecto(p, 1, null));
    expect(proyectoTeam(movido).todos.map((m) => m.id)).toEqual([2, 3]);
    const restaurado = aplicarEquipoProyecto(movido, antes);
    expect(equipoActualProyecto(restaurado)).toEqual(antes);
  });

  it("sincroniza el técnico legacy con el responsable", () => {
    const p = proyecto({ id: "p1", tecnicos: [ana] });
    const r = aplicarEquipoProyecto(p, { tecnicos: [{ id: 2, nombre: "Beto Ruiz", responsable: true }], auxiliares: [] });
    expect(r.draft.tecnico.id).toBe(2);
    expect(proyectoRolDe(r, 2)).toBe("responsable");
  });

  it("sin técnicos limpia el técnico legacy (no reaparece el anterior)", () => {
    const p = proyecto({ id: "p1", tecnicos: [ana] });
    const r = aplicarEquipoProyecto(p, { tecnicos: [], auxiliares: [] });
    expect(r.draft.tecnico.id).toBeNull();
    expect(proyectoTeam(r).todos).toEqual([]);
  });
});
