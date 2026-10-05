import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, stagger, type Variants } from "motion/react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FileWarning,
  Mail,
  Maximize2,
  Minimize2,
  RotateCw,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { AppProgressDialog } from "@/components/ui/modal-kit/ModalKit";
import { fetchApi } from "@/config/api";
import { objectUrlsForPdfViewer } from "@/utils/pdfViewerPreview";
import ProyectoEnviarPdfModal, { type ProyectoEnviarPdfTarget } from "./list/ProyectoEnviarPdfModal";
import { proyectoRowFromApi, type ApiProyecto } from "./shared/proyectoApi";
import {
  formatPeriodoLabel,
  proyectoCotizacionesRefs,
  proyectoPeriodo,
  proyectoTeam,
  proyectoTiposLabels,
} from "./shared/proyectoListUtils";
import { Avatar } from "./shared/ProyectoUi";
import { focusRing, sansStyle, toneForEstado } from "./shared/proyectoTokens";
import type { ProyectoRow } from "./shared/proyectoTypes";

/* ==========================================================================
   Tokens de la vista
   ========================================================================== */

const btnBase = `cot-press inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] px-3.5 text-[14px] font-medium disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${focusRing}`;
const btnPrimary = `${btnBase} border border-[#1B5CFF] bg-[#1B5CFF] font-semibold text-white shadow-[0_1px_2px_rgba(27,92,255,0.25),inset_0_1px_0_rgba(255,255,255,0.14)] hover:border-[#1244D1] hover:bg-[#1244D1] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0]`;
const btnSecondary = `${btnBase} border border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#D4D4D8] hover:bg-[#FAFAFA] hover:text-[#09090B] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]`;
/* Acciones sobre la banda marina: translúcida y una clara de alto contraste. */
const btnOnDark = `${btnBase} border border-white/15 bg-white/8 text-white hover:bg-white/14 hover:border-white/25`;
const btnLight = `${btnBase} border border-white bg-white font-semibold text-[#17235B] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)] hover:bg-[#F1F4FF]`;
const btnIcon = `cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#B7C1D1] dark:hover:bg-white/6 dark:hover:text-[#F8FAFC] [&_svg]:size-4 ${focusRing}`;

const card =
  "min-w-0 overflow-hidden rounded-[18px] border border-[#E7E7EA] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827]";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]";
const bone = "block animate-pulse rounded bg-[#ECECEF] motion-reduce:animate-none dark:bg-[#1F2A3C]";

/** Alto útil del visor: viewport menos layout y barra del documento. */
const viewerHeight = "h-[72vh] min-h-[480px] sm:h-[calc(100dvh-15rem)] sm:min-h-[640px]";

const LOADING_STEPS = ["Reuniendo bitácora y equipo", "Insertando firmas y evidencias", "Preparando la vista previa"];

