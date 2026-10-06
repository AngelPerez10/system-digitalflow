import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { todayIso } from "../shared/polizaVisitas";
import PolizasAgendaModal from "./PolizasAgendaModal";
import { addDiasIso, contarVisitasProximas, shiftMes } from "./polizaAgenda";
import { computePolizaEstado } from "./polizaEstado";
import type { PolizaRow } from "./polizaListTypes";

const HOY = todayIso();

const row = (id: number, cliente: string, visitas: string[]): PolizaRow => ({
  id,
  idx: id,
  folio: `POL-${id}`,
  clienteId: "1",
  cliente,
  tipo: "cctv",
  tipoLabel: "Videovigilancia CCTV",
  servicioTipo: "Preventivo",
  equiposAtendidos: "",
  cotizacionId: "1",
  cotizacionFolio: "COT-1",
  visitas,
  estado: computePolizaEstado(visitas, HOY),
});

const rows = [row(1, "HUGO ENRIQUE", [HOY, addDiasIso(HOY, 120)]), row(2, "Alfa SA", [addDiasIso(HOY, 2)])];

const mesLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

describe("PolizasAgendaModal", () => {
  it("muestra las próximas visitas y el resumen", () => {
    render(<PolizasAgendaModal open onClose={() => {}} rows={rows} />);
    expect(screen.getByText("Visitas de mantenimiento")).toBeTruthy();
    expect(screen.getByText("Hugo Enrique")).toBeTruthy();
    expect(screen.getByText("Alfa SA")).toBeTruthy();
    expect(screen.getByLabelText("Hoy", { selector: "section" })).toBeTruthy();
  });

  it("cambia de mes con las flechas", () => {
    render(<PolizasAgendaModal open onClose={() => {}} rows={rows} />);
    expect(screen.getByRole("grid", { name: mesLabel(HOY.slice(0, 7)) })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByRole("grid", { name: mesLabel(shiftMes(HOY.slice(0, 7), 1)) })).toBeTruthy();
  });

  it("al elegir un día muestra solo ese día y abre la póliza", () => {
    const onOpen = vi.fn();
    render(<PolizasAgendaModal open onClose={() => {}} rows={rows} onOpen={onOpen} />);
    const celdas = screen.getAllByRole("gridcell");
    const hoy = celdas.find((c) => c.getAttribute("aria-label")?.endsWith(": 1 visita") && c.textContent?.startsWith(String(Number(HOY.slice(8, 10)))));
    fireEvent.click(hoy!);
    expect(screen.getByText("Día elegido")).toBeTruthy();
    expect(screen.queryByText("Alfa SA")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Abrir POL-1/ }));
    expect(onOpen).toHaveBeenCalledWith(rows[0]);
  });

  it("cuenta las visitas de los próximos 7 días", () => {
    expect(contarVisitasProximas(rows, HOY, 7)).toBe(2);
  });
});
