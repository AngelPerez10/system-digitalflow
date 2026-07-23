import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import {
  erpBodyClass,
  erpInputLikeClass,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import { fetchProductosManualesCatalogo } from "@/pages/Ventas/Cotizacion/cotizacionApi";
import type { ProductoManualCatalogo } from "@/pages/Ventas/Cotizacion/cotizacionFormTypes";
import {
  fetchSyscomProductosSugerencia,
  fetchTvcProductosSugerencia,
  getCatalogProductoImageUrl,
  type SyscomProducto,
} from "@/pages/ProductosYServicios/syscomCatalog";
import {
  proyectoEmptyPanelClass,
  proyectoPickerModalBodyClass,
  proyectoPickerModalClass,
  proyectoPickerModalHeaderClass,
} from "./proyectoPageStyles";

export type CatalogFuentePicker = "syscom" | "tvc" | "manual";

export type ProyectoModeloSeleccionado = {
  modelo: string;
  productoId: string;
  marca: string;
  titulo: string;
  imagenUrl?: string;
  fuenteProducto: CatalogFuentePicker;
};

/** @deprecated Preferir `ProyectoModeloSeleccionado`. */
export type SyscomModeloSeleccionado = ProyectoModeloSeleccionado;

type Props = {
  open: boolean;
  equipoLabel: string;
  modeloActual: string;
  /** Prefiere la pestaña de la fuente actual del equipo. */
  fuentePreferida?: CatalogFuentePicker | string | null;
  onClose: () => void;
  onSelect: (producto: ProyectoModeloSeleccionado) => void;
};

type ResultadoRow = {
  key: string;
  label: string;
  subtitle?: string;
  meta: string;
  imagenUrl?: string;
  fuente: CatalogFuentePicker;
  payload: ProyectoModeloSeleccionado;
};

const FUENTES: { id: CatalogFuentePicker; label: string }[] = [
  { id: "syscom", label: "Syscom" },
  { id: "tvc", label: "TVC" },
  { id: "manual", label: "Manual" },
];

function normalizeFuente(v?: string | null): CatalogFuentePicker {
  if (v === "tvc" || v === "manual" || v === "syscom") return v;
  return "syscom";
}

function formatModeloLabel(p: SyscomProducto): string {
  const marca = String(p.marca || "").trim();
  const modelo = String(p.modelo || "").trim();
  const titulo = String(p.titulo || "").trim();
  if (marca && modelo) return `${marca} - ${modelo}`;
  if (modelo) return modelo;
  if (titulo) return titulo;
  return p.producto_id;
}

function formatManualLabel(p: ProductoManualCatalogo): string {
  const marca = p.marca.trim();
  const modelo = p.modelo.trim();
  if (marca && modelo) return `${marca} - ${modelo}`;
  if (modelo) return modelo;
  if (p.producto.trim()) return p.producto.trim();
  return `Manual #${p.id}`;
}

function fuenteBadgeClass(fuente: CatalogFuentePicker): string {
  const base =
    "inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider";
  switch (fuente) {
    case "tvc":
      return `${base} border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300`;
    case "manual":
      return `${base} border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-700/40 dark:bg-violet-950/35 dark:text-violet-300`;
    default:
      return `${base} border-[#ff801f]/30 bg-[#fff4eb] text-[#9a3412] dark:border-[#ff801f]/40 dark:bg-[#ff801f]/15 dark:text-[#fdba74]`;
  }
}

function catalogToRow(p: SyscomProducto, fuente: CatalogFuentePicker): ResultadoRow {
  const label = formatModeloLabel(p);
  const imagenUrl = getCatalogProductoImageUrl({ ...p, fuente }) || undefined;
  return {
    key: `${fuente}-${p.producto_id}`,
    label,
    subtitle: p.titulo && p.titulo !== label ? p.titulo : undefined,
    meta: [
      `ID ${p.producto_id}`,
      typeof p.total_existencia === "number" ? `Stock ${p.total_existencia}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    imagenUrl,
    fuente,
    payload: {
      modelo: label,
      productoId: String(p.producto_id || ""),
      marca: String(p.marca || "").trim(),
      titulo: String(p.titulo || "").trim(),
      imagenUrl,
      fuenteProducto: fuente,
    },
  };
}

function manualToRow(p: ProductoManualCatalogo): ResultadoRow {
  const label = formatManualLabel(p);
  const imagenUrl = p.imagen_url?.trim() || undefined;
  return {
    key: `manual-${p.id}`,
    label,
    subtitle: p.producto && p.producto !== label ? p.producto : undefined,
    meta: [`Manual #${p.id}`, Number.isFinite(p.stock) ? `Stock ${p.stock}` : null]
      .filter(Boolean)
      .join(" · "),
    imagenUrl,
    fuente: "manual",
    payload: {
      modelo: label,
      productoId: `manual:${p.id}`,
      marca: p.marca.trim(),
      titulo: p.producto.trim(),
      imagenUrl,
      fuenteProducto: "manual",
    },
  };
}

export function ProyectoSyscomModeloPicker({
  open,
  equipoLabel,
  modeloActual,
  fuentePreferida,
  onClose,
  onSelect,
}: Props) {
  const titleId = useId();
  const searchId = useId();
  const tabsId = useId();
  const searchGenRef = useRef(0);
  const [fuente, setFuente] = useState<CatalogFuentePicker>("syscom");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalogRows, setCatalogRows] = useState<ResultadoRow[]>([]);
  const [manualAll, setManualAll] = useState<ProductoManualCatalogo[]>([]);
  const [manualLoaded, setManualLoaded] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFuente(normalizeFuente(fuentePreferida));
    setSearch("");
    setCatalogRows([]);
    setError("");
    setLoading(false);
  }, [open, fuentePreferida]);

  useEffect(() => {
    if (!open || fuente !== "manual" || manualLoaded || manualLoading) return;
    let cancelled = false;
    setManualLoading(true);
    setError("");
    fetchProductosManualesCatalogo()
      .then((rows) => {
        if (cancelled) return;
        setManualAll(rows);
        setManualLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setManualAll([]);
        setError("No se pudieron cargar productos manuales.");
      })
      .finally(() => {
        if (!cancelled) setManualLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, fuente, manualLoaded, manualLoading]);

  useEffect(() => {
    if (!open) return;
    if (fuente === "manual") {
      setCatalogRows([]);
      setLoading(false);
      return;
    }

    const q = search.trim();
    if (q.length < 2) {
      setCatalogRows([]);
      setError("");
      setLoading(false);
      return;
    }

    const runGen = ++searchGenRef.current;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res =
          fuente === "tvc"
            ? await fetchTvcProductosSugerencia(q, { signal: ac.signal })
            : await fetchSyscomProductosSugerencia(q, { signal: ac.signal });
        if (runGen !== searchGenRef.current) return;
        if (!res.ok && res.productos.length === 0) {
          setCatalogRows([]);
          setError(
            fuente === "tvc"
              ? "No se pudo consultar TVC en este momento."
              : "No se pudo consultar Syscom en este momento."
          );
          return;
        }
        setCatalogRows(res.productos.map((p) => catalogToRow({ ...p, fuente }, fuente)));
      } catch (e) {
        if (runGen !== searchGenRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setCatalogRows([]);
        setError(fuente === "tvc" ? "Error de conexión con TVC." : "Error de conexión con Syscom.");
      } finally {
        if (runGen === searchGenRef.current) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [open, search, fuente]);

  const manualRows = useMemo(() => {
    if (fuente !== "manual") return [];
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? manualAll
      : manualAll.filter(
          (p) =>
            p.producto.toLowerCase().includes(q) ||
            p.marca.toLowerCase().includes(q) ||
            p.modelo.toLowerCase().includes(q) ||
            String(p.id).includes(q)
        );
    return filtered.slice(0, 24).map(manualToRow);
  }, [fuente, manualAll, search]);

  const results = fuente === "manual" ? manualRows : catalogRows;
  const isBusy = fuente === "manual" ? manualLoading : loading;
  const fuenteLabel = FUENTES.find((f) => f.id === fuente)?.label ?? "Syscom";
  const needsMinChars = fuente !== "manual" && search.trim().length < 2;
  const showEmpty =
    !isBusy &&
    !error &&
    results.length === 0 &&
    (fuente === "manual" ? manualLoaded : search.trim().length >= 2);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnEscape
      ariaLabelledBy={titleId}
      className={proyectoPickerModalClass}
    >
      <header className={proyectoPickerModalHeaderClass}>
        <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
              <path
                d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className={erpSectionLabelClass}>Proyectos · Catálogo de productos</p>
            <h3 id={titleId} className={`mt-1 ${erpSubheadingClass}`}>
              Cambiar modelo
            </h3>
            <p className={`${erpBodyClass} mt-1 text-sm`}>
              Elige un producto de Syscom, TVC o Manual para reemplazar{" "}
              <span className="font-medium text-[#1c1917] dark:text-[#f8fafc]">
                {equipoLabel || modeloActual}
              </span>
              .
            </p>
          </div>
        </div>
      </header>

      <div className={proyectoPickerModalBodyClass}>
        <div
          role="tablist"
          aria-label="Fuente del catálogo"
          id={tabsId}
          className="flex flex-wrap gap-1 rounded-xl border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0b1220]"
        >
          {FUENTES.map((tab) => {
            const selected = fuente === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${tabsId}-${tab.id}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                className={`min-h-9 flex-1 rounded-lg px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 sm:flex-none sm:min-w-[5.5rem] ${
                  selected
                    ? "bg-white text-[#9a3412] shadow-sm dark:bg-[#1e293b] dark:text-[#fdba74]"
                    : "text-[#57534e] hover:bg-white/70 dark:text-[#cbd5e1] dark:hover:bg-[#1e293b]/50"
                }`}
                onClick={() => {
                  setFuente(tab.id);
                  setError("");
                  setCatalogRows([]);
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          aria-labelledby={`${tabsId}-${fuente}`}
          className="mt-4"
        >
          <div>
            <Label htmlFor={searchId}>
              {fuente === "manual" ? "Filtrar productos manuales" : `Buscar en ${fuenteLabel}`}
            </Label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                fuente === "manual"
                  ? "Nombre, marca, modelo o ID…"
                  : "Modelo, marca o descripción…"
              }
              className={`${erpInputLikeClass} mt-1.5`}
              autoComplete="off"
              autoFocus
            />
            <p className="mt-1.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
              {fuente === "manual"
                ? "Mismos productos manuales que en Cotización."
                : `Escribe al menos 2 caracteres. Catálogo ${fuenteLabel} (mismo que Productos / Cotización).`}
            </p>
          </div>

          <div className="mt-4" role="status" aria-live="polite">
            {isBusy ? (
              <p className="text-sm text-[#78716c] dark:text-[#8ea0b8]">
                {fuente === "manual" ? "Cargando productos manuales…" : `Buscando en ${fuenteLabel}…`}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
                {error}
              </p>
            ) : null}
            {needsMinChars && !error ? (
              <p className="text-sm text-[#78716c] dark:text-[#8ea0b8]">
                Escribe al menos 2 caracteres para buscar en {fuenteLabel}.
              </p>
            ) : null}
          </div>

          <ul className="mt-3 space-y-2" role="listbox" aria-label={`Productos ${fuenteLabel}`}>
            {showEmpty ? (
              <li className={`${proyectoEmptyPanelClass} py-6`} role="status">
                {fuente === "manual" && !search.trim()
                  ? "No hay productos manuales registrados."
                  : `Sin resultados para “${search.trim() || "…"}”.`}
              </li>
            ) : null}

            {results.map((row) => {
              const img = row.imagenUrl;
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full items-center gap-3 rounded-xl border border-[#e7ded0] bg-[#fffdfa] px-3 py-2.5 text-left transition-colors hover:border-[#ff801f]/40 hover:bg-[#fff8f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/25 dark:border-[#334155] dark:bg-[#111a2b] dark:hover:bg-[#1e293b]/60"
                    onClick={() => onSelect(row.payload)}
                  >
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]">
                      {img ? (
                        <img src={img} alt="" className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-[10px] text-[#a8a29e]" aria-hidden>
                          —
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className={fuenteBadgeClass(row.fuente)}>{fuenteLabel}</span>
                        <span className="truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                          {row.label}
                        </span>
                      </span>
                      {row.subtitle ? (
                        <span className="mt-0.5 block truncate text-xs text-[#78716c] dark:text-[#8ea0b8]">
                          {row.subtitle}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[10px] tabular-nums text-[#a8a29e] dark:text-[#64748b]">
                        {row.meta}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-5 flex justify-end border-t border-[#e7ded0] pt-4 dark:border-[#334155]">
          <button type="button" className={erpSecondaryBtnClass} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
