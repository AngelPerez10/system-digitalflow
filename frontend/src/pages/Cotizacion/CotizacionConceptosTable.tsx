import { useEffect, useId, useMemo, useRef, useState } from "react";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Table, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { clampPct, formatMoney, toNumber } from "./cotizacionFormUtils";
import {
  applyVisualProductDrop,
  buildVisualTableRows,
  sortCategorias,
  UNCATEGORIZED_SECTION_ID,
  type CotizacionCategoria,
  type ProductDropTarget,
  type VisualTableRow,
} from "./cotizacionCategoriasUtils";

export type CotizacionConceptoLine = {
  id: string;
  categoria_id?: string;
  producto_nombre: string;
  producto_descripcion: string;
  unidad: string;
  thumbnail_url?: string;
  cantidad: number;
  descuento_pct: number;
  pu: number;
  importe: number;
};

type Props = {
  lines: CotizacionConceptoLine[];
  categorias: CotizacionCategoria[];
  onReorderProducts: (lines: CotizacionConceptoLine[]) => void;
  onReorderCategorias: (categorias: CotizacionCategoria[]) => void;
  onAddCategoria: (nombre: string) => void;
  onUpdateCategoria: (id: string, nombre: string) => void;
  onRemoveCategoria: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

function GripIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="7" cy="5" r="1.25" />
      <circle cx="13" cy="5" r="1.25" />
      <circle cx="7" cy="10" r="1.25" />
      <circle cx="13" cy="10" r="1.25" />
      <circle cx="7" cy="15" r="1.25" />
      <circle cx="13" cy="15" r="1.25" />
    </svg>
  );
}

const tableHeaderClass =
  "sticky top-0 z-10 border-b border-[#e7ded0] bg-[#fcfaf6]/95 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#57534e] backdrop-blur-sm dark:border-[#273244] dark:bg-[#0f172a]/95 dark:text-[#cbd5e1] sm:text-[11px]";

