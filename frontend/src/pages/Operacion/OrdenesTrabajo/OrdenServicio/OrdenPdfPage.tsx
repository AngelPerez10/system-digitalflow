import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { OrdenPdfLoadingModal } from "./OrdenPdfLoadingModal";
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
import { claudeBodyClass, outlineCoralBtnClass, sectionLabelOrangeClass } from "../ordenTrabajoStyles";
import { downloadOrdenPdfById, isOrdenPdfDirectDownload } from "./useOrdenesShared";

const externalLinkIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const downloadIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const viewerFrameClass =
  "h-[72vh] min-h-[480px] w-full flex-1 border-0 sm:h-[76vh] sm:min-h-[560px] lg:h-[calc(100vh-13.5rem)] lg:min-h-[calc(100vh-13.5rem)]";

export default function OrdenPdfPage() {
  const params = useParams();
  const ordenId = params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = (location.state as { from?: string } | null)?.from || "/ordenes";

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("orden.pdf");
  const [loading, setLoading] = useState(true);
  const [directDownload, setDirectDownload] = useState(false);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "error", title: "", message: "" });

  const [ordenIdx, setOrdenIdx] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!ordenId) {
        if (isMounted) {
          setAlert({ show: true, variant: "error", title: "Error", message: "No se encontró el ID de la orden." });
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);

        const metaRes = await fetchApi(`/api/ordenes/${ordenId}/`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store" as RequestCache,
        });
        if (!isMounted) return;

        if (metaRes.ok) {
          const meta = (await metaRes.json().catch(() => null)) as { idx?: number | null; status?: string } | null;
          if (meta?.idx != null && Number.isFinite(Number(meta.idx))) {
            setOrdenIdx(Number(meta.idx));
          } else {
            setOrdenIdx(null);
          }

          if (isOrdenPdfDirectDownload(meta?.status)) {
            if (isMounted) setDirectDownload(true);
            const dl = await downloadOrdenPdfById(Number(ordenId));
            if (!isMounted) return;
            if (dl.ok) {
              navigate(returnPath, { replace: true });
              return;
            }
            setAlert({
              show: true,
              variant: "error",
              title: "Error",
              message: dl.message || "No se pudo descargar el PDF.",
            });
            setPdfObjectUrl(null);
            return;
          }
        }

        const resp = await fetchApi(`/api/ordenes/${ordenId}/pdf/`);

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
            /* ignore */
          }

          setAlert({ show: true, variant: "error", title: "Error", message: msg });
          setPdfObjectUrl(null);
          return;
        }

        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        const dispo = resp.headers.get("content-disposition") || "";
        const m = dispo.match(/filename="?([^";]+)"?/i);
        const isPdf = ct.includes("application/pdf");
        const nextFilename = m?.[1]
          ? String(m[1])
          : isPdf
            ? `Orden_Servicio_${ordenId}.pdf`
            : `Orden_Servicio_${ordenId}.html`;
        setFilename(nextFilename);

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setPdfObjectUrl(url);
      } catch {
        if (isMounted) {
          setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo cargar la información." });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [ordenId, navigate, returnPath]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  return (
    <div className={erpPageCanvasClass}>
      <div className={erpPageInnerClass}>
        <PageMeta title="PDF Orden de servicio | Digitalflow" description="Vista previa y descarga del PDF de la orden" />

        <OrdenPdfLoadingModal open={loading} downloading={directDownload} />

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
            to="/ordenes"
            className="rounded-md px-1 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            Órdenes de servicio
          </Link>
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <span className="text-[#44403c] dark:text-[#cbd5e1]">Vista PDF</span>
        </nav>

        {alert.show && (
          <div role="alert" aria-live="assertive">
            <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
          </div>
        )}

        <header className={`relative flex flex-col gap-4 ${cardShellClass} p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:p-6`}>
          <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6" />
          <div className="relative z-[1] flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
              <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={sectionLabelOrangeClass}>Orden de servicio</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 sm:mt-1">
                <h1 className={erpHeroHeadingClass}>Vista PDF</h1>
                {ordenIdx != null && (
                  <span className="inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/[0.12] dark:text-amber-200">
                    #{ordenIdx}
                  </span>
                )}
              </div>
              <p className={`mt-1.5 max-w-2xl sm:mt-2 ${claudeBodyClass}`}>
                Revise el PDF en el panel principal; el lateral permite abrir en otra pestaña o descargar. El documento puede incluir fotos y firmas.
              </p>
              <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-center sm:justify-end sm:pt-1">
            <button type="button" onClick={() => navigate("/ordenes")} className={erpSecondaryBtnClass} aria-label="Regresar al listado de órdenes">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 19 3 12l7-7" />
                <path d="M3 12h18" />
              </svg>
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
                  <div>
                    <p className={sectionLabelOrangeClass}>Vista previa</p>
                    <p className="mt-0.5 text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">Orden de servicio</p>
                  </div>
                  <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">El visor usa el motor PDF del navegador.</p>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-[#fcfaf6] p-2 dark:bg-[#0f172a] sm:p-3">
                {loading ? (
                  <div
                    className="flex min-h-[min(100dvh,520px)] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/60 dark:border-[#273244] dark:bg-[#0f172a]/40 sm:min-h-[560px] lg:min-h-[calc(100vh-13.5rem)]"
                    aria-busy="true"
                    aria-live="polite"
                    aria-label="Cargando documento"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff801f]/10">
                      <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#e7ded0] border-t-[#ff801f] dark:border-[#334155] dark:border-t-[#ffa057]" aria-hidden />
                    </div>
                    <p className="mt-4 text-sm text-[#78716c] dark:text-[#8ea0b8]">Preparando vista previa…</p>
                  </div>
                ) : pdfObjectUrl ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#273244] dark:bg-[#0f172a]">
                    <iframe
                      title="Vista previa del PDF de la orden"
                      aria-label={`Vista previa del PDF de la orden${ordenIdx != null ? ` ${ordenIdx}` : ""}`}
                      src={pdfObjectUrl}
                      loading="lazy"
                      className={viewerFrameClass}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[min(100dvh,400px)] flex-col items-center justify-center rounded-xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/60 px-6 py-12 text-center dark:border-[#273244] dark:bg-[#0f172a]/40 lg:min-h-[calc(100vh-13.5rem)]">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff801f]/10 text-[#ea580c] dark:text-[#fb923c]">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M10 13h4" />
                        <path d="M10 17h7" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">No hay documento disponible</p>
                    <p className="mt-1.5 max-w-sm text-sm text-[#78716c] dark:text-[#8ea0b8]">
                      No se pudo generar la vista previa. Compruebe la orden o vuelva al listado.
                    </p>
                    <Link to="/ordenes" className="mt-6 text-sm font-medium text-[#ea580c] underline-offset-4 hover:underline dark:text-[#fb923c]">
                      Ir a órdenes de servicio
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-4 lg:sticky lg:top-6 lg:self-start xl:top-8">
            <div className={cardShellClass}>
              <div className="border-b border-[#e7ded0] px-4 py-4 dark:border-[#273244] sm:px-5">
                <p className={sectionLabelOrangeClass}>Documento</p>
                <h2 className={`mt-1 ${erpSubheadingClass}`}>Archivo y acciones</h2>
                <p className="mt-1 text-xs text-[#78716c] dark:text-[#8ea0b8] sm:text-sm">Nombre sugerido al descargar y accesos rápidos.</p>
              </div>
              <div className="space-y-4 px-4 py-5 sm:px-5">
                <div className={`${erpCardShellMutedClass} px-3 py-2.5`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#78716c] dark:text-[#8ea0b8]">Nombre de archivo</p>
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
                    disabled={!pdfObjectUrl}
                    className={`${erpPrimaryBtnClass} !min-h-[48px] sm:!min-h-0`}
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
                    Descargar PDF
                  </button>
                </div>

                <p className="text-[11px] leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
                  Si la vista previa se ve cortada o es pesada (fotos), abra el archivo en una pestaña nueva o descárguelo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