/* Movimiento: solo transform/opacity; MotionConfig desactiva transforms con «reducir movimiento». */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const pageVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: stagger(0.06, { startDelay: 0.02 }) } },
};
const riseVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
};
const listVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: stagger(0.045, { startDelay: 0.12 }) } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};
const stageVariants: Variants = {
  initial: { opacity: 0, scale: 0.985 },
  enter: { opacity: 1, scale: 1, transition: { duration: 0.32, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.995, transition: { duration: 0.16, ease: "easeIn" } },
};

type AlertState = {
  show: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ==========================================================================
   Piezas
   ========================================================================== */

/** Anillo de avance: `pathLength` animado por Motion (stroke-dasharray en un SVG chico). */
function AvanceRing({ value, toneText, ready, loaded }: { value: number; toneText: string; ready: boolean; loaded: boolean }) {
  const share = ready ? value / 100 : 0;
  const size = 104;
  const stroke = 9;
  const r = (size - stroke) / 2;
  return (
    <div className="relative size-26 shrink-0" role="img" aria-label={`Avance del proyecto: ${value}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-[#F0F0F2] dark:stroke-[#1F2A3C]" />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          className={toneText}
          initial={{ pathLength: 0, opacity: 0 }}
          // Con 0 el extremo redondeado pintaría un punto: se oculta.
          animate={{ pathLength: share, opacity: share > 0 ? 1 : 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {ready ? (
          <m.span
            key={value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="text-[24px] font-semibold leading-none tracking-[-0.8px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]"
          >
            {value}%
          </m.span>
        ) : loaded ? (
          <span className="text-[24px] font-semibold leading-none text-[#A1A1AA] dark:text-[#64748B]">—</span>
        ) : (
          <span className={`${bone} h-6 w-12`} />
        )}
        <span className="mt-1 text-[10.5px] font-medium uppercase tracking-widest text-[#A1A1AA] dark:text-[#64748B]">avance</span>
      </div>
    </div>
  );
}

/** Barra horizontal: escala en X (sin animar `width`). */
function Meter({ label, value, total, barClass }: { label: string; value: number; total: number; barClass: string }) {
  const share = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] text-[#52525B] dark:text-[#B7C1D1]">{label}</span>
        <span className="text-[13px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
          {value}
          <span className="font-normal text-[#A1A1AA] dark:text-[#64748B]"> / {total}</span>
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0F0F2] dark:bg-[#1F2A3C]"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
      >
        <m.div
          className={`h-full w-full origin-left rounded-full ${barClass}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: share }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.2 }}
        />
      </div>
    </div>
  );
}

