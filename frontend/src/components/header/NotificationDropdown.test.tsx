import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useNotificaciones", () => ({ useNotificaciones: vi.fn() }));
const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));

// motion/react: sin animaciones en jsdom (AnimatePresence quita al desmontar).
vi.mock("motion/react", async () => {
  const React = await import("react");
  const MOTION_ONLY = new Set([
    "layout", "drag", "dragConstraints", "dragElastic", "dragSnapToOrigin",
    "dragMomentum", "onDragEnd", "onDragStart", "initial", "animate", "exit",
    "transition", "variants", "whileHover", "whileTap", "whileFocus", "style",
  ]);
  const make = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
      const clean: Record<string, unknown> = { ref };
      for (const [k, v] of Object.entries(props)) if (!MOTION_ONLY.has(k)) clean[k] = v;
      return React.createElement(tag, clean, props.children as React.ReactNode);
    });
  const cache: Record<string, unknown> = {};
  const motion = new Proxy({}, {
    get: (_t, tag: string) => (cache[tag] ??= make(tag)),
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useReducedMotion: () => true,
  };
});

import { useAuth } from "@/context/AuthContext";
import { useNotificaciones } from "@/hooks/useNotificaciones";
import NotificationDropdown from "./NotificationDropdown";

const mockUseAuth = vi.mocked(useAuth);
const mockUseNotificaciones = vi.mocked(useNotificaciones);

const notif = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  tipo: "orden_prioridad_escalada",
  titulo: "Prioridad subió a Alta",
  cuerpo: "ODT-1200 · ACME · 100 h sin resolver",
  url: "/ordenes?abrir=1200",
  ref_tipo: "orden",
  ref_id: 1200,
  leida: false,
  leida_at: null,
  created_at: new Date().toISOString(),
  ...over,
});

const baseHook = {
  items: [] as ReturnType<typeof notif>[],
  noLeidas: 0,
  loading: false,
  error: false,
  cargarLista: vi.fn(),
  marcarLeida: vi.fn(),
  marcarTodas: vi.fn(),
};

function setHook(over: Partial<typeof baseHook> = {}) {
  mockUseNotificaciones.mockReturnValue({ ...baseHook, ...over } as unknown as ReturnType<typeof useNotificaciones>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
  setHook();
});

describe("NotificationDropdown", () => {
  it("no renderiza nada sin sesión", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    const { container } = render(<NotificationDropdown />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el badge con el número de no leídas y lo anuncia", () => {
    setHook({ noLeidas: 4 });
    render(<NotificationDropdown />);
    expect(screen.getByRole("button", { name: /4 sin leer/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("4 notificaciones sin leer");
  });

  it("abre el panel al pulsar la campanita y pide la lista", () => {
    const cargarLista = vi.fn();
    setHook({ noLeidas: 1, items: [notif()], cargarLista });
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole("button", { name: /sin leer/i }));
    expect(screen.getByRole("dialog", { name: "Notificaciones" })).toBeInTheDocument();
    expect(cargarLista).toHaveBeenCalled();
    expect(screen.getByText("Prioridad subió a Alta")).toBeInTheDocument();
  });

  it("clic en una notificación la marca leída y navega", () => {
    const marcarLeida = vi.fn();
    setHook({ noLeidas: 1, items: [notif()], marcarLeida });
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole("button", { name: /sin leer/i }));
    fireEvent.click(screen.getByText("Prioridad subió a Alta"));
    expect(marcarLeida).toHaveBeenCalledWith(1);
    expect(navigateMock).toHaveBeenCalledWith("/ordenes?abrir=1200");
  });

  it("descartar oculta la tarjeta y la marca leída", () => {
    const marcarLeida = vi.fn();
    setHook({ noLeidas: 1, items: [notif()], marcarLeida });
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole("button", { name: /sin leer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Descartar: Prioridad subió a Alta/i }));
    expect(marcarLeida).toHaveBeenCalledWith(1);
    expect(screen.queryByText("Prioridad subió a Alta")).not.toBeInTheDocument();
    expect(screen.getByText("Sin novedades")).toBeInTheDocument();
  });

  it("«Marcar todas» llama a la acción del hook", () => {
    const marcarTodas = vi.fn();
    setHook({ noLeidas: 2, items: [notif(), notif({ id: 2, titulo: "Otra" })], marcarTodas });
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole("button", { name: /sin leer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcar todas" }));
    expect(marcarTodas).toHaveBeenCalled();
  });

  it("Escape cierra el panel", () => {
    setHook({ noLeidas: 1, items: [notif()] });
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole("button", { name: /sin leer/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("estado de error ofrece reintentar", () => {
    const cargarLista = vi.fn();
    setHook({ error: true, cargarLista });
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reintentar" }));
    expect(cargarLista).toHaveBeenCalled();
  });
});
