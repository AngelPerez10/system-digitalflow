/**
 * Catálogo · Detalle de producto (ficha).
 *
 * Escritorio: dos paneles — galería fija a la izquierda (flechas, contador,
 * miniaturas, lupa al pasar el cursor, ← →) y ficha desplazable a la derecha
 * (identidad, precio, datos clave y pestañas Descripción · Características ·
 * Documentos). Móvil: una columna con la galería arriba.
 *
 * Movimiento (solo transform/opacity, apagado con prefers-reduced-motion):
 * entrada escalonada de la ficha, fundido al cambiar de foto, lupa por
 * `transform-origin` (se escribe directo en el DOM, sin re-render), indicador
 * de pestaña deslizante.
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  ImageOff,
  ListChecks,
  ReceiptText,
  ScrollText,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import "@/components/ui/modal-kit/motion.css";
import {
  formatPrecioPublicoMxnConIva,
  getProductoImagenesUrls,
  getProductoLink,
  type SyscomProductoDetalle,
} from "../syscomCatalog";
import { btn, fontSans } from "./productosStyles";
import { STOCK_TOPE, htmlAParrafos, stockDe, stockEsTope, stockTexto } from "./productosFiltros";
import { FuenteBadge } from "./ProductosViews";

type Props = {
  open: boolean;
  loading: boolean;
  product: SyscomProductoDetalle | null;
  tipoCambio: number | null;
  selectedImageIndex: number;
  onSelectImage: (i: number) => void;
  onClose: () => void;
  titleId: string;
};

type TabId = "descripcion" | "caracteristicas" | "documentos";

const FUENTE_NOMBRE: Record<string, string> = { syscom: "SYSCOM", tvc: "TVC", intrax: "Intrax", manual: "Catálogo propio" };

export default function ProductoDetalleModal({
  open,
  loading,
  product,
  tipoCambio,
  selectedImageIndex,
  onSelectImage,
  onClose,
  titleId,
}: Props) {
  const imagenes = useMemo(() => (product ? getProductoImagenesUrls(product) : []), [product]);
  const total = imagenes.length;
  const idx = total ? Math.min(Math.max(0, selectedImageIndex), total - 1) : 0;
  const link = product ? getProductoLink(product) : "";
  const cotizacion = Boolean(product?.precio_bajo_cotizacion);

  // Descripción: TVC ya la manda por bloques en texto; SYSCOM en HTML.
  const secciones = useMemo(() => {
    if (!product) return [];
    if (product.secciones?.length) return product.secciones;
    const parrafos = htmlAParrafos(product.descripcion);
    return parrafos.length ? [{ titulo: "", texto: parrafos.join("\n") }] : [];
  }, [product]);
  const documentos = useMemo(
    () => [
      ...(product?.documentos ?? []),
      ...(product?.recursos ?? [])
        .filter((r) => r?.path)
        .map((r) => ({ nombre: r.recurso || "Documento", url: String(r.path) })),
    ],
    [product],
  );
  const caracteristicas = product?.caracteristicas ?? [];

  const tabs = useMemo(() => {
    const t: { id: TabId; label: string; count?: number; icon: ReactNode }[] = [];
    if (secciones.length) t.push({ id: "descripcion", label: "Descripción", icon: <ScrollText className="size-4" aria-hidden /> });
    if (caracteristicas.length)
      t.push({ id: "caracteristicas", label: "Características", count: caracteristicas.length, icon: <ListChecks className="size-4" aria-hidden /> });
    if (documentos.length) t.push({ id: "documentos", label: "Documentos", count: documentos.length, icon: <FileText className="size-4" aria-hidden /> });
    return t;
  }, [secciones.length, caracteristicas.length, documentos.length]);

  const [tab, setTab] = useState<TabId>("descripcion");
  const tabActiva = tabs.find((t) => t.id === tab) ? tab : (tabs[0]?.id ?? "descripcion");
  const tabIndex = Math.max(0, tabs.findIndex((t) => t.id === tabActiva));
  const baseId = useId();

  // Cada producto abre en su primera pestaña.
  useEffect(() => {
    setTab(tabs[0]?.id ?? "descripcion");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de producto
  }, [product?.producto_id]);

  // ← → cambian de foto (si el foco no está en un campo de texto).
  useEffect(() => {
    if (!open || total < 2) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (t?.getAttribute("role") === "tab") return;
      if (e.key === "ArrowRight") onSelectImage((idx + 1) % total);
      if (e.key === "ArrowLeft") onSelectImage((idx - 1 + total) % total);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, total, idx, onSelectImage]);

  const stock = product ? stockDe(product) : null;
  const stockLabel = product ? stockTexto(product) : null;
  const fuenteNombre = FUENTE_NOMBRE[(product?.fuente || "syscom").toLowerCase()] ?? product?.fuente ?? "";

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={onClose}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      className={`${fontSans} flex max-h-[min(94dvh,860px)] w-full flex-col overflow-hidden rounded-t-[22px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_32px_80px_-24px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:bg-[#111827]! sm:w-[min(96vw,68rem)] sm:max-w-5xl sm:rounded-[22px]`}
    >
      {/* Barra superior */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#F0F0F2] px-4 dark:border-[#1F2A3C] sm:px-5">
        <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]" aria-label="Ubicación">
          <span className="shrink-0 font-medium">Catálogo</span>
          <ChevronRight className="size-3.5 shrink-0 text-[#D4D4D8] dark:text-[#3A4661]" aria-hidden />
          <span className="shrink-0 font-medium">{fuenteNombre || "Producto"}</span>
          {product?.marca ? (
            <>
              <ChevronRight className="size-3.5 shrink-0 text-[#D4D4D8] dark:text-[#3A4661]" aria-hidden />
              <span className="truncate font-semibold text-[#09090B] dark:text-[#F8FAFC]">{product.marca}</span>
            </>
          ) : null}
        </nav>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-[#6E6E77] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#8EA0B8] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {loading ? (
        <Esqueleto titleId={titleId} />
      ) : !product ? (
        <div className="cot-fade flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-[14px] bg-[#F4F4F5] text-[#A1A1AA] dark:bg-[#1B2539]">
            <ImageOff className="size-6" aria-hidden />
          </span>
          <h2 id={titleId} className="mt-3 text-[16px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
            No se pudo cargar este producto
          </h2>
          <p className="mt-1 max-w-sm text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Puede que ya no esté disponible en el catálogo del proveedor.</p>
        </div>
      ) : (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:overflow-hidden">
          {/* ================= Galería ================= */}
          <section
            aria-label="Fotos del producto"
            className="cot-fade border-b border-[#F0F0F2] bg-[#FAFAFA] p-4 dark:border-[#1F2A3C] dark:bg-[#0F172A] sm:p-5 md:border-b-0 md:border-r md:overflow-y-auto"
          >
            <Galeria imagenes={imagenes} idx={idx} alt={product.titulo} onSelect={onSelectImage} />
          </section>

          {/* ================= Ficha ================= */}
          <section className="custom-scrollbar min-w-0 md:overflow-y-auto md:overscroll-contain">
            <div className="space-y-6 p-5 sm:p-6">
              {/* Identidad */}
              <div className="cot-rise space-y-3" style={{ "--cot-i": 0 } as CSSProperties}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <FuenteBadge fuente={product.fuente} />
                  {product.tipo_flujo ? (
                    <span className="inline-flex h-5 items-center rounded-full bg-[#F4F4F5] px-2 text-[10.5px] font-semibold text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]">
                      {product.tipo_flujo}
                    </span>
                  ) : null}
                </div>
                <h2 id={titleId} className="text-[20px] font-semibold leading-[1.3] tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC] sm:text-[22px]">
                  {product.titulo}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  {product.marca ? <span className="font-medium text-[#3F3F46] dark:text-[#D6DEEA]">{product.marca}</span> : null}
                  {product.modelo || product.sku ? (
                    <CopyChip label="Modelo" value={product.modelo || product.sku || ""} />
                  ) : null}
                </div>
              </div>

              {/* Precio y disponibilidad */}
              <div
                className="cot-rise overflow-hidden rounded-[18px] border border-[#E7E7EA] dark:border-[#273244]"
                style={{ "--cot-i": 1 } as CSSProperties}
              >
                <div className={`p-5 ${cotizacion ? "bg-[#FFF8EB] dark:bg-[rgba(230,162,60,0.08)]" : "bg-gradient-to-br from-[#F7F9FF] to-white dark:from-[#1B2A63]/40 dark:to-[#111827]"}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">Precio público</p>
                  {cotizacion ? (
                    <>
                      <p className="mt-1.5 flex items-center gap-2 text-[24px] font-bold leading-tight tracking-[-0.6px] text-[#8A5D0F] dark:text-[#E6A23C]">
                        <ReceiptText className="size-6" aria-hidden />
                        Bajo cotización
                      </p>
                      <p className="mt-1.5 max-w-md text-[13px] leading-[19px] text-[#7A5A1C] dark:text-[#E6C58A]">
                        TVC vende este producto por proyecto: no publica precio ni existencia. Solicítalo a tu ejecutivo TVC.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-[34px] font-bold leading-none tabular-nums tracking-[-1px] text-[#09090B] dark:text-[#F8FAFC]">
                        {formatPrecioPublicoMxnConIva(product, tipoCambio)}
                      </p>
                      <p className="mt-2 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
                        MXN · IVA incluido{tipoCambio ? ` · TC $${tipoCambio.toFixed(2)}` : ""}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2.5 border-t border-[#F0F0F2] bg-white px-5 py-3 text-[13px] dark:border-[#1F2A3C] dark:bg-[#111827]">
                  <span
                    className={`relative inline-flex size-2.5 shrink-0 rounded-full ${
                      stock == null ? "bg-[#E6A23C]" : stock > 0 ? "bg-[#22A06B]" : "bg-[#A1A1AA]"
                    }`}
                    aria-hidden
                  >
                    {stock != null && stock > 0 ? (
                      <span className="absolute inset-0 rounded-full bg-[#22A06B] opacity-60 motion-safe:animate-ping" />
                    ) : null}
                  </span>
                  <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">
                    {stock == null
                      ? "Existencia por consultar"
                      : stock > 0
                        ? `${stockLabel} disponibles`
                        : "Sin existencia"}
                  </span>
                  {stockEsTope(product) ? (
                    <span className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">· el proveedor publica hasta {STOCK_TOPE}</span>
                  ) : null}
                </div>
              </div>

              {/* Datos clave */}
              <dl className="cot-rise grid grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-[#E7E7EA] dark:border-[#273244] dark:bg-[#273244]" style={{ "--cot-i": 2 } as CSSProperties}>
                <Dato label="Marca" value={product.marca || "—"} />
                <Dato label="Modelo / SKU" value={product.modelo || product.sku || "—"} mono />
                <Dato
                  label="Clave SAT"
                  value={product.sat_key?.trim() || "—"}
                  mono
                  extra={product.sat_description?.trim() || undefined}
                  copiable={Boolean(product.sat_key?.trim())}
                />
                <Dato label="Fuente" value={fuenteNombre || "—"} />
              </dl>

              {/* Pestañas */}
              {tabs.length ? (
                <div className="cot-rise" style={{ "--cot-i": 3 } as CSSProperties}>
                  <div
                    role="tablist"
                    aria-label="Información del producto"
                    className="relative grid border-b border-[#E7E7EA] dark:border-[#273244]"
                    style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                      e.preventDefault();
                      const next = (tabIndex + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                      setTab(tabs[next].id);
                      document.getElementById(`${baseId}-tab-${tabs[next].id}`)?.focus();
                    }}
                  >
                    {tabs.map((t) => {
                      const on = t.id === tabActiva;
                      return (
                        <button
                          key={t.id}
                          id={`${baseId}-tab-${t.id}`}
                          type="button"
                          role="tab"
                          aria-selected={on}
                          aria-controls={`${baseId}-panel-${t.id}`}
                          tabIndex={on ? 0 : -1}
                          onClick={() => setTab(t.id)}
                          className={`inline-flex min-h-11 items-center justify-center gap-1.5 px-2 text-[13.5px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 ${
                            on ? "text-[#1B5CFF] dark:text-[#7EA0FF]" : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
                          }`}
                        >
                          <span className="hidden sm:inline-flex">{t.icon}</span>
                          {t.label}
                          {t.count ? (
                            <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? "bg-[rgba(27,92,255,0.10)] dark:bg-[rgba(75,124,255,0.18)]" : "bg-[#F4F4F5] dark:bg-white/[0.06]"}`}>
                              {t.count}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -bottom-px left-0 h-0.5 rounded-full bg-[#1B5CFF] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#4B7CFF]"
                      style={{ width: `${100 / tabs.length}%`, transform: `translateX(${tabIndex * 100}%)` }}
                    />
                  </div>

                  <div className="pt-4">
                    {tabActiva === "descripcion" ? (
                      <div key="descripcion" id={`${baseId}-panel-descripcion`} role="tabpanel" aria-labelledby={`${baseId}-tab-descripcion`} className="cot-fade space-y-5">
                        {secciones.map((sec, i) => (
                          <div key={i}>
                            {sec.titulo ? (
                              <h3 className="mb-2 text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{sec.titulo}</h3>
                            ) : null}
                            <div className="space-y-2 text-[14px] leading-[22px] text-[#3F3F46] dark:text-[#D6DEEA]">
                              {sec.texto.split("\n").map((linea, j) => (
                                <p key={j}>{linea}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {tabActiva === "caracteristicas" ? (
                      <ul key="caracteristicas" id={`${baseId}-panel-caracteristicas`} role="tabpanel" aria-labelledby={`${baseId}-tab-caracteristicas`} className="cot-fade grid gap-2.5">
                        {caracteristicas.map((c, i) => (
                          <li key={i} className="flex gap-3 text-[14px] leading-[21px] text-[#3F3F46] dark:text-[#D6DEEA]">
                            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgba(27,92,255,0.08)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]" aria-hidden>
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {tabActiva === "documentos" ? (
                      <ul key="documentos" id={`${baseId}-panel-documentos`} role="tabpanel" aria-labelledby={`${baseId}-tab-documentos`} className="cot-fade grid gap-2">
                        {documentos.map((d) => (
                          <li key={d.url}>
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex min-h-12 items-center gap-3 rounded-[12px] border border-[#E7E7EA] px-3.5 py-2.5 transition-[border-color,background-color] duration-150 hover:border-[#1B5CFF]/40 hover:bg-[#F7F9FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:border-[#273244] dark:hover:bg-[#1B2A63]/30"
                            >
                              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
                                <FileText className="size-4" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-medium text-[#09090B] dark:text-[#F8FAFC]" title={d.nombre}>
                                  {d.nombre}
                                </span>
                                <span className="text-[11.5px] text-[#6E6E77] dark:text-[#8EA0B8]">{extension(d.url)}</span>
                              </span>
                              <ExternalLink className="size-4 shrink-0 text-[#A1A1AA] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      )}

      <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3.5 dark:border-[#273244] dark:bg-[#151E32] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="hidden text-[12px] text-[#6E6E77] dark:text-[#8EA0B8] sm:block">
          {total > 1 ? "Usa ← → para cambiar de foto." : "Información del proveedor, sujeta a cambios."}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cerrar
          </button>
          {product && link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className={btn.primary}>
              Ver en {fuenteNombre || "proveedor"}
              <ExternalLink aria-hidden />
            </a>
          ) : null}
        </div>
      </footer>
    </Modal>
  );
}

/* --------------------------------------------------------------------------
   Galería con lupa
   -------------------------------------------------------------------------- */

function Galeria({ imagenes, idx, alt, onSelect }: { imagenes: string[]; idx: number; alt: string; onSelect: (i: number) => void }) {
  const total = imagenes.length;
  const zoomRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(false);
  const principal = imagenes[idx];

  // La lupa mueve `transform-origin` directo en el DOM: sin re-render por movimiento.
  const mover = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = zoomRef.current;
    if (!img) return;
    const r = e.currentTarget.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  };

  const flecha =
    "absolute top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E7E7EA] bg-white/90 text-[#3F3F46] shadow-[0_4px_12px_-4px_rgba(9,9,11,0.25)] backdrop-blur-sm transition-[opacity,transform] duration-150 hover:scale-105 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 motion-reduce:transition-none dark:border-[#273244] dark:bg-[#151E32]/90 dark:text-[#D6DEEA] md:opacity-0 md:group-hover:opacity-100";

  return (
    <div className="space-y-3 md:sticky md:top-0">
      <div
        className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-[18px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={mover}
      >
        {principal ? (
          <img
            key={principal}
            ref={zoomRef}
            src={principal}
            alt={alt}
            decoding="async"
            className={`cot-fade h-full w-full object-contain p-6 transition-transform duration-200 ease-out motion-reduce:transition-none ${
              zoom ? "md:scale-[1.8] md:cursor-zoom-in" : "scale-100"
            }`}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-[#D4D4D8] dark:text-[#3A4661]" aria-hidden>
            <ImageOff className="size-10" strokeWidth={1.4} />
            <span className="text-[12px] text-[#A1A1AA]">Sin foto</span>
          </span>
        )}

        {total > 1 ? (
          <>
            <button type="button" onClick={() => onSelect((idx - 1 + total) % total)} aria-label="Foto anterior" className={`${flecha} left-3`}>
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => onSelect((idx + 1) % total)} aria-label="Foto siguiente" className={`${flecha} right-3`}>
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#09090B]/70 px-2.5 py-1 text-[11.5px] font-medium tabular-nums text-white backdrop-blur-sm" aria-live="polite">
              {idx + 1} / {total}
            </span>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Miniaturas">
          {imagenes.map((url, i) => {
            const on = i === idx;
            return (
              <button
                key={url + i}
                type="button"
                role="option"
                aria-selected={on}
                aria-label={`Foto ${i + 1} de ${total}`}
                onClick={() => onSelect(i)}
                className={`size-16 shrink-0 overflow-hidden rounded-[12px] border-2 bg-white p-1 transition-[border-color,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:bg-[#111827] ${
                  on ? "border-[#1B5CFF] dark:border-[#4B7CFF]" : "border-transparent opacity-65 hover:opacity-100"
                }`}
              >
                <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Piezas
   -------------------------------------------------------------------------- */

function useCopiar() {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(false), 1600);
    return () => window.clearTimeout(t);
  }, [copiado]);
  const copiar = (texto: string) => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(texto).then(() => setCopiado(true), () => {});
  };
  return { copiado, copiar };
}

function CopyChip({ label, value }: { label: string; value: string }) {
  const { copiado, copiar } = useCopiar();
  return (
    <button
      type="button"
      onClick={() => copiar(value)}
      title={`Copiar ${label.toLowerCase()}`}
      aria-label={`Copiar ${label.toLowerCase()} ${value}`}
      className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-[#E7E7EA] bg-[#FAFAFA] px-2 font-mono text-[12px] text-[#3F3F46] transition-colors hover:border-[#D3D3D8] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#D6DEEA]"
    >
      {value}
      {copiado ? <Check className="cot-tick size-3.5 text-[#04724D] dark:text-[#4ADE80]" aria-hidden /> : <Copy className="size-3.5 text-[#A1A1AA]" aria-hidden />}
      <span className="sr-only" aria-live="polite">{copiado ? "Copiado" : ""}</span>
    </button>
  );
}

function Dato({ label, value, mono, extra, copiable }: { label: string; value: string; mono?: boolean; extra?: string; copiable?: boolean }) {
  const { copiado, copiar } = useCopiar();
  return (
    <div className="min-w-0 bg-white px-4 py-3 dark:bg-[#111827]">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-1.5">
        <span className={`truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC] ${mono ? "font-mono text-[13px]" : ""}`} title={value}>
          {value}
        </span>
        {copiable ? (
          <button
            type="button"
            onClick={() => copiar(value)}
            aria-label={`Copiar ${label.toLowerCase()}`}
            title="Copiar"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]"
          >
            {copiado ? <Check className="cot-tick size-3.5 text-[#04724D] dark:text-[#4ADE80]" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          </button>
        ) : null}
      </dd>
      {extra ? <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]" title={extra}>{extra}</p> : null}
    </div>
  );
}

function extension(url: string) {
  const m = /\.([a-z0-9]{2,5})(?:$|\?)/i.exec(url);
  return m ? `Archivo ${m[1].toUpperCase()}` : "Documento";
}

function Esqueleto({ titleId }: { titleId: string }) {
  return (
    <div className="min-h-0 flex-1 md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" aria-busy="true">
      <h2 id={titleId} className="sr-only">
        Cargando producto
      </h2>
      <div className="border-b border-[#F0F0F2] bg-[#FAFAFA] p-5 dark:border-[#1F2A3C] dark:bg-[#0F172A] md:border-b-0 md:border-r">
        <div className="aspect-square rounded-[18px] bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
        <div className="mt-3 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="size-16 rounded-[12px] bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
          ))}
        </div>
      </div>
      <div className="space-y-4 p-6">
        <span className="block h-5 w-24 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
        <span className="block h-6 w-11/12 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
        <span className="block h-6 w-2/3 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
        <span className="block h-28 w-full rounded-[18px] bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32]" />
        <span className="block h-24 w-full rounded-[16px] bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32]" />
      </div>
    </div>
  );
}
