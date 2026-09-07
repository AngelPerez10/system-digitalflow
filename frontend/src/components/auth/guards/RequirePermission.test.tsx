import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RequirePermission from "./RequirePermission";
import RequireCuentasAntarixPermission from "./RequireCuentasAntarixPermission";
import * as authContext from "@/context/AuthContext";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(authContext.useAuth);

const baseAuth = {
  user: null,
  isAdmin: false,
  isAuthenticated: true,
  loading: false,
  refresh: vi.fn(),
  applyLoginSession: vi.fn(),
  signOut: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RequirePermission (módulo ordenes)", () => {
  it("shows loading spinner while permissions load", () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, permissions: {}, loading: true });

    render(
      <RequirePermission module="ordenes" required="view">
        <div>Órdenes</div>
      </RequirePermission>
    );

    expect(screen.getByLabelText("Verificando permisos...")).toBeInTheDocument();
    expect(screen.queryByText("Órdenes")).not.toBeInTheDocument();
  });

  it("denies access when view is not explicitly true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { ordenes: { view: false } },
    });

    render(
      <RequirePermission module="ordenes" required="view">
        <div>Órdenes</div>
      </RequirePermission>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Acceso denegado");
    expect(screen.queryByText("Órdenes")).not.toBeInTheDocument();
  });

  it("allows access when view is true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { ordenes: { view: true } },
    });

    render(
      <RequirePermission module="ordenes" required="view">
        <div>Órdenes</div>
      </RequirePermission>
    );

    expect(screen.getByText("Órdenes")).toBeInTheDocument();
  });

  it("allows admins regardless of module permissions", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      isAdmin: true,
      permissions: { ordenes: {} },
    });

    render(
      <RequirePermission module="ordenes" required="create">
        <div>Crear orden</div>
      </RequirePermission>
    );

    expect(screen.getByText("Crear orden")).toBeInTheDocument();
  });
});

describe("RequirePermission (módulo tareas)", () => {
  it("denies create when create is not explicitly true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { tareas: { view: true, create: false } },
    });

    render(
      <RequirePermission module="tareas" required="create">
        <div>Nueva tarea</div>
      </RequirePermission>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Acceso denegado");
  });

  it("allows create when create is true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { tareas: { create: true } },
    });

    render(
      <RequirePermission module="tareas" required="create">
        <div>Nueva tarea</div>
      </RequirePermission>
    );

    expect(screen.getByText("Nueva tarea")).toBeInTheDocument();
  });
});

describe("RequirePermission (módulo cotizaciones)", () => {
  it("denies view when not explicitly true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { cotizaciones: { view: false } },
    });

    render(
      <RequirePermission module="cotizaciones" required="view">
        <div>Cotizaciones</div>
      </RequirePermission>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Acceso denegado");
  });

  it("allows view when true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { cotizaciones: { view: true } },
    });

    render(
      <RequirePermission module="cotizaciones" required="view">
        <div>Cotizaciones</div>
      </RequirePermission>
    );

    expect(screen.getByText("Cotizaciones")).toBeInTheDocument();
  });
});

describe("RequirePermission (módulo clientes)", () => {
  it("denies view when not explicitly true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { clientes: { view: false } },
    });

    render(
      <RequirePermission module="clientes" required="view">
        <div>Clientes</div>
      </RequirePermission>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Acceso denegado");
  });

  it("allows view when true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { clientes: { view: true } },
    });

    render(
      <RequirePermission module="clientes" required="view">
        <div>Clientes</div>
      </RequirePermission>
    );

    expect(screen.getByText("Clientes")).toBeInTheDocument();
  });
});

describe("RequireCuentasAntarixPermission", () => {
  it("denies view when not explicitly true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { cuentas_antarix: {} },
    });

    render(
      <MemoryRouter>
        <RequireCuentasAntarixPermission required="view">
          <div>Cuentas Antarix</div>
        </RequireCuentasAntarixPermission>
      </MemoryRouter>
    );

    expect(screen.queryByText("Cuentas Antarix")).not.toBeInTheDocument();
  });

  it("allows view when true", () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      permissions: { cuentas_antarix: { view: true } },
    });

    render(
      <MemoryRouter>
        <RequireCuentasAntarixPermission required="view">
          <div>Cuentas Antarix</div>
        </RequireCuentasAntarixPermission>
      </MemoryRouter>
    );

    expect(screen.getByText("Cuentas Antarix")).toBeInTheDocument();
  });
});
