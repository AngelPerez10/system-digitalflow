import { describe, expect, it } from "vitest";
import {
  CLIENTES_PAGE_SIZE,
  SEARCH_MAX_LENGTH,
  buildClientesApiParams,
  paginationRange,
  parseClientesListQuery,
  totalPages,
  writeClientesListQuery,
} from "./clientesListQuery";

describe("parseClientesListQuery", () => {
  it("usa valores por omisión con una URL vacía", () => {
    expect(parseClientesListQuery(new URLSearchParams())).toEqual({
      q: "",
      tipos: [],
      orden: "registro",
      page: 1,
    });
  });

  it("descarta orden y página inválidos", () => {
    const q = parseClientesListQuery(new URLSearchParams("orden=;drop&page=-3"));
    expect(q.orden).toBe("registro");
    expect(q.page).toBe(1);
  });

  it("recorta la búsqueda a la longitud máxima", () => {
    const q = parseClientesListQuery(new URLSearchParams({ q: `  ${"a".repeat(500)}  ` }));
    expect(q.q).toHaveLength(SEARCH_MAX_LENGTH);
  });
});

describe("writeClientesListQuery", () => {
  it("omite los valores por omisión y conserva otras llaves", () => {
    const out = writeClientesListQuery(new URLSearchParams("otra=1&page=4"), {
      q: "",
      tipos: [],
      orden: "registro",
      page: 1,
    });
    expect(out.toString()).toBe("otra=1");
  });

  it("es el inverso de parse", () => {
    const state = { q: "acme", tipos: ["EMPRESA" as const], orden: "-nombre" as const, page: 3 };
    expect(parseClientesListQuery(writeClientesListQuery(new URLSearchParams(), state))).toEqual(state);
  });
});

describe("buildClientesApiParams", () => {
  it("traduce el orden a `ordering` y pide el tamaño de página fijo", () => {
    const p = buildClientesApiParams({ q: "x", tipos: ["PROVEEDOR"], orden: "recientes", page: 2 });
    expect(p.get("ordering")).toBe("-fecha_creacion");
    expect(p.get("page_size")).toBe(String(CLIENTES_PAGE_SIZE));
    expect(p.get("page")).toBe("2");
    expect(p.get("search")).toBe("x");
    expect(p.get("tipo")).toBe("PROVEEDOR");
  });

  it("no manda `search` ni `tipo` vacíos", () => {
    const p = buildClientesApiParams({ q: "", tipos: [], orden: "registro", page: 1 });
    expect(p.has("search")).toBe(false);
    expect(p.has("tipo")).toBe(false);
  });
});

describe("totalPages", () => {
  it("nunca baja de 1", () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(CLIENTES_PAGE_SIZE + 1)).toBe(2);
  });
});

describe("paginationRange", () => {
  it("muestra todas las páginas cuando caben", () => {
    expect(paginationRange(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("inserta huecos alrededor de la página actual", () => {
    expect(paginationRange(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
  });

  it("no pone hueco junto a los extremos", () => {
    expect(paginationRange(1, 12)).toEqual([1, 2, "gap", 12]);
    expect(paginationRange(12, 12)).toEqual([1, "gap", 11, 12]);
  });
});
