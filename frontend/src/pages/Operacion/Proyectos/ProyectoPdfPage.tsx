import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
import { displayProyectoFolio } from "./shared/proyectoFormUtils";

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

const chipIconClass = "h-3.5 w-3.5 shrink-0";

const CONTENT_CHIPS = [
  {
    id: "bitacora",
    label: "Bitácora",
    icon: (
      <svg className={chipIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "equipo",
    label: "Equipo",
    icon: (
      <svg className={chipIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "firmas",
    label: "Firmas",
    icon: (
      <svg className={chipIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 20h9" strokeLinecap="round" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "evidencias",
    label: "Evidencias",
    icon: (
      <svg className={chipIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
] as const;

const STATUS_LABEL: Record<string, string> = {
  en_proceso: "En proceso",
  pausado: "Pausado",
  cerrado: "Cerrado",
};

/**
 * Vista previa / descarga del PDF de un proyecto.
 */
export default function ProyectoPdfPage() {
  const params = useParams();
  const proyectoId = params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = (location.state as { from?: string } | null)?.from || "/proyectos";

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("proyecto.pdf");
  const [isHtmlFallback, setIsHtmlFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [folioLabel, setFolioLabel] = useState<string | null>(null);
  const [clienteNombre, setClienteNombre] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
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
      if (!proyectoId) {
        if (isMounted) {
          setAlert({
            show: true,
            variant: "error",
            title: "Error",
            message: "No se encontró el ID del proyecto.",
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

        const metaRes = await fetchApi(`/api/proyectos/${proyectoId}/`, {
          cache: "no-store" as RequestCache,
        });
        if (isMounted && metaRes.ok) {
          const meta = (await metaRes.json().catch(() => null)) as {
            folio?: string | null;
            idx?: number | null;
            cliente_nombre?: string | null;
            status?: string | null;
          } | null;
          if (meta) {
            setFolioLabel(displayProyectoFolio(meta.folio || meta.idx));
            const cliente = String(meta.cliente_nombre || "").trim();
            setClienteNombre(cliente || null);
            const status = String(meta.status || "").trim().toLowerCase();
            setStatusLabel(STATUS_LABEL[status] || (status ? status.replace(/_/g, " ") : null));
          }
        }

        const resp = await fetchApi(`/api/proyectos/${proyectoId}/pdf/`);
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
              ? `Proyecto_${proyectoId}.pdf`
              : `Proyecto_${proyectoId}.html`
        );

        const blob = await resp.blob();
        setPdfObjectUrl(URL.createObjectURL(blob));
      } catch {
        if (isMounted) {
          setAlert({
            show: true,
            variant: "error",
            title: "Error",
            message: "No se pudo cargar el PDF del proyecto.",
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
  }, [proyectoId, reloadKey]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  const viewerTitle = folioLabel
    ? `Vista previa del documento del proyecto ${folioLabel}`
    : "Vista previa del documento del proyecto";

  return (
    <div className={erpPageCanvasClass}>
      <div className={erpPageInnerClass}>
        <PageMeta
          title="PDF Proyecto | Digitalflow"
          description="Vista previa y descarga del PDF del proyecto"
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
            to="/proyectos"
            className="rounded-md px-1 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            Proyectos
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
              <p className={sectionLabelOrangeClass}>Proyecto</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 sm:mt-1">
                <h1 className={erpHeroHeadingClass}>Vista PDF</h1>
                {folioLabel ? (
                  <span className="inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/[0.12] dark:text-amber-200">
                    {folioLabel}
                  </span>
                ) : null}
                {statusLabel ? (
                  <span className="inline-flex items-center rounded-full border border-[#e7ded0] bg-[#fcfaf6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]">
                    {statusLabel}
                  </span>
                ) : null}
              </div>
              <p className={`mt-1.5 max-w-2xl sm:mt-2 ${claudeBodyClass}`}>
                {clienteNombre
                  ? `Documento operativo de ${clienteNombre}: bitácora por jornada, equipo de campo, firmas y evidencias.`
                  : "Revise el documento en el panel; el lateral abre otra pestaña o descarga el archivo."}
              </p>
              <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
            </div>
          </div>
          <div className="relative z-[1] flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-center sm:justify-end sm:pt-1">
            <button
              type="button"
              onClick={() => navigate(returnPath)}
              className={erpSecondaryBtnClass}
              aria-label="Regresar al listado de proyectos"
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
                        {isHtmlFallback ? "Documento HTML" : "Proyecto"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                    {isHtmlFallback ? "Respaldo HTML: el motor PDF no está disponible." : "El visor usa el motor PDF del navegador."}
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
                    aria-label="Cargando documento"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff801f]/10">
                      <span
                        className="h-7 w-7 animate-spin rounded-full border-2 border-[#e7ded0] border-t-[#ff801f] motion-reduce:animate-none dark:border-[#334155] dark:border-t-[#ffa057]"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-4 text-sm text-[#78716c] dark:text-[#8ea0b8]">Preparando vista previa…</p>
                  </div>
                ) : pdfObjectUrl ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#273244] dark:bg-[#0f172a]">
                    <iframe
                      title={viewerTitle}
                      aria-label={viewerTitle}
                      src={pdfObjectUrl}
                      loading="lazy"
                      className={viewerFrameClass}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[min(100dvh,400px)] flex-col items-center justify-center rounded-xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/60 px-6 py-12 text-center dark:border-[#273244] dark:bg-[#0f172a]/40 lg:min-h-[calc(100vh-13.5rem)]">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff801f]/10 text-[#ea580c] dark:text-[#fb923c]">
                      {emptyDocIcon}
                    </div>
                    <p className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">No hay documento disponible</p>
                    <p className="mt-1.5 max-w-sm text-sm text-[#78716c] dark:text-[#8ea0b8]">
                      No se pudo generar la vista previa. Compruebe el proyecto o vuelva al listado.
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
                        to="/proyectos"
                        className="text-sm font-medium text-[#ea580c] underline-offset-4 hover:underline dark:text-[#fb923c]"
                      >
                        Ir a proyectos
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
                  Nombre sugerido al descargar y accesos rápidos.
                </p>
              </div>
              <div className="space-y-4 px-4 py-5 sm:px-5">
                <ul className="flex flex-wrap gap-1.5" aria-label="Secciones del documento">
                  {CONTENT_CHIPS.map((chip) => (
                    <li
                      key={chip.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#e7ded0] bg-[#fcfaf6] px-2.5 py-1 text-[11px] font-medium text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]"
                    >
                      <span className="text-[#ea580c] dark:text-[#fb923c]">{chip.icon}</span>
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
                    {isHtmlFallback ? "Descargar HTML" : "Descargar PDF"}
                  </button>
                </div>

                <p className="text-[11px] leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
                  Si la vista previa se ve cortada o es pesada (fotos), abra el archivo en una pestaña nueva o descárguelo.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
