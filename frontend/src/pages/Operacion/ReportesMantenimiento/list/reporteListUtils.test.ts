import { describe, expect, it } from "vitest";
import type { ReporteMantenimiento } from "../reporteTypes";
import {
  baseDelListado,
  busquedaActiva,
  filtrarPorEvidencia,
  formatFechaCorta,
  ordenarReportes,
  resumenReportes,
  seccionesPorEvidencia,
  tecnicosDeReportes,
} from "./reporteListUtils";

const sec = (antes: number, despues: number) => ({
  id: `s${antes}${despues}`,
  titulo: "Zona",
  fotos_antes: Array.from({ length: antes }, (_, i) => `a${i}`),
  fotos_despues: Array.from({ length: despues }, (_, i) => `d${i}`),
});

const rm = (idx: number, fecha: string, tecnicos: string, secciones = [sec(1, 1)], cliente = `Cliente ${idx}`): ReporteMantenimiento => ({
  id: idx,
  idx,
  folio: `RM-${idx}`,
  orden_id: idx,
  proyecto_id: null,
  origen_tipo: "orden",
  orden_folio: `ODT-${idx}`,
  orden_cliente: cliente,
  fecha_servicio: fecha,
  tecnico_nombre: tecnicos,
  foto_orden_url: "",
  secciones,
});

const rows = [
  rm(1, "2026-07-10", "Ana Pérez"),
  rm(2, "2026-09-20", "Ana Pérez, Luis Gómez", []),
  rm(3, "2026-09-05", "Luis Gómez"),
  rm(4, "2026-09-25", "Ana Pérez, Luis Gómez", [sec(2, 3)], "Tostadería B1"),
];

describe("baseDelListado", () => {
  it("muestra solo el mes elegido", () => {
    expect(baseDelListado(rows, { q: "", mes: "2026-09", fecha: "", tecnico: "" }).map((r) => r.idx).sort()).toEqual([2, 3, 4]);
  });

  it("con búsqueda de 2+ caracteres recorre todos los meses", () => {
    expect(busquedaActiva("a")).toBe(false);
    expect(busquedaActiva("an")).toBe(true);
    expect(baseDelListado(rows, { q: "ana", mes: "2026-09", fecha: "", tecnico: "" }).map((r) => r.idx).sort()).toEqual([1, 2, 4]);
  });

  it("filtra por técnico aunque el reporte tenga varios", () => {
    expect(baseDelListado(rows, { q: "", mes: "2026-09", fecha: "", tecnico: "Luis Gómez" }).map((r) => r.idx).sort()).toEqual([2, 3, 4]);
    expect(baseDelListado(rows, { q: "", mes: "2026-07", fecha: "", tecnico: "Luis Gómez" })).toHaveLength(0);
  });

  it("con un día elegido ignora el mes", () => {
    expect(baseDelListado(rows, { q: "", mes: "2026-09", fecha: "2026-07-10", tecnico: "" }).map((r) => r.idx)).toEqual([1]);
  });

  it("busca por cliente y folio", () => {
    expect(baseDelListado(rows, { q: "tostadería", mes: "2026-09", fecha: "", tecnico: "" }).map((r) => r.idx)).toEqual([4]);
  });
});

describe("evidencia, secciones y orden", () => {
  it("filtra y agrupa por evidencia", () => {
    expect(filtrarPorEvidencia(rows, "sin").map((r) => r.idx)).toEqual([2]);
    expect(filtrarPorEvidencia(rows, "con")).toHaveLength(3);
    const s = seccionesPorEvidencia(rows);
    expect(s.map((x) => [x.key, x.rows.length])).toEqual([["CON", 3], ["SIN", 1]]);
    expect(seccionesPorEvidencia([rows[1]]).map((x) => x.key)).toEqual(["SIN"]);
  });

  it("ordena del más reciente al más antiguo", () => {
    expect(ordenarReportes(rows).map((r) => r.idx)).toEqual([4, 2, 3, 1]);
  });
});

describe("tecnicosDeReportes, resumenReportes y fechas", () => {
  it("cuenta reportes por técnico", () => {
    expect(tecnicosDeReportes(rows)).toEqual([
      { nombre: "Ana Pérez", total: 3 },
      { nombre: "Luis Gómez", total: 3 },
    ]);
  });

  it("resume evidencia, fotos y técnicos", () => {
    expect(resumenReportes(rows)).toEqual({ total: 4, conEvidencia: 3, sinEvidencia: 1, totalFotos: 9, tecnicos: 2 });
  });

  it("formatea la fecha corta", () => {
    expect(formatFechaCorta("2026-09-30")).toBe("30 sep 2026");
    expect(formatFechaCorta("")).toBe("—");
  });
});
