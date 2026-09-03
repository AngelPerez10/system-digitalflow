import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { fetchApi, hasAuthSessionFlag } from "@/config/api";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import { cotizacionListPath, listSearchFromLocationState } from "@/pages/Ventas/Cotizacion/shared/cotizacionListNav";
import {
  cardShellClass,
  cardShellMutedClass as erpCardShellMutedClass,
  cotPageCanvasClass as erpPageCanvasClass,
  cotPageInnerClass as erpPageInnerClass,
  cotSansStyle,
  cotSubheadingClass as erpSubheadingClass,
  heroBandClass,
  heroBlurClass,
  heroEyebrowClass,
  heroIconWrapClass,
  primaryActionBtnClass as erpPrimaryBtnClass,
  secondaryActionBtnClass as erpSecondaryBtnClass,
} from "./shared/cotizacionFormStyles";


const sectionLabelOrangeClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-[11px]";

const outlineCoralBtnClass =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-[#BBD0FF] bg-white px-4 py-3 text-xs font-semibold text-[#1B5CFF] transition-colors hover:bg-[#EAF1FF] focus:outline-none focus:ring-2 focus:ring-[#1B5CFF]/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#4B7CFF]/40 dark:bg-transparent dark:text-[#4B7CFF] dark:hover:bg-[#4B7CFF]/10 sm:min-h-0";

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

const retryIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const htmlIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 13h6M9 17h4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Altura del visor: una sola vista útil (viewport menos cabecera del layout + migas + header de página). */
const viewerFrameClass =
  "h-[72vh] min-h-[480px] w-full flex-1 border-0 sm:h-[76vh] sm:min-h-[560px] lg:h-[calc(100vh-13.5rem)] lg:min-h-[calc(100vh-13.5rem)]";

type AlertState = {
  show: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

const looksLikePlaywrightOrChromiumFailure = (text: string) => {
  const lower = text.toLowerCase();
  return (
    lower.includes("playwright") ||
    lower.includes("chromium") ||
    lower.includes("sync_playwright") ||
    lower.includes("browser") ||
    lower.includes("executable doesn't exist") ||
    lower.includes("browserType") ||
    lower.includes("target closed") ||
    (lower.includes("timeout") && (lower.includes("page") || lower.includes("navigation")))
  );
};

/** Respuestas del backend cuando no hay motor instalado/configurado (no un fallo al renderizar). */
const looksLikeNoPdfEngineConfigured = (text: string) => {
  const lower = text.toLowerCase();
  return (
    lower.includes("ningún proveedor") ||
    lower.includes("ningun proveedor") ||
    lower.includes("no hay motor") ||
    lower.includes("no hay proveedor") ||
    lower.includes("instale playwright") ||
    lower.includes("install playwright") ||
    (lower.includes("no module named") && lower.includes("playwright"))
  );
};

const friendlyPdfErrorMessage = (raw: unknown, status?: number): { title: string; message: string } => {
  const text = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  const lower = text.toLowerCase();

  if (status === 401 || status === 403) {
    return {
      title: status === 403 ? "Acceso denegado" : "Sesión no válida",
      message:
        "El servidor no recibió un token válido (401/403). Cierra sesión y vuelve a entrar, o revisa que el front use la misma URL de API configurada (VITE_API_BASE) que el backend.",
    };
  }
  if (
    lower.includes("credenciales") ||
    lower.includes("no se proveyeron") ||
    lower.includes("not authenticated") ||
    lower.includes("token is invalid") ||
    lower.includes("token has expired")
  ) {
    return {
      title: "Sesión o token",
      message:
        "La petición no está autenticada o el token expiró. Vuelve a iniciar sesión. Si abriste la URL del API a mano, usa la pantalla «Vista PDF» dentro de la aplicación.",
    };
  }

  if (!text) {
    if (status === 502 || status === 504) {
      return {
        title: "El servidor no terminó el PDF",
        message:
          "Error 502/504: el proceso de generación falló o excedió el tiempo. Revisa logs del backend (Playwright, htmldocs, timeout de Gunicorn).",
      };
    }
    return {
      title: "No se pudo cargar el PDF",
      message: "El servicio de generación de PDF no respondió. Inténtalo de nuevo en unos segundos.",
    };
  }

  if (looksLikeNoPdfEngineConfigured(text)) {
    return {
      title: "Motor de PDF no disponible",
      message:
        "El servidor no tiene un motor de PDF usable (Playwright/Chromium o API htmldocs). Reintenta o descarga el HTML. Si administras el sistema: en el build del backend ejecuta «playwright install chromium» (y dependencias de sistema si aplica), o define HTMLDOCS_API_KEY.",
    };
  }
  if (lower.includes("html enviado") || lower.includes("error en html")) {
    return {
      title: "Error en el contenido del PDF",
      message:
        "El HTML de la cotización no pudo convertirse bien a PDF. Revisa imágenes o contenido inválido y contacta al equipo técnico si persiste.",
    };
  }
  if (looksLikePlaywrightOrChromiumFailure(text)) {
    return {
      title: "Error al generar el PDF",
      message:
        "Playwright/Chromium falló al renderizar (memoria, librerías del sistema o tiempo de espera). Reintenta; si persiste, revisa logs del servidor en Render, aumenta el timeout de Gunicorn y comprueba que Chromium tenga dependencias en el host. Puedes usar «Descargar HTML» como respaldo.",
    };
  }
  if (status === 502 || status === 504) {
    return {
      title: "El servidor no terminó el PDF",
      message:
        text.length > 30
          ? text.length > 280
            ? text.slice(0, 280) + "…"
            : text
          : "Error 502/504: el proceso de generación falló o excedió el tiempo. Revisa logs del backend (Playwright, htmldocs, timeout de Gunicorn).",
    };
  }
  if (lower.includes("sin sesión") || lower.includes("sin sesion")) {
    return {
      title: "Sin sesión",
      message: "Inicia sesión para ver el PDF de la cotización.",
    };
  }
  return {
    title: "No se pudo cargar el PDF",
    message: text.length > 220 ? text.slice(0, 220) + "…" : text,
  };
};

export default function CotizacionPdfPage() {
  const params = useParams();
  const cotizacionId = params.id;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPreviewMode = String(cotizacionId || "").toUpperCase() === "PREVIEW" || searchParams.get("preview") === "1";

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("cotizacion.pdf");
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(8);
  const [hasError, setHasError] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "error", title: "", message: "" });
  const [reloadKey, setReloadKey] = useState(0);

  /** Folio visible (idx → COT-n), no el id interno de la URL */
  const [cotizacionIdx, setCotizacionIdx] = useState<number | string | null>(null);
  const cotizacionFolio =
    cotizacionIdx === "PREVIEW"
      ? "PREVIEW"
      : cotizacionIdx != null
        ? formatDocumentFolio(FOLIO_SERIE.cotizacion, cotizacionIdx)
        : null;

  /** Mantenemos el último objectURL para revocarlo cuando se reemplace. */
  const lastObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPreviewMode) {
      setCotizacionIdx("PREVIEW");
      return;
    }
    let cancelled = false;
    const id = cotizacionId;
    if (!id || !hasAuthSessionFlag()) {
      setCotizacionIdx(null);
      return;
    }

    fetchApi(`/api/cotizaciones/${id}/`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store" as RequestCache,
    })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = (await res.json().catch(() => null)) as { idx?: number | null } | null;
        if (cancelled || !data) return;
        if (data.idx != null && Number.isFinite(Number(data.idx))) {
          setCotizacionIdx(Number(data.idx));
        } else {
          setCotizacionIdx(null);
        }
      })
      .catch(() => {
        if (!cancelled) setCotizacionIdx(null);
      });

    return () => {
      cancelled = true;
    };
  }, [cotizacionId, isPreviewMode]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!hasAuthSessionFlag()) {
        if (isMounted) {
          setHasError(true);
          setAlert({
            show: true,
            variant: "warning",
            title: "Sin sesión",
            message: "Inicia sesión para ver el PDF de la cotización.",
          });
          setLoading(false);
        }
        return;
      }

      if (!cotizacionId) {
        if (isMounted) {
          setHasError(true);
          setAlert({ show: true, variant: "error", title: "Error", message: "No se encontró el ID de la cotización." });
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setHasError(false);
          setAlert((p) => ({ ...p, show: false }));
        }

        let resp: Response;
        if (isPreviewMode) {
          const rawPayload = sessionStorage.getItem("cotizacion:pdf-preview-payload");
          if (!rawPayload) {
            if (isMounted) {
              setHasError(true);
              setAlert({
                show: true,
                variant: "warning",
                title: "Sin datos",
                message: "No se encontró el contenido de la vista previa.",
              });
              setPdfObjectUrl(null);
              setLoading(false);
            }
            return;
          }
          resp = await fetchApi("/api/cotizaciones/pdf-preview/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: rawPayload,
          });
        } else {
          resp = await fetchApi(`/api/cotizaciones/${cotizacionId}/pdf/`);
        }

        if (!isMounted) return;

        if (!resp.ok) {
          let detail = "";
          let backendError = "";
          try {
            const ct = resp.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const data = (await resp.json()) as { detail?: string; error?: string };
              detail = data?.detail || "";
              backendError = typeof data?.error === "string" ? data.error : "";
            } else {
              detail = (await resp.text()) || "";
            }
          } catch {
            /* ignore */
          }

          const combined = [detail, backendError].filter(Boolean).join(" — ");
          const friendly = friendlyPdfErrorMessage(combined || `HTTP ${resp.status}`, resp.status);
          setHasError(true);
          setAlert({
            show: true,
            variant: resp.status >= 500 ? "error" : "warning",
            title: friendly.title,
            message: friendly.message,
          });
          setPdfObjectUrl(null);
          return;
        }

        const ct = (resp.headers.get("content-type") || "").toLowerCase();

        const dispo = resp.headers.get("content-disposition") || "";
        const m = dispo.match(/filename="?([^";]+)"?/i);

        const isPdf = ct.includes("application/pdf");
        const baseName = isPreviewMode ? "Cotizacion_PREVIEW" : `Cotizacion_${cotizacionId}`;
        const nextFilename = m?.[1] ? String(m[1]) : isPdf ? `${baseName}.pdf` : `${baseName}.html`;
        setFilename(nextFilename);

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = url;
        setPdfObjectUrl(url);
      } catch {
        if (isMounted) {
          setHasError(true);
          setAlert({
            show: true,
            variant: "error",
            title: "Error de red",
            message: "No se pudo contactar al servidor. Revisa tu conexión y reintenta.",
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
  }, [cotizacionId, isPreviewMode, reloadKey]);

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
      if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    };
  }, []);

  const handleRetry = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const handleDownloadHtmlFallback = useCallback(async () => {
    if (isPreviewMode) {
      setAlert({
        show: true,
        variant: "info",
        title: "Vista previa",
        message: "La descarga HTML de respaldo solo está disponible para cotizaciones guardadas.",
      });
      return;
    }
    if (!hasAuthSessionFlag() || !cotizacionId) return;

    try {
      const resp = await fetchApi(`/api/cotizaciones/${cotizacionId}/pdf/?format=html`);
      if (!resp.ok) {
        const friendly = friendlyPdfErrorMessage(`HTTP ${resp.status}`, resp.status);
        setAlert({ show: true, variant: "error", title: friendly.title, message: friendly.message });
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cotizacion_${cotizacionFolio ?? cotizacionId}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setAlert({
        show: true,
        variant: "error",
        title: "Error de red",
        message: "No se pudo descargar el HTML. Revisa tu conexión y reintenta.",
      });
    }
  }, [cotizacionId, cotizacionFolio, isPreviewMode]);

  const pct = Math.min(99, Math.max(0, Math.round(loadingProgress)));

  return (
    <div className={erpPageCanvasClass} style={cotSansStyle}>
      <div className={erpPageInnerClass}>
        <PageMeta title="PDF Cotización | Digitalflow" description="Vista previa y descarga del PDF de cotización" />

        <Modal isOpen={loading} onClose={() => {}} showCloseButton={false} ariaLabel="Generando PDF de cotización" className="mx-4 max-w-md sm:mx-auto">
          <div className="p-7 sm:p-8" aria-busy="true" aria-live="polite">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827]/90">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#E7E7EA] bg-[#ffffff] dark:border-[#273244] dark:bg-[#0f172a]">
                    <div
                      className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#1B5CFF] dark:border-t-[#4B7CFF]"
                      aria-hidden
                    />
                    <svg className="relative h-7 w-7 text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M10 13h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M10 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              <p className={sectionLabelOrangeClass}>Documento</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-[#09090B] dark:text-[#f8fafc] sm:text-lg">Generando PDF</h2>
              <p className="mt-1.5 max-w-xs text-xs text-[#6E6E77] dark:text-[#8ea0b8] sm:text-sm">
                Puede tardar unos segundos. No cierre esta ventana.
              </p>

              <div className="mt-6 w-full">
                <div className="flex items-center justify-between text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
                  <span>Progreso</span>
                  <span className="font-medium tabular-nums">{pct}%</span>
                </div>
                <div
                  className="mt-2 h-2 w-full overflow-hidden rounded-full border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0f172a]"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progreso de generación del PDF"
                >
                  <div
                    className="h-full bg-[#1B5CFF] transition-[width] duration-500 ease-out dark:bg-[#1B5CFF]"
                    style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
                  />
                </div>
                <p className="mt-3 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">Preparando archivo…</p>
              </div>
            </div>
          </div>
        </Modal>

        <nav
          className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#6E6E77] dark:text-[#8ea0b8] sm:text-[13px]"
          aria-label="Migas de pan"
        >
          <Link
            to="/"
            className="rounded-md px-1 py-0.5 text-[#52525B] transition-colors hover:bg-black/[0.03] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            Inicio
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#273244]" aria-hidden>
            /
          </span>
          <Link
            to="/cotizacion"
            className="rounded-md px-1 py-0.5 text-[#52525B] transition-colors hover:bg-black/[0.03] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            Cotizaciones
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#273244]" aria-hidden>
            /
          </span>
          <span className="text-[#52525B] dark:text-[#cbd5e1]">Vista PDF</span>
        </nav>

        {alert.show && (
          <div role="alert" aria-live="assertive">
            <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
          </div>
        )}

        <header className={heroBandClass}>
          <div className={heroBlurClass} aria-hidden />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
            <div className="flex min-w-0 items-start gap-4">
              <span className={heroIconWrapClass} aria-hidden>
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={heroEyebrowClass}>{isPreviewMode ? "Vista previa" : "Cotización"}</p>
                  {cotizacionFolio != null && (
                    <span className="inline-flex h-5 items-center rounded-full bg-[rgba(230,162,60,0.22)] px-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#E6A23C]">
                      {cotizacionFolio}
                    </span>
                  )}
                </div>
                <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]">Vista PDF</h1>
                <p className="mt-1.5 max-w-[62ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70 sm:mt-2">
                  Revise el documento en el panel principal y use el lateral para abrir en otra pestaña o descargar.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 sm:pt-1">
              <button
                type="button"
                onClick={() => navigate(cotizacionListPath(listSearchFromLocationState(location.state)))}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-auto"
                aria-label="Regresar a cotizaciones"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M10 19 3 12l7-7" />
                  <path d="M3 12h18" />
                </svg>
                <span className="hidden sm:inline">Volver al listado</span>
                <span className="sm:hidden">Volver</span>
              </button>
            </div>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-8">
            <div className={`flex min-h-0 flex-col ${cardShellClass} lg:min-h-[calc(100vh-13.5rem)]`}>
              <div className="border-b border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3 dark:border-[#273244] dark:bg-[#111827] sm:px-5 sm:py-3.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className={sectionLabelOrangeClass}>Vista previa</p>
                    <p className="mt-0.5 text-sm font-medium text-[#09090B] dark:text-[#f8fafc]">Documento generado</p>
                  </div>
                  <p className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">El visor usa el motor PDF del navegador.</p>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-[#FAFAFA] p-2 dark:bg-[#0f172a] sm:p-3">
                {loading ? (
                  <div
                    className="flex min-h-[min(100dvh,520px)] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#E7E7EA] bg-[#FAFAFA]/60 dark:border-[#273244] dark:bg-[#0f172a]/40 sm:min-h-[560px] lg:min-h-[calc(100vh-13.5rem)]"
                    aria-busy="true"
                    aria-live="polite"
                    aria-label="Cargando documento"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1B5CFF]/10">
                      <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#E7E7EA] border-t-[#1B5CFF] dark:border-[#273244] dark:border-t-[#4B7CFF]" aria-hidden />
                    </div>
                    <p className="mt-4 text-sm text-[#6E6E77] dark:text-[#8ea0b8]">Preparando vista previa…</p>
                  </div>
                ) : pdfObjectUrl ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0f172a]">
                    <iframe
                      title="Vista previa del PDF"
                      aria-label={`Vista previa del PDF de la cotización${cotizacionFolio != null ? ` ${cotizacionFolio}` : ""}`}
                      src={pdfObjectUrl}
                      loading="lazy"
                      className={viewerFrameClass}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[min(100dvh,400px)] flex-col items-center justify-center rounded-xl border border-dashed border-[#E7E7EA] bg-[#FAFAFA]/60 px-6 py-12 text-center dark:border-[#273244] dark:bg-[#0f172a]/40 lg:min-h-[calc(100vh-13.5rem)]">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1B5CFF]/10 text-[#1B5CFF] dark:text-[#4B7CFF]">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M10 13h4" />
                        <path d="M10 17h7" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-[#09090B] dark:text-[#f8fafc]">No hay documento disponible</p>
                    <p className="mt-1.5 max-w-sm text-sm text-[#6E6E77] dark:text-[#8ea0b8]">
                      No se pudo generar la vista previa. Compruebe la cotización o vuelva al listado.
                    </p>
                    {hasError && (
                      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                        <button type="button" className={erpPrimaryBtnClass} onClick={handleRetry}>
                          {retryIcon}
                          Reintentar
                        </button>
                        {!isPreviewMode && (
                          <button type="button" className={erpSecondaryBtnClass} onClick={() => void handleDownloadHtmlFallback()}>
                            {htmlIcon}
                            Descargar HTML
                          </button>
                        )}
                      </div>
                    )}
                    <Link
                      to="/cotizacion"
                      className="mt-6 text-sm font-medium text-[#1B5CFF] underline-offset-4 hover:underline dark:text-[#4B7CFF]"
                    >
                      Ir a cotizaciones
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-4 lg:sticky lg:top-6 lg:self-start xl:top-8">
            <div className={cardShellClass}>
              <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-5">
                <p className={sectionLabelOrangeClass}>Documento</p>
                <h2 className={`mt-1 ${erpSubheadingClass}`}>Archivo y acciones</h2>
                <p className="mt-1 text-xs text-[#6E6E77] dark:text-[#8ea0b8] sm:text-sm">Nombre sugerido al descargar y accesos rápidos.</p>
              </div>
              <div className="space-y-4 px-4 py-5 sm:px-5">
                <div className={`${erpCardShellMutedClass} px-3 py-2.5`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#8ea0b8]">Nombre de archivo</p>
                  <code className="mt-1 block break-all rounded-md border border-[#E7E7EA] bg-[#ffffff] px-2.5 py-1.5 text-xs font-medium text-[#09090B] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#e5e7eb]">
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

                  {hasError && (
                    <>
                      <button type="button" className={`${erpSecondaryBtnClass} !min-h-[48px] sm:!min-h-0`} onClick={handleRetry}>
                        {retryIcon}
                        Reintentar
                      </button>
                      {!isPreviewMode && (
                        <button
                          type="button"
                          className={`${erpSecondaryBtnClass} !min-h-[48px] sm:!min-h-0`}
                          onClick={() => void handleDownloadHtmlFallback()}
                        >
                          {htmlIcon}
                          Descargar HTML (respaldo)
                        </button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-[#6E6E77] dark:text-[#8ea0b8]">
                  Si la vista previa se ve cortada, abra el archivo en una pestaña nueva o descárguelo para verlo con su lector PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
