import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/config/api";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpHeroBlurClass,
  erpHeroHeadingClass,
  erpHeroIconWrapClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSecondaryBtnClass,
  erpSubheadingClass,
  osHeroBandClass,
  osHeroBodyClass,
  osHeroEyebrowClass,
  outlineCoralBtnClass as outlineBlueBtnClass,
  pageCardShellClass,
  sectionLabelOrangeClass as eyebrowBlueClass,
} from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";

const viewerFrameClass =
  "h-[72vh] min-h-[480px] w-full flex-1 border-0 sm:h-[76vh] sm:min-h-[560px] lg:h-[calc(100vh-14rem)] lg:min-h-[calc(100vh-14rem)]";

const iconClass = "h-4 w-4 shrink-0";

const externalLinkIcon = (
  <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const downloadIcon = (
  <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const backIcon = (
  <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M10 19 3 12l7-7" />
    <path d="M3 12h18" />
  </svg>
);

const retryIcon = (
  <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const fileIcon = (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const emptyDocIcon = (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M10 13h4" />
    <path d="M10 17h7" />
  </svg>
);

const eyeIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const chipIconClass = "h-3.5 w-3.5 shrink-0";

const CONTENT_CHIPS = [
  {
    id: "orden",
    label: "Orden",
    icon: (
      <svg className={chipIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "datos",
    label: "Datos",
    icon: (
      <svg className={chipIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "evidencia",
    label: "Antes / Después",
    icon: (
      <svg className={chipIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
] as const;

const heroChipClass =
  "inline-flex items-center rounded-full bg-white/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/90";

/**
 * Vista previa / descarga del PDF de un reporte de mantenimiento.
 */
export default function ReportePdfPage() {
  const params = useParams();
  const reporteId = params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = (location.state as { from?: string } | null)?.from || "/reportes-mantenimiento";

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("reporte-mantenimiento.pdf");
  const [isHtmlFallback, setIsHtmlFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [folioLabel, setFolioLabel] = useState<string | null>(null);
  const [clienteNombre, setClienteNombre] = useState<string | null>(null);
  const [ordenFolio, setOrdenFolio] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "error", title: "", message: "" });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!reporteId) {
        if (isMounted) {
          setAlert({
            show: true,
            variant: "error",
            title: "Error",
            message: "No se encontró el ID del reporte.",
          });
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setAlert((prev) => ({ ...prev, show: false }));
        }

        const [metaRes, resp] = await Promise.all([
          fetchApi(`/api/reportes-mantenimiento/${reporteId}/`, {
            cache: "no-store" as RequestCache,
          }),
          fetchApi(`/api/reportes-mantenimiento/${reporteId}/pdf/`),
        ]);
        if (isMounted && metaRes.ok) {
          const meta = (await metaRes.json().catch(() => null)) as {
            folio?: string | null;
            idx?: number | null;
            orden_folio?: string | null;
            orden_cliente?: string | null;
          } | null;
          if (meta) {
            const folio =
              String(meta.folio || "").trim() ||
              formatDocumentFolio(FOLIO_SERIE.reporte, meta.idx);
            setFolioLabel(folio || null);
            const cliente = String(meta.orden_cliente || "").trim();
            setClienteNombre(cliente || null);
            const odt = String(meta.orden_folio || "").trim();
            setOrdenFolio(odt || null);
          }
        }
        if (!isMounted) return;

        if (!resp.ok) {
          let msg = `No se pudo generar el PDF (HTTP ${resp.status}).`;
          try {
            const ct = resp.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const data = await resp.json();
              msg = (data as { detail?: string })?.detail || msg;
            } else {
              msg = (await resp.text()) || msg;
            }
          } catch {
            /* ignore parse errors */
          }
          setAlert({ show: true, variant: "error", title: "Error", message: msg });
          setPdfObjectUrl(null);
          return;
        }

        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        const dispo = resp.headers.get("content-disposition") || "";
        const m = dispo.match(/filename="?([^";]+)"?/i);
        const isPdf = ct.includes("application/pdf");
        setIsHtmlFallback(!isPdf);
        setFilename(
          m?.[1]
            ? String(m[1])
            : isPdf
              ? `Reporte_Mantenimiento_${reporteId}.pdf`
              : `Reporte_Mantenimiento_${reporteId}.html`
        );

        const blob = await resp.blob();
        setPdfObjectUrl(URL.createObjectURL(blob));
      } catch {
        if (isMounted) {
          setAlert({
            show: true,
            variant: "error",
            title: "Error",
            message: "No se pudo cargar el PDF del reporte.",
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, [reporteId, reloadKey]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  const viewerTitle = folioLabel
    ? `Vista previa del reporte ${folioLabel}`
    : "Vista previa del reporte de mantenimiento";

  return (
    <div className={erpPageCanvasClass} style={erpSansStyle}>
      <div className={erpPageInnerClass}>
        <PageMeta
          title="PDF Reporte de mantenimiento | Digitalflow"
          description="Vista previa y descarga del PDF del reporte"
        />

        <nav className={erpBreadcrumbNavClass} aria-label="Migas de pan">
          <Link to="/" className={erpBreadcrumbLinkClass}>
            Inicio
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#273244]" aria-hidden>
            /
          </span>
          <Link to="/reportes-mantenimiento" className={erpBreadcrumbLinkClass}>
            Reporte de mantenimiento
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#273244]" aria-hidden>
            /
          </span>
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Vista PDF</span>
        </nav>

        {alert.show ? (
          <div role="alert" aria-live="assertive">
            <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
          </div>
        ) : null}

        {/* Hero marino */}
        <header className={osHeroBandClass}>
          <div className={erpHeroBlurClass} aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className={erpHeroIconWrapClass} aria-hidden>
                {fileIcon}
              </span>
              <div className="min-w-0">
                <p className={osHeroEyebrowClass}>Reporte de mantenimiento</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className={erpHeroHeadingClass}>Vista PDF</h1>
                  {folioLabel ? (
                    <span className={cn(heroChipClass, "font-mono text-[#F6D8AE]")}>{folioLabel}</span>
                  ) : null}
                  {ordenFolio ? <span className={heroChipClass}>{ordenFolio}</span> : null}
                </div>
                <p className={cn(osHeroBodyClass, "line-clamp-2 sm:line-clamp-none")}>
                  {clienteNombre
                    ? `Documento de mantenimiento de ${clienteNombre}: orden vinculada y evidencia Antes / Después.`
                    : "Revisa el documento en el panel; desde el lateral lo abres en otra pestaña o lo descargas."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(returnPath)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-white/10 px-3 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Volver al listado de reportes"
            >
              {backIcon}
              <span className="hidden sm:inline">Volver al listado</span>
              <span className="sm:hidden">Volver</span>
            </button>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
          {/* Visor */}
          <div className="min-w-0 lg:col-span-8">
            <div className={cn("flex min-h-0 flex-col overflow-hidden", pageCardShellClass, "lg:min-h-[calc(100vh-14rem)]")}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3 dark:border-[#273244] dark:bg-[#151E32] sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    {eyeIcon}
                  </span>
                  <div>
                    <p className={eyebrowBlueClass}>Vista previa</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                      {isHtmlFallback ? "Documento HTML" : "Reporte"}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  {isHtmlFallback
                    ? "Respaldo HTML: el motor PDF no está disponible."
                    : "El visor usa el motor PDF del navegador."}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-[#FAFAFA] p-2 dark:bg-[#0f172a] sm:p-3">
                {loading ? (
                  <div
                    className="flex min-h-[min(100dvh,520px)] flex-1 flex-col items-center justify-center rounded-[14px] border border-dashed border-[#E7E7EA] bg-white/60 dark:border-[#273244] dark:bg-[#111827]/40 sm:min-h-[560px] lg:min-h-[calc(100vh-15rem)]"
                    role="status"
                    aria-busy="true"
                    aria-live="polite"
                    aria-label="Cargando documento"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(27,92,255,0.10)]">
                      <span
                        className="h-7 w-7 animate-spin rounded-full border-2 border-[#E7E7EA] border-t-[#1B5CFF] motion-reduce:animate-none dark:border-[#273244] dark:border-t-[#4B7CFF]"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-4 text-sm text-[#6E6E77] dark:text-[#8EA0B8]">Preparando vista previa…</p>
                  </div>
                ) : pdfObjectUrl ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-[14px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#0f172a]">
                    <iframe
                      title={viewerTitle}
                      aria-label={viewerTitle}
                      src={pdfObjectUrl}
                      loading="lazy"
                      className={viewerFrameClass}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[min(100dvh,400px)] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#E7E7EA] bg-white/60 px-6 py-12 text-center dark:border-[#273244] dark:bg-[#111827]/40 lg:min-h-[calc(100vh-15rem)]">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:text-[#4B7CFF]">
                      {emptyDocIcon}
                    </div>
                    <p className="text-base font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                      No hay documento disponible
                    </p>
                    <p className="mt-1.5 max-w-sm text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
                      No se pudo generar la vista previa. Comprueba el reporte o vuelve al listado.
                    </p>
                    <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                      <button
                        type="button"
                        className={cn(erpPrimaryBtnClass, "h-10")}
                        onClick={() => setReloadKey((k) => k + 1)}
                      >
                        {retryIcon}
                        Reintentar
                      </button>
                      <Link
                        to="/reportes-mantenimiento"
                        className="text-sm font-medium text-[#1B5CFF] underline-offset-4 hover:underline dark:text-[#4B7CFF]"
                      >
                        Ir a reportes
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel lateral */}
          <aside className="min-w-0 lg:col-span-4 lg:sticky lg:top-6 lg:self-start xl:top-8">
            <div className={cn("overflow-hidden", pageCardShellClass)}>
              <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-5">
                <p className={eyebrowBlueClass}>Documento</p>
                <h2 className={cn("mt-1", erpSubheadingClass)}>Archivo y acciones</h2>
                <p className="mt-1 text-xs text-[#6E6E77] dark:text-[#8EA0B8] sm:text-sm">
                  Nombre sugerido al descargar y accesos rápidos.
                </p>
              </div>

              <div className="space-y-4 px-4 py-5 sm:px-5">
                <ul className="flex flex-wrap gap-1.5" aria-label="Secciones del documento">
                  {CONTENT_CHIPS.map((chip) => (
                    <li
                      key={chip.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-2.5 py-1 text-[11px] font-medium text-[#52525B] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#B7C1D1]"
                    >
                      <span className="text-[#1B5CFF] dark:text-[#4B7CFF]">{chip.icon}</span>
                      {chip.label}
                    </li>
                  ))}
                </ul>

                <div className="rounded-[14px] border border-[#E7E7EA] bg-[#FAFAFA] px-3 py-2.5 dark:border-[#273244] dark:bg-[#151E32]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#8EA0B8]">
                    Nombre de archivo
                  </p>
                  <code className="mt-1 block break-all rounded-[8px] border border-[#E7E7EA] bg-white px-2.5 py-1.5 text-xs font-medium text-[#09090B] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#e5e7eb]">
                    {filename}
                  </code>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <a
                    href={pdfObjectUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    tabIndex={pdfObjectUrl ? undefined : -1}
                    className={cn(outlineBlueBtnClass, !pdfObjectUrl && "pointer-events-none opacity-50")}
                    aria-disabled={!pdfObjectUrl}
                    onClick={(e) => {
                      if (!pdfObjectUrl) e.preventDefault();
                    }}
                  >
                    {externalLinkIcon}
                    <span className="hidden sm:inline">Abrir en nueva pestaña</span>
                    <span className="sm:hidden">Abrir</span>
                  </a>

                  <button
                    type="button"
                    disabled={!pdfObjectUrl}
                    className={cn(erpPrimaryBtnClass, "h-11 sm:h-10")}
                    onClick={() => {
                      if (!pdfObjectUrl) return;
                      const a = document.createElement("a");
                      a.href = pdfObjectUrl;
                      a.download = filename;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    }}
                  >
                    {downloadIcon}
                    {isHtmlFallback ? "Descargar HTML" : "Descargar PDF"}
                  </button>

                  {reporteId ? (
                    <Link to={`/reportes-mantenimiento/${reporteId}`} className={cn(erpSecondaryBtnClass, "h-10")}>
                      Editar reporte
                    </Link>
                  ) : null}
                </div>

                <p className="text-[11px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
                  Si la vista previa se ve cortada o pesa mucho (fotos), abre el archivo en una pestaña nueva o
                  descárgalo.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