export function CotizacionConceptosTable({
  lines,
  categorias,
  onReorderProducts,
  onReorderCategorias,
  onAddCategoria,
  onUpdateCategoria,
  onRemoveCategoria,
  onEdit,
  onRemove,
}: Props) {
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const cleanupMap = useRef(new WeakMap<Element, () => void>());
  const linesRef = useRef(lines);
  const categoriasRef = useRef(categorias);
  const onReorderProductsRef = useRef(onReorderProducts);
  const onReorderCategoriasRef = useRef(onReorderCategorias);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingKind, setDraggingKind] = useState<"product" | "category" | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [newCategoriaNombre, setNewCategoriaNombre] = useState("");
  const [editingCategoriaId, setEditingCategoriaId] = useState<string | null>(null);
  const [editingCategoriaNombre, setEditingCategoriaNombre] = useState("");
  const nuevaCategoriaInputId = useId();

  linesRef.current = lines;
  categoriasRef.current = categorias;
  onReorderProductsRef.current = onReorderProducts;
  onReorderCategoriasRef.current = onReorderCategorias;

  const visualRows = useMemo(() => buildVisualTableRows(categorias, lines), [categorias, lines]);
  const productIndexById = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const row of visualRows) {
      if (row.kind === "product") {
        n += 1;
        map.set(row.line.id, n);
      }
    }
    return map;
  }, [visualRows]);

  useEffect(() => {
    const root = tableBodyRef.current;
    if (!root) return;

    return monitorForElements({
      onDragStart: ({ source }) => {
        const sd = source.data as { type?: string; id?: string };
        if (sd?.type === "cotizacion-concepto" && sd.id) {
          setDraggingId(sd.id);
          setDraggingKind("product");
        } else if (sd?.type === "cotizacion-categoria" && sd.id) {
          setDraggingId(sd.id);
          setDraggingKind("category");
        }
      },
      onDrop: ({ source, location }) => {
        setDraggingId(null);
        setDraggingKind(null);
        setDropTargetKey(null);

        const sd = source.data as { type?: string; id?: string };
        const dropTargets = location.current.dropTargets;
        const dd = (dropTargets.find((t) => {
          const kind = (t.data as { kind?: string })?.kind;
          return (
            kind === "product-row" ||
            kind === "category-row" ||
            kind === "category-empty-row"
          );
        })?.data ?? dropTargets[0]?.data) as
          | { kind?: string; categoryId?: string; productId?: string }
          | undefined;
        if (!dd?.kind) return;

        if (sd?.type === "cotizacion-concepto" && sd.id) {
          let target: ProductDropTarget | null = null;
          if (
            (dd.kind === "category-row" || dd.kind === "category-empty-row") &&
            dd.categoryId
          ) {
            target = { kind: "category", categoryId: String(dd.categoryId) };
          } else if (dd.kind === "product-row" && dd.productId) {
            target = { kind: "product", productId: String(dd.productId) };
          }
          if (!target) return;

          const next = applyVisualProductDrop(
            categoriasRef.current,
            linesRef.current,
            sd.id,
            target
          );
          onReorderProductsRef.current(next);
          return;
        }

        if (sd?.type === "cotizacion-categoria" && sd.id && dd.kind === "category-row") {
          const sorted = sortCategorias(categoriasRef.current);
          const ids = sorted.map((c) => c.id);
          const from = ids.indexOf(sd.id);
          const toCatId = String(dd.categoryId || "");
          if (from < 0 || !toCatId || toCatId === UNCATEGORIZED_SECTION_ID) return;
          const to = ids.indexOf(toCatId);
          if (to < 0 || from === to) return;
          const nextIds = [...ids];
          const [moved] = nextIds.splice(from, 1);
          nextIds.splice(to, 0, moved);
          const byId = new Map(categoriasRef.current.map((c) => [c.id, c]));
          const reordered = nextIds.map((id) => byId.get(id)).filter((c): c is CotizacionCategoria => !!c);
          onReorderCategoriasRef.current(reordered.map((c, i) => ({ ...c, orden: i })));
        }
      },
    });
  }, []);

  const registerDropTarget = (
    el: HTMLTableRowElement | null,
    data: { kind: string; categoryId?: string; productId?: string; dropKey: string }
  ) => {
    if (!el) return;
    cleanupMap.current.get(el)?.();
    cleanupMap.current.delete(el);
    const drop = dropTargetForElements({
      element: el,
      getData: () => data,
      onDragEnter: () => setDropTargetKey(data.dropKey),
      onDragLeave: () => setDropTargetKey((prev) => (prev === data.dropKey ? null : prev)),
      onDrop: () => setDropTargetKey(null),
    });
    cleanupMap.current.set(el, drop);
  };

  const registerProductHandle = (handleEl: HTMLButtonElement | null, line: CotizacionConceptoLine) => {
    if (!handleEl) return;
    cleanupMap.current.get(handleEl)?.();
    cleanupMap.current.delete(handleEl);
    const drag = draggable({
      element: handleEl,
      getInitialData: () => ({ type: "cotizacion-concepto", id: line.id }),
      onDragStart: () => {
        setDraggingId(line.id);
        setDraggingKind("product");
      },
      onDrop: () => {
        setDraggingId(null);
        setDraggingKind(null);
        setDropTargetKey(null);
      },
    });
    cleanupMap.current.set(handleEl, drag);
  };

  const registerCategoryHandle = (handleEl: HTMLButtonElement | null, cat: CotizacionCategoria) => {
    if (!handleEl) return;
    cleanupMap.current.get(handleEl)?.();
    cleanupMap.current.delete(handleEl);
    const drag = draggable({
      element: handleEl,
      getInitialData: () => ({ type: "cotizacion-categoria", id: cat.id }),
      onDragStart: () => {
        setDraggingId(cat.id);
        setDraggingKind("category");
      },
      onDrop: () => {
        setDraggingId(null);
        setDraggingKind(null);
        setDropTargetKey(null);
      },
    });
    cleanupMap.current.set(handleEl, drag);
  };

  const handleAddCategoria = () => {
    const nombre = newCategoriaNombre.trim();
    if (!nombre) return;
    onAddCategoria(nombre);
    setNewCategoriaNombre("");
  };

  const commitEditCategoria = (id: string) => {
    const nombre = editingCategoriaNombre.trim();
    if (nombre) onUpdateCategoria(id, nombre);
    setEditingCategoriaId(null);
    setEditingCategoriaNombre("");
  };

  const linesTotal = lines.reduce((acc, l) => acc + (Number.isFinite(l.importe) ? l.importe : 0), 0);
  const hasCategories = categorias.length > 0;

  const renderProductRow = (line: CotizacionConceptoLine) => {
    const isDragging = draggingKind === "product" && draggingId === line.id;
    const dropKey = `product-${line.id}`;
    const isDropTarget = dropTargetKey === dropKey && draggingKind === "product" && draggingId !== line.id;
    const rowNum = productIndexById.get(line.id) ?? 0;

    return (
      <tr
        key={line.id}
        ref={(el) =>
          registerDropTarget(el, {
            kind: "product-row",
            productId: line.id,
            dropKey,
          })
        }
        className={[
          "transition-colors",
          "bg-white/60 dark:bg-[#0f172a]/30",
          "hover:bg-[#fff7ed]/50 dark:hover:bg-[#1e293b]/50",
          isDragging ? "opacity-45" : "",
          isDropTarget ? "bg-[#fff7ed]/90 ring-2 ring-inset ring-[#ff801f]/40 dark:bg-[#7c2d12]/20 dark:ring-[#ff801f]/35" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <td className="px-1 py-2 text-center align-middle">
          <button
            type="button"
            ref={(el) => registerProductHandle(el, line)}
            className="inline-flex h-10 w-10 cursor-grab touch-none items-center justify-center rounded-lg border border-transparent text-[#78716c] transition hover:border-[#e2d9ca] hover:bg-[#fffdf8] hover:text-[#57534e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/30 active:cursor-grabbing dark:text-[#8ea0b8] dark:hover:border-[#334155] dark:hover:bg-[#1e293b] dark:hover:text-[#e5e7eb] sm:h-9 sm:w-9"
            aria-label={`Arrastrar concepto ${rowNum}: ${line.producto_nombre}`}
            title="Arrastrar para reordenar"
          >
            <GripIcon className="h-4 w-4" />
          </button>
        </td>
        <td className="px-2 py-2 text-center align-middle font-medium tabular-nums text-[#78716c] dark:text-[#8ea0b8]">
          {rowNum}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right align-middle font-medium tabular-nums">
          {line.cantidad}
        </td>
        <td className="whitespace-nowrap px-2 py-2 align-middle text-[#57534e] dark:text-[#aeb8c8]">
          {line.unidad || "—"}
        </td>
        <td className="px-2 py-2 align-middle">
          <div className="flex items-center gap-2.5">
            {line.thumbnail_url ? (
              <img
                src={line.thumbnail_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg border border-[#e7ded0] object-cover dark:border-[#334155]"
              />
            ) : (
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#e2d9ca] bg-[#fcfaf6] text-[10px] font-semibold uppercase text-[#a8a29e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#64748b]"
                aria-hidden
              >
                {(line.producto_nombre || "?").slice(0, 1)}
              </span>
            )}
            <span className="font-medium leading-snug text-[#1c1917] dark:text-[#f8fafc]">{line.producto_nombre}</span>
          </div>
        </td>
        <td className="max-w-[14rem] px-2 py-2 align-middle">
          <p className="line-clamp-2 text-[#57534e] dark:text-[#aeb8c8]" title={line.producto_descripcion || undefined}>
            {line.producto_descripcion || "—"}
          </p>
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right align-middle tabular-nums">
          {formatMoney(toNumber(line.pu, 0))}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right align-middle tabular-nums text-[#78716c] dark:text-[#8ea0b8]">
          {clampPct(toNumber(line.descuento_pct, 0)).toFixed(2)}%
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right align-middle font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">
          {formatMoney(toNumber(line.importe, 0))}
        </td>
        <td className="px-2 py-2 text-center align-middle">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(line.id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7ded0] bg-white text-[#57534e] transition hover:border-[#ffa057] hover:text-[#ff801f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/30 active:scale-[0.97] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1] dark:hover:border-[#ff801f] sm:h-8 sm:w-8"
              title="Editar"
              aria-label={`Editar concepto ${rowNum}`}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(line.id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7ded0] bg-white text-[#57534e] transition hover:border-error-400 hover:text-error-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-error-500/30 active:scale-[0.97] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1] dark:hover:border-error-500 sm:h-8 sm:w-8"
              title="Eliminar"
              aria-label={`Eliminar concepto ${rowNum}`}
            >
              <TrashBinIcon className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderCategoryEmptyRow = (
    row: Extract<VisualTableRow<CotizacionConceptoLine>, { kind: "category-empty" }>
  ) => {
    const dropKey = `category-empty-${row.id}`;
    const isDropTarget = dropTargetKey === dropKey && draggingKind === "product";

    return (
      <tr
        key={`cat-empty-${row.id}`}
        ref={(el) =>
          registerDropTarget(el, {
            kind: "category-empty-row",
            categoryId: row.id,
            dropKey,
          })
        }
        className={[
          "transition-colors",
          "bg-[#fcfaf6]/60 dark:bg-[#0f172a]/20",
          isDropTarget ? "bg-[#fff7ed]/90 ring-2 ring-inset ring-[#ff801f]/40 dark:bg-[#7c2d12]/20" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <td colSpan={10} className="px-3 py-3">
          <p className="text-center text-[11px] italic text-[#a8a29e] dark:text-[#64748b]">
            Arrastra productos aquí
          </p>
        </td>
      </tr>
    );
  };

  const renderCategoryRow = (row: Extract<VisualTableRow<CotizacionConceptoLine>, { kind: "category" }>) => {
    const isVirtual = row.isVirtual || row.id === UNCATEGORIZED_SECTION_ID;
    const cat = categorias.find((c) => c.id === row.id);
    const dropKey = `category-${row.id}`;
    const isDropTarget =
      dropTargetKey === dropKey &&
      ((draggingKind === "product") || (draggingKind === "category" && draggingId !== row.id));
    const isDragging = draggingKind === "category" && draggingId === row.id;

    return (
      <tr
        key={`cat-${row.id}`}
        ref={(el) =>
          registerDropTarget(el, {
            kind: "category-row",
            categoryId: row.id,
            dropKey,
          })
        }
        className={[
          "transition-colors",
          isVirtual
            ? "bg-[#f5f0e8]/80 dark:bg-[#1e293b]/40"
            : "bg-[#efe9de]/90 dark:bg-[#1e293b]/60",
          isDragging ? "opacity-45" : "",
          isDropTarget ? "ring-2 ring-inset ring-[#ff801f]/35" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <td colSpan={10} className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {!isVirtual && cat ? (
              <button
                type="button"
                ref={(el) => registerCategoryHandle(el, cat)}
                className="inline-flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-transparent text-[#78716c] transition hover:border-[#e2d9ca] hover:bg-white/60 hover:text-[#57534e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/30 active:cursor-grabbing dark:text-[#8ea0b8] dark:hover:border-[#334155] dark:hover:bg-[#0f172a]/50"
                aria-label={`Arrastrar categoría ${row.nombre}`}
                title="Arrastrar categoría"
              >
                <GripIcon className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
            )}

            {editingCategoriaId === row.id && !isVirtual ? (
              <input
                className="min-w-[10rem] flex-1 rounded-lg border border-[#e7ded0] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#1c1917] focus:border-[#ff801f] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#f8fafc]"
                value={editingCategoriaNombre}
                onChange={(e) => setEditingCategoriaNombre(e.target.value)}
                onBlur={() => commitEditCategoria(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEditCategoria(row.id);
                  if (e.key === "Escape") {
                    setEditingCategoriaId(null);
                    setEditingCategoriaNombre("");
                  }
                }}
                autoFocus
              />
            ) : (
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#57534e] dark:text-[#cbd5e1] sm:text-[13px]">
                {row.nombre}
              </span>
            )}

            {!isVirtual && cat && editingCategoriaId !== row.id && (
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategoriaId(row.id);
                    setEditingCategoriaNombre(row.nombre);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#e7ded0] bg-white text-[#78716c] transition hover:text-[#ff801f] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#8ea0b8]"
                  title="Renombrar categoría"
                  aria-label={`Renombrar ${row.nombre}`}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveCategoria(row.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#e7ded0] bg-white text-[#78716c] transition hover:border-error-400 hover:text-error-600 dark:border-[#334155] dark:bg-[#111a2b]"
                  title="Eliminar categoría"
                  aria-label={`Eliminar categoría ${row.nombre}`}
                >
                  <TrashBinIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-w-0">
      {lines.length > 0 ? (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-0.5 sm:px-1">
          <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs">
            <span className="font-medium text-[#57534e] dark:text-[#cbd5e1]">{lines.length}</span>{" "}
            {lines.length === 1 ? "concepto" : "conceptos"}
            {hasCategories ? (
              <>
                {" "}
                · <span className="font-medium text-[#57534e] dark:text-[#cbd5e1]">{categorias.length}</span>{" "}
                {categorias.length === 1 ? "categoría" : "categorías"}
              </>
            ) : null}{" "}
            · arrastra para reordenar
          </p>
          <p className="text-[11px] font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-xs">
            Suma líneas: {formatMoney(linesTotal)}
          </p>
        </div>
      ) : null}

      <div className="mb-3 rounded-xl border border-[#e7ded0]/90 bg-gradient-to-r from-[#fcfaf6] via-[#fffdfa] to-[#fff8f1] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:border-[#273244] dark:from-[#111a2b]/80 dark:via-[#111827]/60 dark:to-[#0f172a]/50 dark:shadow-none sm:p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2.5 sm:max-w-[13rem]">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#ff801f]/20 bg-[#fff7ed] text-[#ea580c] dark:border-[#ff801f]/25 dark:bg-[#7c2d12]/25 dark:text-[#fb923c]"
              aria-hidden
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h16M4 12h10M4 17h14" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#1c1917] dark:text-[#f8fafc]">Nueva categoría</p>
              <p className="text-[11px] leading-snug text-[#78716c] dark:text-[#8ea0b8]">
                Agrupa productos en secciones
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:justify-end">
            <label htmlFor={nuevaCategoriaInputId} className="sr-only">
              Nombre de la categoría
            </label>
            <input
              id={nuevaCategoriaInputId}
              type="text"
              value={newCategoriaNombre}
              onChange={(e) => setNewCategoriaNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategoria();
              }}
              placeholder="Ej. Equipos, Instalación…"
              className="h-9 min-w-0 flex-1 rounded-lg border border-[#e2d9ca] bg-white px-3 text-sm text-[#1c1917] placeholder:text-[#a8a29e] transition focus:border-[#ff801f] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#f8fafc] sm:max-w-[14rem]"
            />
            <button
              type="button"
              onClick={handleAddCategoria}
              disabled={!newCategoriaNombre.trim()}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#ff801f] px-3.5 text-xs font-semibold text-[#1c1917] shadow-[0_4px_14px_-6px_rgba(255,128,31,0.75)] transition hover:bg-[#ff6a00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40 disabled:cursor-not-allowed disabled:bg-[#e6dfd8] disabled:text-[#a8a29e] disabled:shadow-none dark:disabled:bg-[#334155] dark:disabled:text-[#64748b]"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M10 4v12M4 10h12" strokeLinecap="round" />
              </svg>
              Agregar
            </button>
          </div>
        </div>

        {hasCategories ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[#e7ded0]/70 pt-2.5 dark:border-[#334155]/80">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#78716c] dark:text-[#8ea0b8]">
              Activas
            </span>
            {sortCategorias(categorias).map((cat) => (
              <span
                key={cat.id}
                className="inline-flex max-w-[10rem] items-center rounded-full border border-[#e2d9ca] bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-[#57534e] dark:border-[#334155] dark:bg-[#0f172a]/80 dark:text-[#cbd5e1]"
                title={cat.nombre}
              >
                <span className="truncate">{cat.nombre}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <Table className="min-w-[820px]">
        <TableHeader className={tableHeaderClass}>
          <TableRow>
            <TableCell isHeader className="w-11 px-1 py-2.5 text-center">
              <span className="sr-only">Ordenar</span>
            </TableCell>
            <TableCell isHeader className="w-10 px-2 py-2.5 text-center">
              #
            </TableCell>
            <TableCell isHeader className="w-[4.5rem] px-2 py-2.5 text-right">
              Cant.
            </TableCell>
            <TableCell isHeader className="w-[4.5rem] px-2 py-2.5 text-left">
              Unidad
            </TableCell>
            <TableCell isHeader className="min-w-[10rem] px-2 py-2.5 text-left">
              Producto
            </TableCell>
            <TableCell isHeader className="min-w-[12rem] px-2 py-2.5 text-left">
              Detalle
            </TableCell>
            <TableCell isHeader className="w-[6.5rem] px-2 py-2.5 text-right">
              P. unit.
            </TableCell>
            <TableCell isHeader className="w-[4.5rem] px-2 py-2.5 text-right">
              Desc.
            </TableCell>
            <TableCell isHeader className="w-[6.5rem] px-2 py-2.5 text-right">
              Importe
            </TableCell>
            <TableCell isHeader className="w-[5.5rem] px-2 py-2.5 text-center">
              <span className="sr-only">Acciones</span>
            </TableCell>
          </TableRow>
        </TableHeader>
        <tbody
          ref={tableBodyRef}
          className="divide-y divide-[#f1e8db] text-[11px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb] sm:text-[12px]"
        >
          {visualRows.map((row) => {
            if (row.kind === "category") return renderCategoryRow(row);
            if (row.kind === "category-empty") return renderCategoryEmptyRow(row);
            return renderProductRow(row.line);
          })}

          {!lines.length && (
            <TableRow>
              <TableCell colSpan={10} className="px-4 py-12 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] text-[#78716c] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#8ea0b8]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">Aún no hay conceptos</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
                      Usa el formulario de arriba para agregar productos o servicios a la cotización.
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </tbody>
      </Table>
    </div>
  );
}
