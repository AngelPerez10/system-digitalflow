import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronRight, PackageSearch, Search } from "lucide-react";
import { btn, focusRing, input } from "../../shared/proyectoTokens";
import { PickerTabs, ProyectoPickerShell } from "./ProyectoPickerShell";
import { ProyectoProductoThumb } from "./ProyectoProductoThumb";
import { fetchProductosManualesCatalogo } from "@/pages/Ventas/Cotizacion/shared/cotizacionApi";
import type { ProductoManualCatalogo } from "@/pages/Ventas/Cotizacion/shared/cotizacionFormTypes";
import {
  fetchSyscomProductosSugerencia,
  fetchTvcProductosSugerencia,
  getCatalogProductoImageUrl,
  type SyscomProducto,
} from "@/pages/ProductosYServicios/syscomCatalog";

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
  const searchId = useId();
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
    <ProyectoPickerShell
      open={open}
      onClose={onClose}
      icon={<PackageSearch />}
      eyebrow="Proyecto · Catálogo"
      title="Cambiar modelo"
      description={
        <>
          Reemplaza <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{equipoLabel || modeloActual}</span>{" "}
          por un producto de Syscom, TVC o del catálogo manual.
        </>
      }
      toolbar={
        <>
          <PickerTabs
            label="Fuente del catálogo"
            value={fuente}
            options={FUENTES}
            onChange={(id) => {
              setFuente(id);
              setError("");
              setCatalogRows([]);
            }}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
            <label htmlFor={searchId} className="sr-only">
              {fuente === "manual" ? "Filtrar productos manuales" : `Buscar en ${fuenteLabel}`}
            </label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={fuente === "manual" ? "Nombre, marca, modelo o ID…" : `Buscar en ${fuenteLabel}: modelo, marca…`}
              className={`${input} pl-10`}
              autoComplete="off"
              autoFocus
            />
          </div>
        </>
      }
      footer={
        <button type="button" className={btn.secondary} onClick={onClose}>
          Cancelar
        </button>
      }
    >
      <div role="status" aria-live="polite" className="px-3">
        {error ? (
          <p className="py-2 text-[13px] text-[#B42323] dark:text-[#F87171]" role="alert">
            {error}
          </p>
        ) : needsMinChars ? (
          <p className="py-8 text-center text-[14px] text-[#71717A] dark:text-[#8EA0B8]">
            Escribe al menos 2 caracteres para buscar en {fuenteLabel}.
          </p>
        ) : showEmpty ? (
          <p className="py-8 text-center text-[14px] text-[#71717A] dark:text-[#8EA0B8]">
            {fuente === "manual" && !search.trim()
              ? "No hay productos manuales registrados."
              : `Sin resultados para «${search.trim()}».`}
          </p>
        ) : null}
      </div>

      <ul className="space-y-1" role="listbox" aria-label={`Productos ${fuenteLabel}`} aria-busy={isBusy || undefined}>
        {isBusy
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5" aria-hidden style={{ opacity: 1 - i * 0.18 }}>
                <span className="size-12 rounded-[10px] bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3.5 w-2/3 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                  <span className="block h-3 w-1/3 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                </span>
              </li>
            ))
          : results.map((row, i) => (
              <li key={row.key} className="cot-rise" style={{ "--cot-i": Math.min(i, 8) } as CSSProperties}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className={`group flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5F8FF] dark:hover:bg-[#1B2A63]/30 ${focusRing}`}
                  onClick={() => onSelect(row.payload)}
                >
                  <ProyectoProductoThumb src={row.imagenUrl} alt="" size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{row.label}</span>
                    {row.subtitle ? (
                      <span className="block truncate text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">{row.subtitle}</span>
                    ) : null}
                    <span className="block truncate font-mono text-[11.5px] text-[#A1A1AA] dark:text-[#64748B]">{row.meta}</span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#1B5CFF] motion-reduce:transition-none"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
      </ul>
    </ProyectoPickerShell>
  );
}
