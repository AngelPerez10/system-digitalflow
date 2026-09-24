import { describe, expect, it } from "vitest";
import { createEmptyProyectoDraft } from "@/pages/Operacion/Proyectos/shared/proyectoFormUtils";
import type { ProyectoDraft, ProyectoRow } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
import {
  addDaysKey,
  countByStatus,
  dayLabel,
  diasAtraso,
  groupAgenda,
  normalizeStatus,
  ordenToItem,
  overlapsRange,
  pendientesBuckets,
  proyectoToItem,
  statusLabel,
  type CalendarItem,
} from "./calendarModel";

const item = (id: number, start: string, end = start, hora = "", status: CalendarItem["status"] = "pendiente"): CalendarItem => ({
  id: `orden-${id}`,
  kind: "orden",
  recordId: id,
  folio: `ODT-${id}`,
  cliente: "C",
  tecnico: "",
  direccion: "",
  descripcion: "",
  status,
  start,
  end,
  horaInicio: hora,
  horaTermino: "",
  avance: null,
});

function proyecto(patch: Partial<ProyectoDraft> = {}, estado: ProyectoRow["estado"] = "en_proceso"): ProyectoRow {
  return {
    id: "15",
    folio: "PRJ-15",
    cliente: "ACME",
    fecha: "2026-09-01",
    estado,
    cotizacionFolio: "—",
    cotizacionOrigen: "digitalflow",
    cotizacionesCount: 0,
    equiposTotal: 0,
    equiposEntregados: 0,
    equiposInstalados: 0,
    draft: { ...createEmptyProyectoDraft(), ...patch },
  };
}

describe("ordenToItem", () => {
  it("usa fecha de inicio/fin, hora y estado normalizado", () => {
    const it0 = ordenToItem({
      id: 7,
      idx: 12,
      cliente: " ACME ",
      fecha_inicio: "2026-09-10T00:00:00Z",
      fecha_finalizacion: "2026-09-12",
      hora_inicio: "09:30:00",
      status: "resuelto",
    });
    expect(it0).toMatchObject({ kind: "orden", recordId: 7, cliente: "ACME", start: "2026-09-10", end: "2026-09-12", horaInicio: "09:30", status: "resuelto" });
  });

  it("cae a fecha de creación y corrige fin anterior al inicio", () => {
    expect(ordenToItem({ id: 1, fecha_creacion: "2026-09-05", fecha_finalizacion: "2026-09-01" })).toMatchObject({
      start: "2026-09-05",
      end: "2026-09-05",
      cliente: "Sin cliente",
    });
    expect(ordenToItem({ id: 2 })).toBeNull();
  });
});

describe("proyectoToItem", () => {
  it("usa las jornadas como periodo y trae responsable, tipos y avance", () => {
    const it0 = proyectoToItem(
      proyecto({
        fechasInicio: ["2026-09-12", "2026-09-10", "2026-09-11"],
        tecnicos: [{ id: 3, nombre: "Luis", responsable: true }],
        tiposTrabajo: [{ id: 1, nombre: "CCTV" }],
        porcentajeAvance: 40,
      })
    );
    expect(it0).toMatchObject({
      kind: "proyecto",
      recordId: 15,
      start: "2026-09-10",
      end: "2026-09-12",
      tecnico: "Luis",
      descripcion: "CCTV",
      avance: 40,
      status: "pendiente",
    });
  });

  it("sin jornadas cae a la fecha del proyecto y mapea el estado", () => {
    const it0 = proyectoToItem(proyecto({ fechasInicio: [""] }, "cerrado"));
    expect(it0).toMatchObject({ start: "2026-09-01", end: "2026-09-01", status: "resuelto" });
    expect(statusLabel(it0!)).toBe("Cerrado");
  });
});

describe("normalizeStatus", () => {
  it("unifica estados de órdenes y proyectos", () => {
    expect(normalizeStatus("pausado")).toBe("pausado");
    expect(normalizeStatus("cerrado")).toBe("resuelto");
    expect(normalizeStatus("CANCELADO")).toBe("cancelada");
    expect(normalizeStatus("en_proceso")).toBe("pendiente");
    expect(normalizeStatus(null)).toBe("pendiente");
  });
});

describe("fechas", () => {
  it("suma días cruzando mes y año sin pasar por UTC", () => {
    expect(addDaysKey("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("detecta traslape con el rango visible", () => {
    expect(overlapsRange(item(1, "2026-08-30", "2026-09-02"), "2026-09-01", "2026-10-01")).toBe(true);
    expect(overlapsRange(item(1, "2026-10-01"), "2026-09-01", "2026-10-01")).toBe(false);
    expect(overlapsRange(item(1, "2026-08-01", "2026-08-31"), "2026-09-01", "2026-10-01")).toBe(false);
  });

  it("etiqueta hoy, mañana y ayer", () => {
    const today = new Date(2026, 8, 24);
    expect(dayLabel("2026-09-24", today)).toBe("Hoy");
    expect(dayLabel("2026-09-25", today)).toBe("Mañana");
    expect(dayLabel("2026-09-23", today)).toBe("Ayer");
  });
});

describe("pendientesBuckets", () => {
  const today = new Date(2026, 8, 24);

  it("separa atrasados, hoy y próximos 7 días; ignora terminados y cancelados", () => {
    const b = pendientesBuckets(
      [
        item(1, "2026-09-20", "2026-09-22"), // atrasado 2 días
        item(2, "2026-09-10", "2026-09-15", "", "pausado"), // atrasado (pausado cuenta)
        item(3, "2026-09-23", "2026-09-25"), // en curso hoy
        item(4, "2026-09-24", "2026-09-24", "08:00"), // hoy
        item(5, "2026-09-28"), // próximos
        item(6, "2026-10-05"), // fuera de la semana
        item(7, "2026-09-20", "2026-09-20", "", "resuelto"), // terminado
        item(8, "2026-09-24", "2026-09-24", "", "cancelada"), // cancelado
      ],
      today
    );
    expect(b.atrasados.map((i) => i.recordId)).toEqual([1, 2]);
    expect(b.hoy.map((i) => i.recordId)).toEqual([3, 4]);
    expect(b.proximos.map((i) => i.recordId)).toEqual([5]);
  });

  it("calcula días de atraso", () => {
    expect(diasAtraso({ end: "2026-09-22" }, today)).toBe(2);
    expect(diasAtraso({ end: "2026-09-24" }, today)).toBe(0);
    expect(diasAtraso({ end: "2026-09-30" }, today)).toBe(0);
  });
});

describe("groupAgenda / countByStatus", () => {
  it("agrupa por primer día visible y ordena por hora", () => {
    const days = groupAgenda(
      [item(1, "2026-09-03", "2026-09-03", "14:00"), item(2, "2026-09-03", "2026-09-03", "08:00"), item(3, "2026-08-28", "2026-09-02"), item(4, "2026-10-02")],
      "2026-09-01",
      "2026-10-01"
    );
    expect(days.map((d) => d.key)).toEqual(["2026-09-01", "2026-09-03"]);
    expect(days[1].items.map((i) => i.recordId)).toEqual([2, 1]);
  });

  it("cuenta por estado", () => {
    const a = item(1, "2026-09-01");
    const b = item(2, "2026-09-01", "2026-09-01", "", "resuelto");
    expect(countByStatus([a, b, a])).toEqual({ pendiente: 2, pausado: 0, resuelto: 1, cancelada: 0 });
  });
});
