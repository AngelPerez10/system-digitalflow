import { describe, expect, it } from "vitest";

/** Mirrors SearchableSelect local filter: actions stay visible while typing. */
function filterOptionsLocally<T extends { label: string; description?: string; isAction?: boolean }>(
  options: T[],
  search: string,
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) =>
      o.isAction ||
      o.label.toLowerCase().includes(q) ||
      (o.description ?? "").toLowerCase().includes(q),
  );
}

describe("SearchableSelect local filter", () => {
  const options = [
    { label: "ACME SA", description: "3121112233" },
    { label: "Beta Corp", description: "3149998877" },
    { label: "Nuevo contacto", description: "Crear contacto", isAction: true },
  ];

  it("keeps action rows visible when the query matches nothing else", () => {
    const filtered = filterOptionsLocally(options, "zzznada");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.isAction).toBe(true);
  });

  it("filters regular rows by label or description", () => {
    expect(filterOptionsLocally(options, "acme").map((o) => o.label)).toEqual([
      "ACME SA",
      "Nuevo contacto",
    ]);
    expect(filterOptionsLocally(options, "314999").map((o) => o.label)).toEqual([
      "Beta Corp",
      "Nuevo contacto",
    ]);
  });
});
