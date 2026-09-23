import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  FileWarning,
  Info,
  Mail,
  MailCheck,
  Pencil,
  RotateCw,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { AppProgressDialog } from "@/components/ui/modal-kit/ModalKit";
import { fetchApi, hasAuthSessionFlag } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import { objectUrlsForPdfViewer } from "@/utils/pdfViewerPreview";
import { cotizacionListPath, listSearchFromLocationState } from "@/pages/Ventas/Cotizacion/shared/cotizacionListNav";
import {
  cotPageCanvasClass as erpPageCanvasClass,
  cotPageInnerClass as erpPageInnerClass,
  cotSansStyle,
} from "./shared/cotizacionFormStyles";
import "@/components/ui/modal-kit/motion.css";
import CotizacionEnviarPdfModal, { type CotizacionEnviarPdfTarget } from "./form/CotizacionEnviarPdfModal";
import type { ApiCotizacion } from "./shared/cotizacionFormTypes";
import { formatDMY, formatMoney } from "./shared/cotizacionFormUtils";

/* Botones de la barra: misma altura (40 px), radio y tipografía; solo cambia el tono. */
const btnBase =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] px-3.5 text-[14px] font-medium transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
const btnPrimary = `${btnBase} border border-[#1B5CFF] bg-[#1B5CFF] font-semibold text-white hover:border-[#1244D1] hover:bg-[#1244D1] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0]`;
const btnSecondary = `${btnBase} border border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#D4D4D8] hover:bg-[#FAFAFA] hover:text-[#09090B] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]`;
const btnGhost = `${btnBase} border border-transparent text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]`;

