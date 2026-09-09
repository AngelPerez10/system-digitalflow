import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/api", () => ({ fetchApi: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { useNotificaciones } from "./useNotificaciones";

const mockFetchApi = vi.mocked(fetchApi);
const mockUseAuth = vi.mocked(useAuth);

const jsonOk = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

beforeEach(() => {
  mockFetchApi.mockReset();
  mockUseAuth.mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
});

describe("useNotificaciones", () => {
  it("carga el contador de no leídas al montar", async () => {
    mockFetchApi.mockResolvedValueOnce(jsonOk({ total: 5, no_leidas: 3 }));
    const { result } = renderHook(() => useNotificaciones());
    await waitFor(() => expect(result.current.noLeidas).toBe(3));
    expect(mockFetchApi).toHaveBeenCalledWith("/api/notificaciones/resumen/");
  });

  it("cargarLista trae items y sincroniza el contador", async () => {
    mockFetchApi
      .mockResolvedValueOnce(jsonOk({ total: 0, no_leidas: 0 })) // resumen del montaje
      .mockResolvedValueOnce(
        jsonOk({
          results: [
            { id: 1, tipo: "orden_pendiente", titulo: "A", cuerpo: "", url: "/ordenes", ref_tipo: "orden", ref_id: 1, leida: false, leida_at: null, created_at: new Date().toISOString() },
          ],
          no_leidas: 1,
        }),
      );
    const { result } = renderHook(() => useNotificaciones());
    await act(async () => {
      await result.current.cargarLista();
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.noLeidas).toBe(1);
  });

  it("marcarLeida es optimista y baja el contador", async () => {
    mockFetchApi
      .mockResolvedValueOnce(jsonOk({ total: 2, no_leidas: 2 }))
      .mockResolvedValueOnce(
        jsonOk({
          results: [
            { id: 7, tipo: "orden_asignada", titulo: "X", cuerpo: "", url: "", ref_tipo: "", ref_id: null, leida: false, leida_at: null, created_at: new Date().toISOString() },
          ],
          no_leidas: 2,
        }),
      )
      .mockResolvedValueOnce(jsonOk({ actualizadas: 1, no_leidas: 1 }));
    const { result } = renderHook(() => useNotificaciones());
    await act(async () => {
      await result.current.cargarLista();
    });
    await act(async () => {
      await result.current.marcarLeida(7);
    });
    expect(result.current.items[0].leida).toBe(true);
    expect(result.current.noLeidas).toBe(1);
    expect(mockFetchApi).toHaveBeenCalledWith("/api/notificaciones/7/leer/", { method: "POST" });
  });

  it("sin sesión no llama a la API y deja el contador en 0", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    const { result } = renderHook(() => useNotificaciones());
    expect(result.current.noLeidas).toBe(0);
    expect(mockFetchApi).not.toHaveBeenCalled();
  });
});
