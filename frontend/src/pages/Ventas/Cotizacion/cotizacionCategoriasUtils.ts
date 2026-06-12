export type CotizacionCategoria = {
  id: string;
  nombre: string;
  orden: number;
};

export type ConceptoConCategoria = {
  id: string;
  categoria_id?: string;
};

export const UNCATEGORIZED_SECTION_ID = "__sin_categoria__";

export function sortCategorias(categorias: CotizacionCategoria[]): CotizacionCategoria[] {
  return [...categorias].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
}

export function parseCategoriasFromApi(raw: unknown): CotizacionCategoria[] {
  if (!Array.isArray(raw)) return [];
  const out: CotizacionCategoria[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const id = String((item as { id?: string }).id || "").trim();
    const nombre = String((item as { nombre?: string }).nombre || "").trim();
    if (!id || !nombre || seen.has(id)) return;
    const ordenRaw = (item as { orden?: number }).orden;
    const orden = Number.isFinite(Number(ordenRaw)) ? Number(ordenRaw) : index;
    seen.add(id);
    out.push({ id, nombre, orden });
  });
  return sortCategorias(out).map((c, i) => ({ ...c, orden: i }));
}

export function categoriasToApiPayload(categorias: CotizacionCategoria[]) {
  return sortCategorias(categorias).map((c, i) => ({
    id: c.id,
    nombre: c.nombre,
    orden: i,
  }));
}

export function isValidCategoriaId(categorias: CotizacionCategoria[], categoriaId: string | undefined) {
  const id = String(categoriaId || "").trim();
  if (!id) return false;
  return categorias.some((c) => c.id === id);
}

export function resolveCategoriaId(categorias: CotizacionCategoria[], categoriaId: string | undefined) {
  const id = String(categoriaId || "").trim();
  return isValidCategoriaId(categorias, id) ? id : "";
}

export type VisualTableRow<T extends ConceptoConCategoria> =
  | { kind: "category"; id: string; nombre: string; isVirtual?: boolean }
  | { kind: "category-empty"; id: string; nombre: string }
  | { kind: "product"; line: T };

export type ProductDropTarget =
  | { kind: "product"; productId: string }
  | { kind: "category"; categoryId: string };

export function buildVisualTableRows<T extends ConceptoConCategoria>(
  categorias: CotizacionCategoria[],
  lines: T[]
): VisualTableRow<T>[] {
  const sorted = sortCategorias(categorias);
  if (!sorted.length) {
    return lines.map((line) => ({ kind: "product" as const, line }));
  }

  const validIds = new Set(sorted.map((c) => c.id));
  const rows: VisualTableRow<T>[] = [];
  const assigned = new Set<string>();

  for (const cat of sorted) {
    const inCat = lines.filter((l) => String(l.categoria_id || "") === cat.id);
    rows.push({ kind: "category", id: cat.id, nombre: cat.nombre });
    if (inCat.length === 0) {
      rows.push({ kind: "category-empty", id: cat.id, nombre: cat.nombre });
    }
    inCat.forEach((line) => {
      rows.push({ kind: "product", line });
      assigned.add(line.id);
    });
  }

  const uncategorized = lines.filter((l) => {
    if (assigned.has(l.id)) return false;
    const cid = String(l.categoria_id || "").trim();
    return !cid || !validIds.has(cid);
  });

  if (uncategorized.length) {
    rows.push({
      kind: "category",
      id: UNCATEGORIZED_SECTION_ID,
      nombre: "Sin categoría",
      isVirtual: true,
    });
    uncategorized.forEach((line) => rows.push({ kind: "product", line }));
  }

  return rows;
}

function resolveCategoriaFromHeader(row: Extract<VisualTableRow<ConceptoConCategoria>, { kind: "category" }>) {
  return row.isVirtual ? "" : row.id;
}

function linesFromVisualOrder<T extends ConceptoConCategoria>(visual: VisualTableRow<T>[]): T[] {
  let currentCategoriaId = "";
  const ordered: T[] = [];
  for (const row of visual) {
    if (row.kind === "category") {
      currentCategoriaId = resolveCategoriaFromHeader(row);
      continue;
    }
    if (row.kind === "category-empty") {
      currentCategoriaId = row.id === UNCATEGORIZED_SECTION_ID ? "" : row.id;
      continue;
    }
    ordered.push({
      ...row.line,
      categoria_id: currentCategoriaId || undefined,
    });
  }
  return ordered;
}

export function applyVisualProductDrop<T extends ConceptoConCategoria>(
  categorias: CotizacionCategoria[],
  lines: T[],
  sourceProductId: string,
  target: ProductDropTarget
): T[] {
  const visual = buildVisualTableRows(categorias, lines);
  const fromVisual = visual.findIndex((r) => r.kind === "product" && r.line.id === sourceProductId);
  if (fromVisual < 0) return lines;

  const productRow = visual[fromVisual] as Extract<VisualTableRow<T>, { kind: "product" }>;
  const without = visual.filter((_, i) => i !== fromVisual);

  let insertAt = -1;
  if (target.kind === "category") {
    const catIndex = without.findIndex(
      (r) =>
        (r.kind === "category" || r.kind === "category-empty") && r.id === target.categoryId
    );
    if (catIndex < 0) return lines;
    insertAt = catIndex + 1;
    const nextRow = without[insertAt];
    if (nextRow?.kind === "category-empty") {
      insertAt += 1;
    }
  } else {
    insertAt = without.findIndex((r) => r.kind === "product" && r.line.id === target.productId);
    if (insertAt < 0) return lines;
  }

  const nextVisual: VisualTableRow<T>[] = [
    ...without.slice(0, insertAt),
    { kind: "product", line: productRow.line },
    ...without.slice(insertAt),
  ];

  return linesFromVisualOrder(nextVisual);
}

export function reorderCategorias(categorias: CotizacionCategoria[], orderedIds: string[]): CotizacionCategoria[] {
  const byId = new Map(categorias.map((c) => [c.id, c]));
  const next = orderedIds.map((id) => byId.get(id)).filter((c): c is CotizacionCategoria => !!c);
  if (next.length !== categorias.length) return categorias;
  return next.map((c, i) => ({ ...c, orden: i }));
}

export function createCategoria(nombre: string, categorias: CotizacionCategoria[]): CotizacionCategoria {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `cat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    nombre: nombre.trim(),
    orden: categorias.length,
  };
}
