import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import {
  erpCardShellClass as cardShellClass,
  erpCardShellMutedClass,
  erpHeroHeadingClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import {
  claudeBodyClass,
  outlineCoralBtnClass,
  sectionLabelOrangeClass,
} from "@/pages/Operacion/OrdenesTrabajo/ordenTrabajoStyles";

const viewerFrameClass =
  "h-[72vh] min-h-[480px] w-full flex-1 border-0 sm:h-[76vh] sm:min-h-[560px] lg:h-[calc(100vh-13.5rem)] lg:min-h-[calc(100vh-13.5rem)]";

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
  <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
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

const CONTENT_CHIPS = [
  { id: "servicio", label: "Servicio CCTV" },
  { id: "conceptos", label: "Conceptos" },
  { id: "equipos", label: "Equipos" },
  { id: "firmas", label: "Firmas" },
] as const;

function filenameFromDisposition(dispo: string, fallback: string): string {
  const match = dispo.match(/filename="?([^";]+)"?/i);
  return match?.[1] ? String(match[1]) : fallback;
}

function triggerBlobDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Vista previa de la plantilla PDF CCTV (datos de ejemplo + folio/cliente del listado).
 */
export default function PolizaPdfPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnPath = (location.state as { from?: string } | null)?.from || "/polizas-mantenimiento";

  const tipo = (searchParams.get("tipo") || "cctv").trim().toLowerCase() || "cctv";
  const folioLabel = (searchParams.get("folio") || "").trim();
  const clienteNombre = (searchParams.get("cliente") || "").trim();
  const polizaId = (searchParams.get("id") || "").trim();

  const pdfDownloadPath = useMemo(() => {
    if (/^\d+$/.test(polizaId)) {
      return `/api/polizas-mantenimiento/${polizaId}/pdf/`;
    }
    const params = new URLSearchParams(searchParams);
    if (!params.get("tipo")) params.set("tipo", tipo);
    params.delete("format");
    params.delete("id");
    const qs = params.toString();
    return qs ? `/api/polizas-mantenimiento/pdf/?${qs}` : "/api/polizas-mantenimiento/pdf/?tipo=cctv";
  }, [searchParams, tipo, polizaId]);

  const xmlDownloadPath = useMemo(() => {
    if (/^\d+$/.test(polizaId)) {
      return `/api/polizas-mantenimiento/${polizaId}/xml/`;
    }
    const params = new URLSearchParams(searchParams);
    if (!params.get("tipo")) params.set("tipo", tipo);
    params.delete("format");
    params.delete("id");
    const qs = params.toString();
    return qs ? `/api/polizas-mantenimiento/xml/?${qs}` : "/api/polizas-mantenimiento/xml/?tipo=cctv";
  }, [searchParams, tipo, polizaId]);

  const lastObjectUrlRef = useRef<string | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [isHtmlFallback, setIsHtmlFallback] = useState(false);
  const [filename, setFilename] = useState("poliza.pdf");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [downloading, setDownloading] = useState<"pdf" | "xml" | null>(null);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "error", title: "", message: "" });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          setAlert((prev) => ({ ...prev, show: false }));
        }

        const resp = await fetchApi(pdfDownloadPath, {
          cache: "no-store" as RequestCache,
        });
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
          setHtmlPreview(null);
          return;
        }

        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        const dispo = resp.headers.get("content-disposition") || "";
        const isPdf = ct.includes("application/pdf");
        setIsHtmlFallback(!isPdf);
        setFilename(filenameFromDisposition(dispo, `Poliza_${folioLabel || "CCTV"}.${isPdf ? "pdf" : "html"}`));

        const blob = await resp.blob();
        if (!blob.size) {
          setAlert({
            show: true,
            variant: "error",
            title: "Error",
            message: "El servidor devolvió el documento vacío.",
          });
          setHtmlPreview(null);
          setPdfObjectUrl(null);
          return;
        }

        if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
        let nextUrl: string;
        if (isPdf) {
          setHtmlPreview(null);
          nextUrl = URL.createObjectURL(blob);
        } else {
          const html = await blob.text();
          if (!html.trim()) {
            setAlert({
              show: true,
              variant: "error",
              title: "Error",
              message: "El servidor devolvió la plantilla vacía.",
            });
            setHtmlPreview(null);
            setPdfObjectUrl(null);
            return;
          }
          setHtmlPreview(html);
          nextUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
        }
        lastObjectUrlRef.current = nextUrl;
        setPdfObjectUrl(nextUrl);
      } catch {
        if (isMounted) {
          setAlert({
            show: true,
            variant: "error",
            title: "Error",
            message: "No se pudo cargar el PDF de la póliza.",
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
  }, [pdfDownloadPath, folioLabel, reloadKey]);

  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    };
  }, []);

  const downloadDocument = async (kind: "pdf" | "xml") => {
    const path = kind === "pdf" ? pdfDownloadPath : xmlDownloadPath;
    const fallback =
      kind === "pdf"
        ? `Poliza_${folioLabel || "CCTV"}.pdf`
        : `Poliza_${folioLabel || "CCTV"}.xml`;
    try {
      setDownloading(kind);
      setAlert((prev) => ({ ...prev, show: false }));
      const resp = await fetchApi(path, { cache: "no-store" as RequestCache });
      if (!resp.ok) {
        let msg = `No se pudo descargar el ${kind.toUpperCase()} (HTTP ${resp.status}).`;
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
        return;
      }
      const blob = await resp.blob();
      const name = filenameFromDisposition(resp.headers.get("content-disposition") || "", fallback);
      triggerBlobDownload(blob, name);
    } catch {
      setAlert({
        show: true,
        variant: "error",
        title: "Error",
        message:
          kind === "pdf"
            ? "No se pudo descargar el PDF de la póliza."
            : "No se pudo descargar el XML de la póliza.",
      });
    } finally {
      setDownloading(null);
    }
  };

  const viewerTitle = folioLabel
    ? `Vista previa del PDF de la póliza ${folioLabel}`
    : "Vista previa del PDF de póliza CCTV";

  return (
    <div className={erpPageCanvasClass}>
      <div className={erpPageInnerClass}>
        <PageMeta
          title="PDF Póliza de mantenimiento | Operación"
          description="Vista previa de la plantilla CCTV de póliza de mantenimiento"
        />

        <nav
          className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]"
          aria-label="Migas de pan"
        >
          <Link
            to="/"
            className="rounded-md px-1 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            Inicio
          </Link>
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <Link
            to="/polizas-mantenimiento"
            className="rounded-md px-1 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            Póliza de mantenimiento
          </Link>
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <span className="text-[#44403c] dark:text-[#cbd5e1]">Vista PDF</span>
        </nav>

        {alert.show ? (
          <div role="alert" aria-live="assertive">
            <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
          </div>
        ) : null}

        <header
          className={`relative flex flex-col gap-4 ${cardShellClass} p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:p-6`}
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-[radial-gradient(circle_at_80%_20%,rgba(255,128,31,0.14),transparent_58%)]" />
          <div className="relative z-[1] flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black shadow-[0_10px_24px_-12px_rgba(255,128,31,0.9)] sm:h-11 sm:w-11">
              {fileIcon}
            </div>
            <div className="min-w-0 flex-1">
              <p className={sectionLabelOrangeClass}>Póliza de mantenimiento</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 sm:mt-1">
                <h1 className={erpHeroHeadingClass}>Vista PDF</h1>
                {folioLabel ? (
                  <span className="inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/[0.12] dark:text-amber-200">
                    {folioLabel}
                  </span>
                ) : null}
                <span className="inline-flex items-center rounded-full border border-[#e7ded0] bg-[#fcfaf6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]">
                  Plantilla CCTV
                </span>
              </div>
              <p className={`mt-1.5 max-w-2xl sm:mt-2 ${claudeBodyClass}`}>
                {clienteNombre
                  ? `Plantilla de videovigilancia CCTV con el folio y el cliente ${clienteNombre}. Conceptos y equipos de referencia; el encabezado sale de la póliza guardada.`
                  : "Revise la plantilla CCTV en el panel. Folio y cliente del listado se mezclan con el documento de referencia."}
              </p>
              <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
            </div>
          </div>
          <div className="relative z-[1] flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-center sm:justify-end sm:pt-1">
            <button
              type="button"
              onClick={() => navigate(returnPath)}
              className={erpSecondaryBtnClass}
              aria-label="Regresar al listado de pólizas"
            >
              {backIcon}
              <span className="hidden sm:inline">Volver al listado</span>
              <span className="sm:hidden">Volver</span>
            </button>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-8">
            <div className={`flex min-h-0 flex-col ${cardShellClass} lg:min-h-[calc(100vh-13.5rem)]`}>
              <div className="border-b border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 dark:border-[#273244] dark:bg-[#111a2b] sm:px-5 sm:py-3.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] dark:border-[#fb923c]/30 dark:bg-[#fb923c]/10 dark:text-[#fdba74]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </span>
                    <div>
                      <p className={sectionLabelOrangeClass}>Vista previa</p>
                      <p className="mt-0.5 text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                        {isHtmlFallback ? "Vista HTML (respaldo)" : "Documento PDF"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                    {isHtmlFallback
                      ? "El servidor no pudo generar el PDF. Se muestra HTML imprimible."
                      : "Vista previa del PDF. Descárguelo o ábralo en una pestaña nueva."}
                  </p>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col bg-[#fcfaf6] p-2 dark:bg-[#0f172a] sm:p-3">
                {loading ? (
                  <div
                    className="flex min-h-[min(100dvh,520px)] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/60 dark:border-[#273244] dark:bg-[#0f172a]/40 sm:min-h-[560px] lg:min-h-[calc(100vh-13.5rem)]"
                    role="status"
                    aria-busy="true"
                    aria-live="polite"
                    aria-label="Cargando PDF"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff801f]/10">
                      <span
                        className="h-7 w-7 animate-spin rounded-full border-2 border-[#e7ded0] border-t-[#ff801f] motion-reduce:animate-none dark:border-[#334155] dark:border-t-[#ffa057]"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-4 text-sm text-[#78716c] dark:text-[#8ea0b8]">Preparando PDF…</p>
                  </div>
                ) : pdfObjectUrl ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-[#e7ded0] bg-white dark:border-[#273244]">
                    {isHtmlFallback && htmlPreview ? (
                      <iframe
                        title={viewerTitle}
                        aria-label={viewerTitle}
                        srcDoc={htmlPreview}
                        className={`${viewerFrameClass} bg-white`}
                      />
                    ) : (
                      <iframe
                        title={viewerTitle}
                        aria-label={viewerTitle}
                        src={pdfObjectUrl}
                        className={`${viewerFrameClass} bg-white`}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[min(100dvh,400px)] flex-col items-center justify-center rounded-xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/60 px-6 py-12 text-center dark:border-[#273244] dark:bg-[#0f172a]/40 lg:min-h-[calc(100vh-13.5rem)]">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff801f]/10 text-[#ea580c] dark:text-[#fb923c]">
                      {emptyDocIcon}
                    </div>
                    <p className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                      No hay documento disponible
                    </p>
                    <p className="mt-1.5 max-w-sm text-sm text-[#78716c] dark:text-[#8ea0b8]">
                      No se pudo generar la vista previa. Vuelva al listado o reintente.
                    </p>
                    <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                      <button
                        type="button"
                        className={erpPrimaryBtnClass}
                        onClick={() => setReloadKey((k) => k + 1)}
                      >
                        {retryIcon}
                        Reintentar
                      </button>
                      <Link
                        to="/polizas-mantenimiento"
                        className="text-sm font-medium text-[#ea580c] underline-offset-4 hover:underline dark:text-[#fb923c]"
                      >
                        Ir a pólizas
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="min-w-0 space-y-6 lg:col-span-4 lg:sticky lg:top-6 lg:self-start xl:top-8">
            <div className={cardShellClass}>
              <div className="border-b border-[#e7ded0] px-4 py-4 dark:border-[#273244] sm:px-5">
                <p className={sectionLabelOrangeClass}>Documento</p>
                <h2 className={`mt-1 ${erpSubheadingClass}`}>Archivo y acciones</h2>
                <p className="mt-1 text-xs text-[#78716c] dark:text-[#8ea0b8] sm:text-sm">
                  Plantilla CCTV con folio, cliente, cotización y visitas de la póliza.
                </p>
              </div>
              <div className="space-y-4 px-4 py-5 sm:px-5">
                <ul className="flex flex-wrap gap-1.5" aria-label="Secciones de la plantilla">
                  {CONTENT_CHIPS.map((chip) => (
                    <li
                      key={chip.id}
                      className="inline-flex items-center rounded-full border border-[#e7ded0] bg-[#fcfaf6] px-2.5 py-1 text-[11px] font-medium text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]"
                    >
                      {chip.label}
                    </li>
                  ))}
                </ul>

                <div className={`${erpCardShellMutedClass} px-3 py-2.5`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#78716c] dark:text-[#8ea0b8]">
                    Nombre de archivo
                  </p>
                  <code className="mt-1 block break-all rounded-md border border-[#e7ded0] bg-[#fffdfa] px-2.5 py-1.5 text-xs font-medium text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]">
                    {filename}
                  </code>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <a
                    href={pdfObjectUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    tabIndex={pdfObjectUrl ? undefined : -1}
                    className={`${outlineCoralBtnClass} ${!pdfObjectUrl ? "pointer-events-none opacity-50" : ""}`}
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
                    disabled={!pdfObjectUrl || downloading !== null}
                    className={`${erpPrimaryBtnClass} !min-h-[48px] sm:!min-h-0`}
                    aria-label={`Descargar PDF de la póliza${folioLabel ? ` ${folioLabel}` : ""}`}
                    aria-busy={downloading === "pdf"}
                    onClick={() => void downloadDocument("pdf")}
                  >
                    {downloadIcon}
                    {downloading === "pdf" ? "Descargando PDF…" : "Descargar PDF"}
                  </button>

                  <button
                    type="button"
                    disabled={!pdfObjectUrl || downloading !== null}
                    className={`${erpSecondaryBtnClass} !min-h-[48px] sm:!min-h-0`}
                    aria-label={`Descargar XML de la póliza${folioLabel ? ` ${folioLabel}` : ""}`}
                    aria-busy={downloading === "xml"}
                    onClick={() => void downloadDocument("xml")}
                  >
                    {downloadIcon}
                    {downloading === "xml" ? "Descargando XML…" : "Descargar XML"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
