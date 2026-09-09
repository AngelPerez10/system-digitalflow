import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/api", () => ({ fetchApi: vi.fn() }));

import { fetchApi } from "@/config/api";
import { fetchOrdenesMes, OrdenesFetchError } from "./ordenesFetch";

const mockFetchApi = vi.mocked(fetchApi);

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

function row(id: number) {
  return { id, cliente: `C${id}` };
}

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe("fetchOrdenesMes", () => {
  it("backend antiguo (array plano): una sola petición, devuelve tal cual", async () => {
    mockFetchApi.mockResolvedValueOnce(jsonResponse([row(1), row(2)]));

    const rows = await fetchOrdenesMes("2026-07");

    expect(rows).toHaveLength(2);
    expect(mockFetchApi).toHaveBeenCalledTimes(1);
  });

  it("sobre paginado sin `next`: una petición, devuelve results", async () => {
    mockFetchApi.mockResolvedValueOnce(
      jsonResponse({ count: 2, next: null, previous: null, results: [row(1), row(2)] }),
    );

    const rows = await fetchOrdenesMes("2026-07");

    expect(rows.map((r) => (r as { id: number }).id)).toEqual([1, 2]);
    expect(mockFetchApi).toHaveBeenCalledTimes(1);
  });

  it("sigue `next` y concatena todas las páginas", async () => {
    mockFetchApi
      .mockResolvedValueOnce(
        jsonResponse({ next: "http://x/?page=2", results: [row(1), row(2)] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ next: "http://x/?page=3", results: [row(3), row(4)] }),
      )
      .mockResolvedValueOnce(jsonResponse({ next: null, results: [row(5)] }));

    const rows = await fetchOrdenesMes("2026-07");

    expect(rows.map((r) => (r as { id: number }).id)).toEqual([1, 2, 3, 4, 5]);
    expect(mockFetchApi).toHaveBeenCalledTimes(3);
    const urls = mockFetchApi.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("page=1");
    expect(urls[0]).toContain("page_size=200");
    expect(urls[1]).toContain("page=2");
    expect(urls[2]).toContain("page=3");
  });

  it("se detiene si una página trae results vacío", async () => {
    mockFetchApi
      .mockResolvedValueOnce(jsonResponse({ next: "http://x/?page=2", results: [row(1)] }))
      .mockResolvedValueOnce(jsonResponse({ next: "http://x/?page=3", results: [] }));

    const rows = await fetchOrdenesMes("2026-07");

    expect(rows).toHaveLength(1);
    expect(mockFetchApi).toHaveBeenCalledTimes(2);
  });

  it("primera página con error: lanza OrdenesFetchError con status", async () => {
    mockFetchApi.mockResolvedValueOnce(jsonResponse(null, false, 403));

    const error = await fetchOrdenesMes("2026-07").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(OrdenesFetchError);
    expect((error as OrdenesFetchError).status).toBe(403);
    expect(mockFetchApi).toHaveBeenCalledTimes(1);
  });

  it("página posterior con error: devuelve lo acumulado", async () => {
    mockFetchApi
      .mockResolvedValueOnce(
        jsonResponse({ next: "http://x/?page=2", results: [row(1), row(2)] }),
      )
      .mockResolvedValueOnce(jsonResponse(null, false, 500));

    const rows = await fetchOrdenesMes("2026-07");

    expect(rows).toHaveLength(2);
    expect(mockFetchApi).toHaveBeenCalledTimes(2);
  });

  it("con arrastreAbiertas añade arrastre_abiertas=1 a la query", async () => {
    mockFetchApi.mockResolvedValueOnce(jsonResponse([row(1)]));

    await fetchOrdenesMes("2026-09", { arrastreAbiertas: true });

    const url = String(mockFetchApi.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("mes=2026-09");
    expect(url).toContain("arrastre_abiertas=1");
  });

  it("sin arrastreAbiertas no manda el param", async () => {
    mockFetchApi.mockResolvedValueOnce(jsonResponse([row(1)]));

    await fetchOrdenesMes("2026-09");

    const url = String(mockFetchApi.mock.calls[0]?.[0] ?? "");
    expect(url).not.toContain("arrastre_abiertas");
  });
});
