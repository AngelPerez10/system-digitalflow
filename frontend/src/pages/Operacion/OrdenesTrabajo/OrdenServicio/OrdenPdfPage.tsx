import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { apiUrl } from "@/config/api";

const cardShellClass =
  "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:shadow-none";

const sectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]";

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
  "min-h-[min(100dvh,520px)] w-full flex-1 border-0 sm:min-h-[560px] lg:min-h-[calc(100vh-13.5rem)] lg:max-h-[calc(100vh-13.5rem)]";

export default function OrdenPdfPage() {
  const params = useParams();
  const ordenId = params.id;
  const navigate = useNavigate();

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("orden.pdf");
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(8);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "error", title: "", message: "" });

  /** Folio visible (idx), no el id interno de la URL */
  const [ordenIdx, setOrdenIdx] = useState<number | null>(null);

  const getToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };

  useEffect(() => {
    let cancelled = false;
    const id = ordenId;
    const token = getToken();
    if (!id || !token) {
      setOrdenIdx(null);
      return;
    }

    fetch(apiUrl(`/api/ordenes/${id}/`), {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store" as RequestCache,
    })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = (await res.json().catch(() => null)) as { idx?: number | null } | null;
        if (cancelled || !data) return;
        if (data.idx != null && Number.isFinite(Number(data.idx))) {
          setOrdenIdx(Number(data.idx));
        } else {
          setOrdenIdx(null);
        }
      })
      .catch(() => {
        if (!cancelled) setOrdenIdx(null);
      });

    return () => {
      cancelled = true;
    };
  }, [ordenId]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const token = getToken();
      if (!token) {
        if (isMounted) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Sin sesión",
            message: "Inicia sesión para ver el PDF de la orden.",
          });
          setLoading(false);
        }
        return;
      }

      if (!ordenId) {
        if (isMounted) {
          setAlert({ show: true, variant: "error", title: "Error", message: "No se encontró el ID de la orden." });
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);

        const resp = await fetch(apiUrl(`/api/ordenes/${ordenId}/pdf/`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
  }, [ordenId]);

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(8);

    const interval = window.setInterval(() => {
      setLoadingProgress((p) => {
        const next = p + (p < 55 ? 10 : p < 80 ? 6 : 3);
        return Math.min(95, next);
      });
    }, 650);

    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  const pct = Math.min(99, Math.max(0, Math.round(loadingProgress)));

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl space-y-5 px-3 pb-8 pt-5 text-sm sm:space-y-8 sm:px-5 sm:pb-12 sm:pt-8 sm:text-base md:px-6 lg:px-8">
        <PageMeta title="PDF Orden de servicio | Digitalflow" description="Vista previa y descarga del PDF de la orden" />

        <Modal isOpen={loading} onClose={() => {}} showCloseButton={false} className="mx-4 max-w-md sm:mx-auto">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200/80 bg-gray-50/90 dark:border-white/[0.08] dark:bg-gray-900/60"
                aria-hidden
              >
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600 dark:border-gray-700 dark:border-t-brand-400" />
              </div>
              <p className={sectionLabelClass}>Documento</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">Generando PDF</h2>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Puede incluir fotos y firmas. No cierre esta ventana.
              </p>

              <div className="mt-6 w-full max-w-[280px]">
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Progreso</span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-gray-200/70 bg-gray-100 dark:border-white/[0.08] dark:bg-gray-800">
                  <div
                    className="h-full bg-brand-600 transition-[width] duration-500 ease-out dark:bg-brand-500"
                    style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
                  />
                </div>
                <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-500">Preparando archivo…</p>
              </div>
            </div>
          </div>
        </Modal>

        <nav
          className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-gray-500 sm:text-[13px]"
          aria-label="Migas de pan"
        >
          <Link
            to="/"
            className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200"
          >
            Inicio
          </Link>
          <span className="text-gray-300 dark:text-gray-600" aria-hidden>
            /
          </span>
          <Link
            to="/ordenes"
            className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200"
          >
            Órdenes de servicio
          </Link>
          <span className="text-gray-300 dark:text-gray-600" aria-hidden>
            /
          </span>
          <span className="font-medium text-gray-700 dark:text-gray-300">Vista PDF</span>
        </nav>

        {alert.show && <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />}

        <header className={`flex flex-col gap-4 ${cardShellClass} p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:p-6`}>
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300 sm:h-12 sm:w-12 sm:rounded-xl">
              <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 sm:text-[11px]">
                Orden de servicio
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 sm:mt-1">
                <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl md:text-2xl">Vista PDF</h1>
                {ordenIdx != null && (
                  <span className="inline-flex items-center rounded-md border border-gray-200/80 bg-gray-50/90 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-gray-700 dark:border-white/[0.08] dark:bg-gray-950/50 dark:text-gray-300">
                    #{ordenIdx}
                  </span>
                )}
              </div>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
                Revise el PDF en el panel principal; el lateral permite abrir en otra pestaña o descargar. El documento puede incluir fotos y firmas.
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-center sm:justify-end sm:pt-1">
            <button
              type="button"
              onClick={() => navigate("/ordenes")}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-gray-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99] dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-100 dark:hover:bg-white/[0.04] sm:w-auto sm:min-h-0"
              aria-label="Regresar al listado de órdenes"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <div className="border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5 sm:py-3.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className={sectionLabelClass}>Vista previa</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">Orden de servicio</p>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-500">El visor usa el motor PDF del navegador.</p>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-gray-100/50 p-2 sm:p-3 dark:bg-gray-950/40">
                {loading ? (
                  <div
                    className="flex min-h-[min(100dvh,520px)] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200/90 bg-gray-50/40 dark:border-white/[0.06] dark:bg-gray-950/25 sm:min-h-[560px] lg:min-h-[calc(100vh-13.5rem)]"
                    aria-busy="true"
                    aria-label="Cargando documento"
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-500">Preparando vista previa…</p>
                  </div>
                ) : pdfObjectUrl ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[inset_0_1px_0_0_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-gray-900/30 dark:shadow-none">
                    <iframe title="Vista previa del PDF de la orden" src={pdfObjectUrl} className={viewerFrameClass} />
                  </div>
                ) : (
                  <div className="flex min-h-[min(100dvh,400px)] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200/90 bg-gray-50/30 px-6 py-12 text-center dark:border-white/[0.08] dark:bg-gray-950/20 lg:min-h-[calc(100vh-13.5rem)]">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M10 13h4" />
                        <path d="M10 17h7" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">No hay documento disponible</p>
                    <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                      No se pudo generar la vista previa. Compruebe la orden o vuelva al listado.
                    </p>
                    <Link
                      to="/ordenes"
                      className="mt-6 text-sm font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
                    >
                      Ir a órdenes de servicio
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-4 lg:sticky lg:top-6 lg:self-start xl:top-8">
            <div className={cardShellClass}>
              <div className="border-b border-gray-100 px-4 py-4 dark:border-white/[0.06] sm:px-5">
                <p className={sectionLabelClass}>Documento</p>
                <h2 className="mt-1 text-base font-semibold tracking-tight text-gray-900 dark:text-white">Archivo y acciones</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Nombre sugerido al descargar y accesos rápidos.</p>
              </div>
              <div className="space-y-4 px-4 py-5 sm:px-5">
                <div className="rounded-xl border border-gray-200/80 bg-gray-50/60 px-3 py-2.5 dark:border-white/[0.06] dark:bg-gray-950/35">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500">Nombre de archivo</p>
                  <code className="mt-1 block break-all rounded-md border border-gray-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 dark:border-white/[0.08] dark:bg-gray-900/60 dark:text-gray-200">
                    {filename}
                  </code>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <a
                    href={pdfObjectUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-brand-200/90 bg-white px-4 py-3 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-50/80 focus:outline-none focus:ring-2 focus:ring-brand-500/25 active:scale-[0.99] dark:border-brand-500/30 dark:bg-transparent dark:text-brand-200 dark:hover:bg-brand-500/[0.08] sm:min-h-0 ${!pdfObjectUrl ? "pointer-events-none opacity-50" : ""}`}
                    aria-disabled={!pdfObjectUrl}
                    onClick={(e) => {
                      if (!pdfObjectUrl) e.preventDefault();
                    }}
                  >
                    {externalLinkIcon}
                    <span className="hidden sm:inline">Abrir en nueva pestaña</span>
                    <span className="sm:hidden">Abrir</span>
                  </a>

                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={!pdfObjectUrl}
                    startIcon={downloadIcon}
                    className="!min-h-[48px] sm:!min-h-0"
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
                    Descargar PDF
                  </Button>
                </div>

                <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
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