/** Hoja esqueleto en el visor mientras el modal de progreso arma el PDF. */
function LoadingStage() {
  return (
    <div className={`relative flex ${viewerHeight} flex-col items-center overflow-hidden px-4 pt-8 sm:px-10`} aria-busy="true" aria-label="Cargando documento">
      <div className="w-full max-w-155 flex-1 rounded-t-md bg-white p-8 shadow-[0_24px_48px_-28px_rgba(9,9,11,0.45)] dark:bg-[#1B2539] sm:p-10" aria-hidden>
        <div className="flex items-start justify-between gap-6">
          <span className={`${bone} h-10 w-40`} />
          <span className={`${bone} h-14 w-32`} />
        </div>
        <span className={`${bone} mt-6 h-16 w-full rounded-md!`} />
        <div className="mt-5 grid grid-cols-2 gap-4">
          <span className={`${bone} h-20 rounded-md!`} />
          <span className={`${bone} h-20 rounded-md!`} />
        </div>
        <div className="mt-5 space-y-2.5">
          <span className={`${bone} h-2.5 w-[88%]`} />
          <span className={`${bone} h-2.5 w-[72%]`} />
          <span className={`${bone} h-2.5 w-[80%]`} />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <span className={`${bone} aspect-4/3 rounded-md!`} />
          <span className={`${bone} aspect-4/3 rounded-md!`} />
          <span className={`${bone} aspect-4/3 rounded-md!`} />
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

/**
 * Vista previa / descarga del PDF de un proyecto: barra del documento, escenario
 * del visor (carga, documento o error) y panel de resumen.
 */
export default function ProyectoPdfPage() {
  const params = useParams();
  const proyectoId = params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = (location.state as { from?: string } | null)?.from || "/proyectos";

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("proyecto.pdf");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isHtmlFallback, setIsHtmlFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(8);
  const [proyecto, setProyecto] = useState<ProyectoRow | null>(null);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [enviarTarget, setEnviarTarget] = useState<ProyectoEnviarPdfTarget | null>(null);
  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "error", title: "", message: "" });

  /** Object URLs vigentes: se revocan con retraso para que el iframe no pida un blob ya liberado. */
  const urlsRef = useRef<string[]>([]);
  const revokeLater = useCallback((urls: string[]) => {
    if (!urls.length) return;
    window.setTimeout(() => {
      for (const u of urls) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* ignore */
        }
      }
    }, 1_500);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!proyectoId) {
        setAlert({ show: true, variant: "error", title: "Error", message: "No se encontró el ID del proyecto." });
        setLoading(false);
        setMetaLoaded(true);
        return;
      }

      setLoading(true);
      setAlert((prev) => ({ ...prev, show: false }));

      try {
        const [metaRes, resp] = await Promise.all([
          fetchApi(`/api/proyectos/${proyectoId}/`, { cache: "no-store" as RequestCache }),
          fetchApi(`/api/proyectos/${proyectoId}/pdf/`),
        ]);
        if (!isMounted) return;

        if (metaRes.ok) {
          const meta = (await metaRes.json().catch(() => null)) as ApiProyecto | null;
          if (isMounted && meta) {
            try {
              setProyecto(proyectoRowFromApi(meta));
            } catch {
              setProyecto(null);
            }
          }
        }
        if (isMounted) setMetaLoaded(true);

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
          if (!isMounted) return;
          setAlert({
            show: true,
            variant: resp.status >= 500 ? "error" : "warning",
            title: "No se pudo generar el documento",
            message: msg.length > 240 ? `${msg.slice(0, 240)}…` : msg,
          });
          revokeLater(urlsRef.current);
          urlsRef.current = [];
          setPdfObjectUrl(null);
          setPdfDownloadUrl(null);
          setFileSize(null);
          return;
        }

        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        const dispo = resp.headers.get("content-disposition") || "";
        const match = dispo.match(/filename="?([^";]+)"?/i);
        const isPdf = ct.includes("application/pdf");

        const blob = await resp.blob();
        if (!isMounted) return;
        const urls = isPdf
          ? objectUrlsForPdfViewer(blob)
          : (() => {
              const u = URL.createObjectURL(blob);
              return { previewUrl: u, downloadUrl: u };
            })();

        setIsHtmlFallback(!isPdf);
        setFileSize(blob.size);
        setFilename(match?.[1] ? String(match[1]) : `Proyecto_${proyectoId}.${isPdf ? "pdf" : "html"}`);
        revokeLater(urlsRef.current);
        urlsRef.current = Array.from(new Set([urls.previewUrl, urls.downloadUrl]));
        setPdfObjectUrl(urls.previewUrl);
        setPdfDownloadUrl(urls.downloadUrl);
      } catch {
        if (isMounted) {
          setMetaLoaded(true);
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
  }, [proyectoId, reloadKey, revokeLater]);

  // Progreso estimado mientras el servidor arma el PDF.
  useEffect(() => {
    if (!loading) {
      setLoadingProgress(100);
      return;
    }
    setLoadingProgress(8);
    const interval = window.setInterval(() => {
      setLoadingProgress((p) => Math.min(95, p + (p < 55 ? 10 : p < 80 ? 6 : 3)));
    }, 650);
    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => () => revokeLater(urlsRef.current), [revokeLater]);

  // Esc sale del modo enfoque.
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  const handleDownload = () => {
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
  const estado: "cargando" | "listo" | "error" = loading ? "cargando" : pdfObjectUrl ? "listo" : "error";
  const folio = proyecto?.folio ?? null;
  const clienteNombre = proyecto?.cliente ?? "";
  const tone = toneForEstado(proyecto?.estado);
  const avance = Math.min(100, Math.max(0, Math.round(Number(proyecto?.draft?.porcentajeAvance) || 0)));
  const team = proyecto ? proyectoTeam(proyecto) : null;
  const periodo = proyecto ? proyectoPeriodo(proyecto) : null;
  const tipos = proyecto ? proyectoTiposLabels(proyecto) : [];
  const cotizaciones = proyecto ? proyectoCotizacionesRefs(proyecto) : [];
  const liquidado = Boolean(proyecto?.draft?.liquidado);
  const puedeEnviar = estado === "listo" && !!proyecto && proyecto.estado !== "cancelado";
  const viewerTitle = folio ? `Vista previa del documento del proyecto ${folio}` : "Vista previa del documento del proyecto";
  const sizeLabel = formatBytes(fileSize);
  const placeholder = metaLoaded ? "—" : <span className={`${bone} inline-block! h-3.5 w-28 align-middle`} />;

  const abrirEnvio = () => {
    if (!proyecto) return;
    setEnviarTarget({ id: Number(proyecto.id), folio: proyecto.folio, cliente: proyecto.cliente, estado: proyecto.estado });
  };

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden" style={sansStyle}>
          <m.div
            className="mx-auto w-full max-w-[min(100%,1920px)] space-y-4 px-3 pb-10 pt-5 sm:space-y-5 sm:px-5 sm:pt-6 md:px-6 lg:px-8 xl:px-10"
            variants={pageVariants}
            initial="hidden"
            animate="show"
          >
            <PageMeta title="PDF Proyecto | Digitalflow" description="Vista previa y descarga del PDF del proyecto" />

            <AppProgressDialog
              open={loading}
              icon={<FileText />}
              title="Generando PDF"
              description="Estamos armando el documento con la bitácora, el equipo y las evidencias más recientes."
              subject={folio ?? undefined}
              progress={loadingProgress}
              steps={LOADING_STEPS}
            />

            <ProyectoEnviarPdfModal
              open={enviarTarget != null}
              proyecto={enviarTarget}
              onClose={() => setEnviarTarget(null)}
              onSent={(correo) => {
                setEnviarTarget(null);
                setAlert({ show: true, variant: "success", title: "Correo enviado", message: `El PDF se envió a ${correo}.` });
              }}
              onError={(message) => setAlert({ show: true, variant: "error", title: "Correo", message })}
            />

            <AnimatePresence initial={false}>
              {alert.show ? (
                <m.div
                  key="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                >
                  <Alert
                    variant={alert.variant}
                    title={alert.title}
                    message={alert.message}
                    showLink={false}
                    onClose={() => setAlert((a) => ({ ...a, show: false }))}
                  />
                </m.div>
              ) : null}
            </AnimatePresence>

            {/* ============================ Encabezado del documento ============================ */}
            <m.div variants={riseVariants}>
              <nav className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]" aria-label="Migas de pan">
                <Link
                  to="/"
                  className={`hidden rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/4 hover:text-[#09090B] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC] sm:inline ${focusRing}`}
                >
                  Inicio
                </Link>
                <ChevronRight className="hidden size-3.5 text-[#D3D3D8] dark:text-[#3A4661] sm:block" aria-hidden />
                <Link
                  to={returnPath}
                  className={`rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/4 hover:text-[#09090B] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC] ${focusRing}`}
                >
                  Proyectos
                </Link>
                <ChevronRight className="size-3.5 text-[#D3D3D8] dark:text-[#3A4661]" aria-hidden />
                <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]" aria-current="page">
                  {folio ? `${folio} · PDF` : "Documento PDF"}
                </span>
              </nav>

              <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] text-white shadow-[0_24px_48px_-32px_rgba(23,35,91,0.7)] dark:bg-[#1B2A63]">
                {/* Decoración: retícula de puntos y dos brillos (estáticos, sin costo por cuadro). */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] bg-size-[18px_18px] mask-[linear-gradient(to_left,black,transparent_70%)]"
                  aria-hidden
                />
                <div className="pointer-events-none absolute -bottom-36 left-1/4 size-72 rounded-full bg-[#1B5CFF]/25 blur-3xl" aria-hidden />
                <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />

                <div className="relative flex flex-col gap-5 px-4 pb-4 pt-5 sm:px-7 sm:pt-7 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => navigate(returnPath)}
                      className={`cot-press inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-white/80 ring-1 ring-inset ring-white/15 hover:bg-white/14 hover:text-white sm:size-11 ${focusRing}`}
                      aria-label="Volver al listado de proyectos"
                      title="Volver al listado"
                    >
                      <ArrowLeft className="size-4.5" aria-hidden />
                    </button>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6A23C]">
                        <FileText className="size-3.5" aria-hidden />
                        Reporte de proyecto
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h1 className="font-mono text-[26px] font-bold leading-none tracking-[-0.8px] sm:text-[32px]">
                          {folio ?? (metaLoaded ? "Proyecto" : <span className="inline-block h-7 w-40 animate-pulse rounded-md bg-white/10 align-middle motion-reduce:animate-none" />)}
                        </h1>
                        <AnimatePresence>
                          {proyecto ? (
                            <m.span
                              key="estado"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="inline-flex h-6 items-center gap-1.5 rounded-full bg-white/10 px-2.5 text-[12px] font-semibold text-white ring-1 ring-inset ring-white/20"
                            >
                              <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
                              {tone.label}
                            </m.span>
                          ) : null}
                          {liquidado ? (
                            <m.span
                              key="liquidado"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="inline-flex h-6 items-center gap-1 rounded-full bg-[rgba(45,212,191,0.16)] px-2.5 text-[12px] font-semibold text-[#5EEAD4] ring-1 ring-inset ring-[rgba(45,212,191,0.35)]"
                            >
                              <Check className="size-3" strokeWidth={3} aria-hidden />
                              Liquidado
                            </m.span>
                          ) : null}
                        </AnimatePresence>
                      </div>
                      <p className="mt-2 max-w-[70ch] truncate text-[15px] leading-5.5 text-white/75">
                        {proyecto ? (
                          <>
                            <span className="font-medium text-white">{clienteNombre || "Sin cliente"}</span>
                            {tipos.length ? <span className="text-white/55"> · {tipos.join(" · ")}</span> : null}
                          </>
                        ) : metaLoaded ? (
                          "Documento operativo del proyecto"
                        ) : (
                          <span className="inline-block h-3.5 w-56 animate-pulse rounded bg-white/10 align-middle motion-reduce:animate-none" />
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0 sm:items-center">
                    <button
                      type="button"
                      disabled={!puedeEnviar}
                      onClick={abrirEnvio}
                      title={proyecto?.estado === "cancelado" ? "No se puede enviar un proyecto cancelado" : undefined}
                      className={btnOnDark}
                    >
                      <Mail aria-hidden />
                      <span className="hidden sm:inline">Enviar por correo</span>
                      <span className="sm:hidden">Enviar</span>
                    </button>
                    <a
                      href={pdfDownloadUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      tabIndex={pdfDownloadUrl ? undefined : -1}
                      aria-disabled={!pdfDownloadUrl}
                      onClick={(e) => {
                        if (!pdfDownloadUrl) e.preventDefault();
                      }}
                      className={`${btnOnDark} ${!pdfDownloadUrl ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <ExternalLink aria-hidden />
                      Abrir
                    </a>
                    <button type="button" disabled={!pdfDownloadUrl} onClick={handleDownload} className={btnLight}>
                      <Download aria-hidden />
                      {isHtmlFallback ? "HTML" : "Descargar"}
                    </button>
                  </div>
                </div>

                {/* Franja de datos clave. */}
                <dl className="relative grid grid-cols-2 border-t border-white/10 bg-black/12 sm:grid-cols-4">
                  {[
                    {
                      label: "Avance",
                      value: proyecto ? (
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums">{avance}%</span>
                          <span className="h-1 w-14 overflow-hidden rounded-full bg-white/15" aria-hidden>
                            <m.span
                              className="block h-full w-full origin-left rounded-full bg-[#E6A23C]"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: avance / 100 }}
                              transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.25 }}
                            />
                          </span>
                        </span>
                      ) : null,
                    },
                    { label: "Periodo", value: proyecto ? formatPeriodoLabel(periodo) : null },
                    {
                      label: cotizaciones.length > 1 ? "Cotizaciones" : "Cotización",
                      value: proyecto ? (cotizaciones.length ? cotizaciones.map((c) => c.folio).join(", ") : "—") : null,
                    },
                    {
                      label: "Documento",
                      value:
                        estado === "listo"
                          ? `${isHtmlFallback ? "HTML" : "PDF"}${sizeLabel ? ` · ${sizeLabel}` : ""}`
                          : estado === "cargando"
                            ? "Generando…"
                            : "No disponible",
                    },
                  ].map((f, i) => (
                    <div
                      key={f.label}
                      className={`min-w-0 px-4 py-3 sm:px-7 ${i % 2 === 1 ? "border-l border-white/10" : ""} ${i >= 2 ? "border-t border-white/10 sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}
                    >
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/50">{f.label}</dt>
                      <dd className="mt-1 truncate text-[14px] font-medium text-white">
                        {f.value ?? (metaLoaded ? "—" : <span className="inline-block h-3.5 w-20 animate-pulse rounded bg-white/10 align-middle motion-reduce:animate-none" />)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </header>
            </m.div>

            <div
              className={`grid min-w-0 grid-cols-1 items-start gap-4 sm:gap-5 ${
                focusMode ? "" : "xl:grid-cols-[minmax(0,1fr)_340px]"
              }`}
            >
              {/* ============================ Escenario del documento ============================ */}
              <m.section variants={riseVariants} aria-label="Documento" className={`${card} flex flex-col`}>
                <div className="flex items-center gap-2 border-b border-[#EFEFF1] px-3 py-2 dark:border-[#1F2A3C] sm:px-4">
                  <span className="relative inline-flex size-2 shrink-0" aria-hidden>
                    <span
                      className={`size-2 rounded-full transition-colors duration-300 ${
                        estado === "listo"
                          ? "bg-[#0E8A5F] dark:bg-[#34D399]"
                          : estado === "cargando"
                            ? "bg-[#1B5CFF] dark:bg-[#4B7CFF]"
                            : "bg-[#C22B2B] dark:bg-[#F87171]"
                      }`}
                    />
                  </span>
                  <p className="min-w-0 truncate font-mono text-[12px] text-[#52525B] dark:text-[#B7C1D1]" title={filename}>
                    {estado === "cargando" ? "Generando documento…" : estado === "listo" ? filename : "Documento no disponible"}
                  </p>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setReloadKey((k) => k + 1)}
                      disabled={loading}
                      className={btnIcon}
                      aria-label="Regenerar documento"
                      title="Regenerar documento"
                    >
                      <RotateCw aria-hidden className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFocusMode((v) => !v)}
                      className={`${btnIcon} hidden xl:inline-flex`}
                      aria-pressed={focusMode}
                      aria-label={focusMode ? "Mostrar panel de resumen" : "Ampliar documento"}
                      title={focusMode ? "Mostrar resumen (Esc)" : "Ampliar documento"}
                    >
                      {focusMode ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
                    </button>
                  </div>
                </div>

                <div className="relative bg-[#EDEEF1] dark:bg-[#0B1220]">
                  <AnimatePresence mode="wait" initial={false}>
                    {estado === "cargando" ? (
                      <m.div key="cargando" variants={stageVariants} initial="initial" animate="enter" exit="exit">
                        <LoadingStage />
                      </m.div>
                    ) : estado === "listo" ? (
                      <m.div key={`listo-${pdfObjectUrl}`} variants={stageVariants} initial="initial" animate="enter" exit="exit">
                        {/*
                          Solo iframe. El <object data="blob…#toolbar=…"> hace que Chrome pida
                          recursos internos `invalid/` y llene la consola con net::ERR_FAILED.
                        */}
                        <iframe
                          title={viewerTitle}
                          aria-label={viewerTitle}
                          src={pdfObjectUrl ?? undefined}
                          className={`pdf-browser-viewer block w-full border-0 bg-white ${viewerHeight}`}
                        />
                      </m.div>
                    ) : (
                      <m.div
                        key="error"
                        variants={stageVariants}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        className="flex flex-col items-center px-6 py-16 text-center sm:py-24"
                      >
                        <m.span
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.05 }}
                          className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-[#C22B2B] ring-1 ring-inset ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]"
                        >
                          <FileWarning className="size-6" strokeWidth={1.8} aria-hidden />
                        </m.span>
                        <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                          {alert.title && alert.variant !== "success" ? alert.title : "No se pudo generar el documento"}
                        </h2>
                        <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
                          {alert.message && alert.variant !== "success"
                            ? alert.message
                            : "Vuelve a intentarlo. Si el problema sigue, revisa el proyecto o vuelve al listado."}
                        </p>
                        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                          <button type="button" className={btnPrimary} onClick={() => setReloadKey((k) => k + 1)}>
                            <RotateCw aria-hidden />
                            Reintentar
                          </button>
                          <button type="button" className={btnSecondary} onClick={() => navigate(returnPath)}>
                            <ArrowLeft aria-hidden />
                            Volver al listado
                          </button>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              </m.section>

              {/* ============================ Panel de resumen ============================ */}
              <AnimatePresence initial={false}>
                {!focusMode ? (
                  <m.aside
                    key="resumen"
                    variants={riseVariants}
                    exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
                    className="min-w-0 space-y-4 xl:sticky xl:top-24"
                    aria-label="Resumen del proyecto"
                  >
                    {/* Avance */}
                    <section className={`${card} p-5`}>
                      <div className="flex items-center gap-5">
                        <AvanceRing value={avance} toneText={tone.text} ready={Boolean(proyecto)} loaded={metaLoaded} />
                        <div className="min-w-0 flex-1">
                          <p className={eyebrow}>Jornadas</p>
                          <p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                            {proyecto ? periodo?.dias ?? 0 : placeholder}
                          </p>
                          <p className={`${eyebrow} mt-3`}>Responsable</p>
                          <p className="mt-1 truncate text-[13.5px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                            {proyecto ? team?.responsable?.nombre || "Sin asignar" : placeholder}
                          </p>
                        </div>
                      </div>

                      {proyecto && proyecto.equiposTotal > 0 ? (
                        <div className="mt-5 space-y-3 border-t border-[#F0F0F2] pt-4 dark:border-[#1F2A3C]">
                          <Meter
                            label="Equipos entregados"
                            value={proyecto.equiposEntregados}
                            total={proyecto.equiposTotal}
                            barClass="bg-[#17235B] dark:bg-[#D6DEEA]"
                          />
                          <Meter
                            label="Equipos instalados"
                            value={proyecto.equiposInstalados}
                            total={proyecto.equiposTotal}
                            barClass="bg-[#0E8A5F] dark:bg-[#34D399]"
                          />
                        </div>
                      ) : null}
                    </section>

                    {/* Equipo de campo */}
                    <section className={`${card} p-5`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={eyebrow}>Equipo de campo</p>
                        {team?.todos.length ? (
                          <span className="text-[12px] tabular-nums text-[#A1A1AA] dark:text-[#64748B]">{team.todos.length}</span>
                        ) : null}
                      </div>
                      {team && team.todos.length ? (
                        <m.ul className="mt-3 space-y-2.5" variants={listVariants} initial="hidden" animate="show">
                          {team.todos.slice(0, 6).map((p, i) => (
                            <m.li key={p.id ?? `p-${i}`} variants={itemVariants} className="flex min-w-0 items-center gap-2.5">
                              <Avatar person={p} size="sm" />
                              <span className="min-w-0 truncate text-[13.5px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{p.nombre}</span>
                              {p.responsable ? (
                                <span className="ml-auto shrink-0 rounded-full bg-[rgba(230,162,60,0.14)] px-2 py-0.5 text-[10.5px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
                                  Responsable
                                </span>
                              ) : null}
                            </m.li>
                          ))}
                          {team.todos.length > 6 ? (
                            <li className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">+{team.todos.length - 6} más</li>
                          ) : null}
                        </m.ul>
                      ) : (
                        <p className="mt-2 text-[13px] text-[#A1A1AA] dark:text-[#64748B]">
                          {proyecto || metaLoaded ? "Sin asignar" : "…"}
                        </p>
                      )}
                    </section>
                  </m.aside>
                ) : null}
              </AnimatePresence>
            </div>
          </m.div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