/** Visor: ocupa el alto útil del viewport (menos layout y barra del documento). */
const viewerFrameClass =
  "pdf-browser-viewer block h-[72vh] min-h-[480px] w-full border-0 bg-white sm:h-[calc(100dvh-13rem)] sm:min-h-[640px]";

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
  const { permissions } = useAuth();
  const isPreviewMode = String(cotizacionId || "").toUpperCase() === "PREVIEW" || searchParams.get("preview") === "1";

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [docIsPdf, setDocIsPdf] = useState(true);
  const [filename, setFilename] = useState<string>("cotizacion.pdf");
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(8);
  const [hasError, setHasError] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "error", title: "", message: "" });
  const [reloadKey, setReloadKey] = useState(0);

  /** Folio visible (idx → COT-n), no el id interno de la URL */
  const [cotizacionIdx, setCotizacionIdx] = useState<number | string | null>(null);
  /** Detalle de la cotización (cliente, total, status…) para el panel de resumen. */
  const [detalle, setDetalle] = useState<ApiCotizacion | null>(null);
  const [enviarPdfTarget, setEnviarPdfTarget] = useState<CotizacionEnviarPdfTarget | null>(null);
  const cotizacionFolio =
    cotizacionIdx === "PREVIEW"
      ? "PREVIEW"
      : cotizacionIdx != null
        ? formatDocumentFolio(FOLIO_SERIE.cotizacion, cotizacionIdx)
        : null;

  /** Object URLs de vista previa (HTML) y de descarga (PDF). */
  const lastObjectUrlRef = useRef<string | null>(null);
  const lastPdfDownloadUrlRef = useRef<string | null>(null);

  const revokeLater = useCallback((url: string | null) => {
    if (!url) return;
    // Diferir: si se revoca mientras el iframe/object aún lo usa, Chrome loguea
    // `invalid/:1 Failed to load resource: net::ERR_FAILED` (ruido / vista rota).
    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }, 1_500);
  }, []);

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
        const data = (await res.json().catch(() => null)) as ApiCotizacion | null;
        if (cancelled || !data) return;
        setDetalle(data);
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

        let pdfResp: Response;
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
              setPdfDownloadUrl(null);
              if (lastObjectUrlRef.current) {
                revokeLater(lastObjectUrlRef.current);
                lastObjectUrlRef.current = null;
              }
              if (lastPdfDownloadUrlRef.current) {
                revokeLater(lastPdfDownloadUrlRef.current);
                lastPdfDownloadUrlRef.current = null;
              }
              setLoading(false);
            }
            return;
          }
          pdfResp = await fetchApi("/api/cotizaciones/pdf-preview/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: rawPayload,
          });
        } else {
          pdfResp = await fetchApi(`/api/cotizaciones/${cotizacionId}/pdf/`);
        }

        if (!isMounted) return;

        if (!pdfResp.ok) {
          let detail = "";
          let backendError = "";
          try {
            const ct = pdfResp.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const data = (await pdfResp.json()) as { detail?: string; error?: string };
              detail = data?.detail || "";
              backendError = typeof data?.error === "string" ? data.error : "";
            } else {
              detail = (await pdfResp.text()) || "";
            }
          } catch {
            /* ignore */
          }

          const combined = [detail, backendError].filter(Boolean).join(" — ");
          const friendly = friendlyPdfErrorMessage(combined || `HTTP ${pdfResp.status}`, pdfResp.status);
          setHasError(true);
          setAlert({
            show: true,
            variant: pdfResp.status >= 500 ? "error" : "warning",
            title: friendly.title,
            message: friendly.message,
          });
          setPdfObjectUrl(null);
          setPdfDownloadUrl(null);
          if (lastObjectUrlRef.current) {
            revokeLater(lastObjectUrlRef.current);
            lastObjectUrlRef.current = null;
          }
          if (lastPdfDownloadUrlRef.current) {
            revokeLater(lastPdfDownloadUrlRef.current);
            lastPdfDownloadUrlRef.current = null;
          }
          return;
        }

        const ct = (pdfResp.headers.get("content-type") || "").toLowerCase();

        const dispo = pdfResp.headers.get("content-disposition") || "";
        const m = dispo.match(/filename="?([^";]+)"?/i);

        const isPdf = ct.includes("application/pdf");
        const baseName = isPreviewMode ? "Cotizacion_PREVIEW" : `Cotizacion_${cotizacionId}`;
        const nextFilename = m?.[1] ? String(m[1]) : isPdf ? `${baseName}.pdf` : `${baseName}.html`;
        setFilename(nextFilename);

        const rawBlob = await pdfResp.blob();
        let previewUrl: string;
        let downloadUrl: string;
        if (isPdf) {
          const urls = objectUrlsForPdfViewer(rawBlob);
          previewUrl = urls.previewUrl;
          downloadUrl = urls.downloadUrl;
        } else {
          downloadUrl = URL.createObjectURL(rawBlob);
          previewUrl = downloadUrl;
        }
        setDocIsPdf(isPdf);

        const prevPreview = lastObjectUrlRef.current;
        const prevPdf = lastPdfDownloadUrlRef.current;
        lastObjectUrlRef.current = previewUrl;
        lastPdfDownloadUrlRef.current = downloadUrl;
        setPdfObjectUrl(previewUrl);
        setPdfDownloadUrl(downloadUrl);
        if (prevPreview && prevPreview !== previewUrl) revokeLater(prevPreview);
        if (prevPdf && prevPdf !== downloadUrl && prevPdf !== previewUrl) revokeLater(prevPdf);
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
  }, [cotizacionId, isPreviewMode, reloadKey, revokeLater]);

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
      const url = lastObjectUrlRef.current;
      lastObjectUrlRef.current = null;
      revokeLater(url);
      const pdfUrl = lastPdfDownloadUrlRef.current;
      lastPdfDownloadUrlRef.current = null;
      revokeLater(pdfUrl);
    };
  }, [revokeLater]);

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
      const resp = await fetchApi(`/api/cotizaciones/${cotizacionId}/pdf/?html=1`);
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


  const handleDownloadPdf = () => {
    if (!pdfDownloadUrl) return;
    const a = document.createElement("a");
    a.href = pdfDownloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* ------------------------------------------------------------------------
     Derivados de presentación
     ------------------------------------------------------------------------ */
  const puedeEditar = !isPreviewMode && !!cotizacionId && permissions?.cotizaciones?.edit === true;
  const estado: "cargando" | "listo" | "error" = loading ? "cargando" : pdfObjectUrl ? "listo" : "error";
  const statusKey = String(detalle?.status || "").toUpperCase();
  const statusInfo =
    statusKey === "AUTORIZADA"
      ? { label: "Autorizada", dot: "bg-[#04724D] dark:bg-[#4ADE80]", chip: "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]" }
      : statusKey === "CANCELADA"
        ? { label: "Cancelada", dot: "bg-[#C22B2B] dark:bg-[#F87171]", chip: "bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]" }
        : statusKey === "PENDIENTE"
          ? { label: "Pendiente", dot: "bg-[#D97706] dark:bg-[#E6A23C]", chip: "bg-[#FFF8EB] text-[#8A5A10] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F0C675]" }
          : null;
  const clienteNombre = String(detalle?.cliente_nombre || detalle?.cliente || "").trim();
  const esGarantia = !!detalle?.pdf_opciones?.es_garantia;
  const total = esGarantia ? 0 : Number(detalle?.total) || 0;
  const anticipoPct = Math.min(100, Math.max(0, Number(detalle?.anticipo_pct ?? 60) || 60));
  const anticipo = total * (anticipoPct / 100);
  const partidas = Array.isArray(detalle?.items) ? detalle.items.length : 0;
  const fechaDoc = detalle?.fecha ? formatDMY(String(detalle.fecha).slice(0, 10)) : "";
  const enviadoPor = String(detalle?.enviado_por_full_name || detalle?.enviado_por_username || "").trim();
  const puedeEnviarCorreo =
    !isPreviewMode && !!detalle && (statusKey === "PENDIENTE" || statusKey === "AUTORIZADA") && estado === "listo";

  const abrirEnvio = () =>
    setEnviarPdfTarget({
      id: Number(cotizacionId),
      idx: typeof cotizacionIdx === "number" ? cotizacionIdx : undefined,
      cliente: clienteNombre || undefined,
      status: statusKey,
    });

  return (
    <div className={erpPageCanvasClass} style={cotSansStyle}>
      <div className={`${erpPageInnerClass} space-y-4! sm:space-y-5!`}>
        <PageMeta title="PDF Cotización | Digitalflow" description="Vista previa y descarga del PDF de cotización" />

        <AppProgressDialog
          open={loading}
          icon={<FileText />}
          title={isPreviewMode ? "Generando vista previa" : "Generando PDF"}
          description="Estamos armando el documento con los datos más recientes."
          subject={cotizacionFolio && cotizacionFolio !== "PREVIEW" ? cotizacionFolio : undefined}
          progress={loadingProgress}
          steps={["Reuniendo los datos", "Generando el documento", "Preparando la vista previa"]}
        />

        <CotizacionEnviarPdfModal
          open={enviarPdfTarget != null}
          cotizacion={enviarPdfTarget}
          onClose={() => setEnviarPdfTarget(null)}
          onSent={(correo, envio) => {
            setEnviarPdfTarget(null);
            if (envio) setDetalle((d) => (d ? { ...d, ...envio } : d));
            setAlert({ show: true, variant: "success", title: "Correo enviado", message: `El PDF se envió a ${correo}.` });
          }}
          onError={(message) => setAlert({ show: true, variant: "error", title: "Correo", message })}
        />

        {alert.show && (
          <div role="alert" aria-live="assertive">
            <Alert
              variant={alert.variant}
              title={alert.title}
              message={alert.message}
              showLink={false}
              onClose={() => setAlert((a) => ({ ...a, show: false }))}
            />
          </div>
        )}

        {/* ============================ Barra del documento ============================ */}
        <header
          className="cot-rise flex flex-col gap-4 rounded-2xl border border-[#E4E4E7] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827] sm:px-5 lg:flex-row lg:items-center lg:justify-between"
          style={{ "--cot-i": 0 } as CSSProperties}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(cotizacionListPath(listSearchFromLocationState(location.state)))}
              className={`${btnGhost} w-10! px-0!`}
              aria-label="Volver al listado de cotizaciones"
              title="Volver al listado"
            >
              <ArrowLeft className="size-4" aria-hidden />
            </button>
            <span className="h-8 w-px shrink-0 bg-[#E4E4E7] dark:bg-[#273244]" aria-hidden />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[17px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                  {isPreviewMode ? "Vista previa" : cotizacionFolio ? `Cotización ${cotizacionFolio}` : "Cotización"}
                </h1>
                {statusInfo && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${statusInfo.chip}`}>
                    <span className={`size-1.5 rounded-full ${statusInfo.dot}`} aria-hidden />
                    {statusInfo.label}
                  </span>
                )}
                {esGarantia && (
                  <span className="inline-flex items-center rounded-full bg-[#E7F7FB] px-2 py-0.5 text-[12px] font-medium text-[#0E6B80] dark:bg-[#0C2A32] dark:text-[#67E8F9]">
                    Garantía
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                {isPreviewMode ? (
                  "Así se verá el documento al guardarlo"
                ) : detalle ? (
                  <>
                    {clienteNombre || "Sin cliente"}
                    {fechaDoc ? <span className="text-[#A1A1AA] dark:text-[#64748B]"> · {fechaDoc}</span> : null}
                  </>
                ) : (
                  <span className="inline-block h-3 w-48 animate-pulse rounded bg-[#F0F0F2] align-middle dark:bg-[#1F2A3C]" />
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {puedeEditar && (
              <button
                type="button"
                onClick={() => navigate(`/cotizacion/${cotizacionId}/editar`, { state: location.state })}
                className={btnGhost}
              >
                <Pencil className="size-4" aria-hidden />
                Editar
              </button>
            )}
            {!isPreviewMode && (
              <button
                type="button"
                disabled={!puedeEnviarCorreo}
                onClick={abrirEnvio}
                title={statusKey === "CANCELADA" ? "No se puede enviar una cotización cancelada" : undefined}
                className={btnSecondary}
              >
                <Mail className="size-4" aria-hidden />
                Enviar por correo
              </button>
            )}
            <a
              href={pdfDownloadUrl || undefined}
              target="_blank"
              rel="noreferrer"
              tabIndex={pdfDownloadUrl ? undefined : -1}
              aria-disabled={!pdfDownloadUrl}
              onClick={(e) => {
                if (!pdfDownloadUrl) e.preventDefault();
              }}
              className={`${btnSecondary} ${!pdfDownloadUrl ? "pointer-events-none opacity-50" : ""}`}
            >
              <ExternalLink className="size-4" aria-hidden />
              Abrir
            </a>
            <button type="button" disabled={!pdfDownloadUrl} onClick={handleDownloadPdf} className={btnPrimary}>
              <Download className="size-4" aria-hidden />
              Descargar
            </button>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* ============================ Documento ============================ */}
          <section
            aria-label="Documento"
            className="cot-rise min-w-0 overflow-hidden rounded-2xl border border-[#E4E4E7] bg-[#EDEEF1] shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#0B1220]"
            style={{ "--cot-i": 1 } as CSSProperties}
          >
            {estado === "cargando" ? (
              <div className="flex justify-center px-3 py-6 sm:px-8 sm:py-10" aria-busy="true" aria-label="Cargando documento">
                <div className="w-full max-w-[760px] rounded-md bg-white p-8 shadow-[0_18px_40px_-24px_rgba(9,9,11,0.45)] dark:bg-[#1B2539] sm:p-12">
                  <div className="flex items-start justify-between gap-6">
                    <div className="h-10 w-36 animate-pulse rounded bg-[#E4E4E7] dark:bg-[#273244]" />
                    <div className="h-14 w-40 animate-pulse rounded bg-[#E4E4E7] dark:bg-[#273244]" />
                  </div>
                  <div className="mt-10 space-y-2.5">
                    {[92, 76, 84].map((w) => (
                      <div key={w} className="h-2.5 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1F2A3C]" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  <div className="mt-8 overflow-hidden rounded border border-[#F0F0F2] dark:border-[#273244]">
                    <div className="h-8 bg-[#1B5CFF]/15" />
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-4 border-t border-[#F0F0F2] px-3 py-3 dark:border-[#273244]">
                        <div className="h-2.5 w-8 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1F2A3C]" />
                        <div className="h-2.5 flex-1 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1F2A3C]" />
                        <div className="h-2.5 w-16 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1F2A3C]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : estado === "listo" ? (
              <div className="cot-fade">
                {/*
                  Solo iframe (como Órdenes/Proyectos). El <object data="blob…#toolbar=…">
                  hace que Chrome pida recursos internos `invalid/` y llene la consola
                  con net::ERR_FAILED aunque el PDF se vea.
                */}
                <iframe
                  key={pdfObjectUrl}
                  title={docIsPdf ? "Vista previa del PDF" : "Vista previa del documento"}
                  aria-label={`Vista previa del documento de la cotización${cotizacionFolio != null ? ` ${cotizacionFolio}` : ""}`}
                  src={pdfObjectUrl ?? undefined}
                  className={viewerFrameClass}
                />
              </div>
            ) : (
              <div className="cot-fade flex flex-col items-center px-6 py-16 text-center sm:py-24">
                <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-[#C22B2B] ring-1 ring-inset ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]">
                  <FileWarning className="size-6" strokeWidth={1.8} aria-hidden />
                </span>
                <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                  {alert.title || "No se pudo generar el documento"}
                </h2>
                <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
                  {alert.message || "Vuelve a intentarlo. Si el problema sigue, descarga el HTML de respaldo."}
                </p>
                {hasError && (
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                    <button type="button" className={btnPrimary} onClick={handleRetry}>
                      <RotateCw className="size-4" aria-hidden />
                      Reintentar
                    </button>
                    {!isPreviewMode && (
                      <button type="button" className={btnSecondary} onClick={() => void handleDownloadHtmlFallback()}>
                        <FileCode className="size-4" aria-hidden />
                        HTML de respaldo
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ============================ Resumen ============================ */}
          {!isPreviewMode && (
            <aside
              className="cot-rise min-w-0 overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827] xl:sticky xl:top-24"
              style={{ "--cot-i": 2 } as CSSProperties}
              aria-label="Resumen de la cotización"
            >
              <div className="p-5">
                <p className="text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]">Total</p>
                {detalle ? (
                  <p className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.8px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                    {formatMoney(total)}
                  </p>
                ) : (
                  <span className="mt-2 block h-7 w-36 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1F2A3C]" />
                )}
                <p className="mt-1.5 text-[12px] text-[#A1A1AA] dark:text-[#64748B]">
                  {esGarantia ? "Garantía · precios en $0 en el PDF" : `MXN · IVA incluido · ${partidas} ${partidas === 1 ? "partida" : "partidas"}`}
                </p>

                {detalle && !esGarantia && total > 0 && (
                  <div className="mt-5">
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-[#F0F0F2] dark:bg-[#1F2A3C]" aria-hidden>
                      <div
                        className="cot-bar h-full w-full rounded-full bg-[#1B5CFF] dark:bg-[#4B7CFF]"
                        style={{ transform: `scaleX(${anticipoPct / 100})` }}
                      />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">Anticipo {anticipoPct.toFixed(0)}%</dt>
                        <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                          {formatMoney(anticipo)}
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">Saldo {(100 - anticipoPct).toFixed(0)}%</dt>
                        <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                          {formatMoney(Math.max(0, total - anticipo))}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>

              <dl className="border-t border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C]">
                {[
                  { label: "Cliente", value: clienteNombre },
                  { label: "Contacto", value: String(detalle?.contacto || "").trim() },
                  { label: "Teléfono", value: String(detalle?.contacto_telefono || "").trim() },
                ].map((r) => (
                  <div key={r.label} className="py-1.5 first:pt-0 last:pb-0">
                    <dt className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{r.label}</dt>
                    <dd className="mt-0.5 break-words text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                      {detalle ? r.value || "—" : <span className="inline-block h-3.5 w-32 animate-pulse rounded bg-[#F0F0F2] align-middle dark:bg-[#1F2A3C]" />}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex items-start gap-3 border-t border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C]">
                {enviadoPor ? (
                  <>
                    <MailCheck className="mt-0.5 size-4 shrink-0 text-[#04724D] dark:text-[#4ADE80]" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">Enviada por {enviadoPor}</p>
                      <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                        {detalle?.enviado_en
                          ? new Date(detalle.enviado_en).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
                          : "Sin fecha registrada"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Mail className="mt-0.5 size-4 shrink-0 text-[#A1A1AA] dark:text-[#64748B]" aria-hidden />
                    <p className="text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Aún no se ha enviado al cliente.</p>
                  </>
                )}
              </div>
            </aside>
          )}
        </div>

        {estado === "listo" && (
          <p className="flex items-center gap-2 px-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
            <Info className="size-3.5 shrink-0" aria-hidden />
            ¿No se ve el documento? Algunos navegadores de celular no muestran PDF aquí: usa «Abrir» o «Descargar».
          </p>
        )}
      </div>
    </div>
  );
}
