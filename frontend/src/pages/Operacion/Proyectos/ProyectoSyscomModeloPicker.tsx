import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import {
  erpBodyClass,
  erpInputLikeClass,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import {
  fetchSyscomProductosSugerencia,
  getCatalogProductoImageUrl,
  getProductoImageUrl,
  type SyscomProducto,
} from "@/pages/ProductosYServicios/syscomCatalog";
import {
  proyectoEmptyPanelClass,
  proyectoPickerModalBodyClass,
  proyectoPickerModalClass,
  proyectoPickerModalHeaderClass,
} from "./proyectoPageStyles";

export type SyscomModeloSeleccionado = {
  modelo: string;
  productoId: string;
  marca: string;
  titulo: string;
  imagenUrl?: string;
  fuenteProducto?: "syscom" | "tvc" | "manual";
};

type Props = {
  open: boolean;
  equipoLabel: string;
  modeloActual: string;
  onClose: () => void;
  onSelect: (producto: SyscomModeloSeleccionado) => void;
};

function formatModeloLabel(p: SyscomProducto): string {
  const marca = String(p.marca || "").trim();
  const modelo = String(p.modelo || "").trim();
  const titulo = String(p.titulo || "").trim();
  if (marca && modelo) return `${marca} - ${modelo}`;
  if (modelo) return modelo;
  if (titulo) return titulo;
  return p.producto_id;
}

export function ProyectoSyscomModeloPicker({
  open,
  equipoLabel,
  modeloActual,
  onClose,
  onSelect,
}: Props) {
  const titleId = useId();
  const searchId = useId();
  const searchGenRef = useRef(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productos, setProductos] = useState<SyscomProducto[]>([]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setProductos([]);
    setError("");
    setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = search.trim();
    if (q.length < 2) {
      setProductos([]);
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
        const { ok, productos: rows } = await fetchSyscomProductosSugerencia(q, {
          signal: ac.signal,
        });
        if (runGen !== searchGenRef.current) return;
        if (!ok && rows.length === 0) {
          setProductos([]);
          setError("No se pudo consultar Syscom en este momento.");
          return;
        }
        setProductos(rows);
      } catch (e) {
        if (runGen !== searchGenRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setProductos([]);
        setError("Error de conexión con Syscom.");
      } finally {
        if (runGen === searchGenRef.current) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [open, search]);

  const handleSelect = (p: SyscomProducto) => {
    const fuente =
      p.fuente === "tvc" || p.fuente === "manual" || p.fuente === "syscom" ? p.fuente : "syscom";
    onSelect({
      modelo: formatModeloLabel(p),
      productoId: String(p.producto_id || ""),
      marca: String(p.marca || "").trim(),
      titulo: String(p.titulo || "").trim(),
      imagenUrl: getCatalogProductoImageUrl(p) || undefined,
      fuenteProducto: fuente,
    });
  };

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
            <p className={erpSectionLabelClass}>Proyectos · Catálogo Syscom</p>
            <h3 id={titleId} className={`mt-1 ${erpSubheadingClass}`}>
              Cambiar modelo
            </h3>
            <p className={`${erpBodyClass} mt-1 text-sm`}>
              Busca y elige un producto de Syscom para reemplazar{" "}
              <span className="font-medium text-[#1c1917] dark:text-[#f8fafc]">{equipoLabel || modeloActual}</span>.
            </p>
          </div>
        </div>
      </header>

      <div className={proyectoPickerModalBodyClass}>
        <div>
          <Label htmlFor={searchId}>Buscar en Syscom</Label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Modelo, marca o descripción…"
            className={`${erpInputLikeClass} mt-1.5`}
            autoComplete="off"
            autoFocus
          />
          <p className="mt-1.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
            Escribe al menos 2 caracteres. Mismo catálogo que Productos.
          </p>
        </div>

        <div className="mt-4" role="status" aria-live="polite">
          {loading ? (
            <p className="text-sm text-[#78716c] dark:text-[#8ea0b8]">Buscando en Syscom…</p>
          ) : null}
          {error ? (
            <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <ul className="mt-3 space-y-2" role="listbox" aria-label="Productos Syscom">
          {!loading && search.trim().length >= 2 && productos.length === 0 && !error ? (
            <li className={`${proyectoEmptyPanelClass} py-6`} role="status">
              Sin resultados para “{search.trim()}”.
            </li>
          ) : null}

          {productos.map((p) => {
            const img = getCatalogProductoImageUrl(p) || getProductoImageUrl(p.img_portada);
            const label = formatModeloLabel(p);
            return (
              <li key={p.producto_id}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center gap-3 rounded-xl border border-[#e7ded0] bg-[#fffdfa] px-3 py-2.5 text-left transition-colors hover:border-[#ff801f]/40 hover:bg-[#fff8f1] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/25 dark:border-[#334155] dark:bg-[#111a2b] dark:hover:bg-[#1e293b]/60"
                  onClick={() => handleSelect(p)}
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
                    <span className="block truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                      {label}
                    </span>
                    {p.titulo && p.titulo !== label ? (
                      <span className="mt-0.5 block truncate text-xs text-[#78716c] dark:text-[#8ea0b8]">
                        {p.titulo}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-[10px] tabular-nums text-[#a8a29e] dark:text-[#64748b]">
                      ID {p.producto_id}
                      {typeof p.total_existencia === "number"
                        ? ` · Stock ${p.total_existencia}`
                        : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex justify-end border-t border-[#e7ded0] pt-4 dark:border-[#334155]">
          <button type="button" className={erpSecondaryBtnClass} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
