import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Alert from "./Alert";

const renderAlert = (props: Partial<Parameters<typeof Alert>[0]> = {}) =>
  render(
    <MemoryRouter>
      <Alert variant="success" title="Guardado" message="Cambios aplicados" {...props} />
    </MemoryRouter>,
  );

/** La salida espera el fin de la animación; en jsdom entra el respaldo de 320 ms. */
const finishLeave = () => act(() => vi.advanceTimersByTime(400));

describe("Alert (toast)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById("df-alert-toast-host")?.remove();
  });

  it("se muestra arriba a la derecha y se cierra sola", () => {
    const onClose = vi.fn();
    renderAlert({ onClose });
    expect(screen.getByRole("status")).toHaveTextContent("Guardado");
    expect(document.getElementById("df-alert-toast-host")).toContainElement(screen.getByRole("status"));

    act(() => vi.advanceTimersByTime(4000));
    finishLeave();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("se pausa mientras el cursor está encima", () => {
    const onClose = vi.fn();
    renderAlert({ onClose });
    const wrapper = screen.getByRole("status").parentElement as HTMLElement;

    act(() => vi.advanceTimersByTime(2000));
    fireEvent.mouseEnter(wrapper);
    act(() => vi.advanceTimersByTime(10000));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseLeave(wrapper);
    act(() => vi.advanceTimersByTime(2100));
    finishLeave();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("el botón cerrar la quita", () => {
    const onClose = vi.fn();
    renderAlert({ onClose, autoHideMs: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    finishLeave();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("los errores se anuncian como alerta", () => {
    renderAlert({ variant: "error", title: "Falló" });
    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
  });

  it("inline: sin cerrar ni temporizador", () => {
    const onClose = vi.fn();
    renderAlert({ placement: "inline", onClose });
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar aviso" })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
