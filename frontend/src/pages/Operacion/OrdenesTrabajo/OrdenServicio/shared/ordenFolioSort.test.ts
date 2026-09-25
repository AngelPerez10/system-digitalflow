import { describe, expect, it } from "vitest";
import { sortOrdenesByFolio } from "./ordenFolioSort";

describe("sortOrdenesByFolio", () => {
  it("ordena por idx descendente (folios nuevos arriba)", () => {
    const sorted = sortOrdenesByFolio([
      { id: 1, idx: 5595 },
      { id: 2, idx: 5705 },
      { id: 3, idx: 5682 },
      { id: 4, idx: 5696 },
    ]);
    expect(sorted.map((o) => o.idx)).toEqual([5705, 5696, 5682, 5595]);
  });

  it("empata por id cuando el idx coincide o falta", () => {
    const sorted = sortOrdenesByFolio([
      { id: 10, idx: null },
      { id: 20, idx: null },
      { id: 5, idx: 100 },
    ]);
    expect(sorted.map((o) => o.id)).toEqual([5, 20, 10]);
  });
});
