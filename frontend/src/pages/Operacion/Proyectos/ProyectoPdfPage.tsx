import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Download,
  ExternalLink,
  FileText,
  FileWarning,
  Info,
  Mail,
  PenLine,
  RotateCw,
  Users,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { AppProgressDialog } from "@/components/ui/modal-kit/ModalKit";
import { fetchApi } from "@/config/api";
import { objectUrlsForPdfViewer } from "@/utils/pdfViewerPreview";
import { erpPageCanvasClass, erpPageInnerClass } from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import ProyectoEnviarPdfModal, { type ProyectoEnviarPdfTarget } from "./list/ProyectoEnviarPdfModal";
import { proyectoRowFromApi, type ApiProyecto } from "./shared/proyectoApi";
import {
  formatPeriodoLabel,
  proyectoCotizacionesRefs,
  proyectoPeriodo,
  proyectoTeam,
  proyectoTiposLabels,
} from "./shared/proyectoListUtils";
import { Avatar, EstadoPill, ProgressBar } from "./shared/ProyectoUi";
import { focusRing, sansStyle, toneForEstado } from "./shared/proyectoTokens";
import type { ProyectoRow } from "./shared/proyectoTypes";

/* Botones de la barra: misma altura (40 px), radio y tipografía; solo cambia el tono. */
const btnBase = `cot-press inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] px-3.5 text-[14px] font-medium disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${focusRing}`;
const btnPrimary = `${btnBase} border border-[#1B5CFF] bg-[#1B5CFF] font-semibold text-white hover:border-[#1244D1] hover:bg-[#1244D1] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0]`;
const btnSecondary = `${btnBase} border border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#D4D4D8] hover:bg-[#FAFAFA] hover:text-[#09090B] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]`;
const btnGhost = `${btnBase} border border-transparent text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]`;

const panelClass =
  "min-w-0 overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827]";

/** Visor: ocupa el alto útil del viewport (menos layout y barra del documento). */
const viewerFrameClass =
  "pdf-browser-viewer block h-[72vh] min-h-[480px] w-full border-0 bg-white sm:h-[calc(100dvh-13rem)] sm:min-h-[640px]";

const bone = "block animate-pulse rounded bg-[#F0F0F2] motion-reduce:animate-none dark:bg-[#1F2A3C]";

/** Secciones que trae el PDF del proyecto. */
const CONTENT_SECTIONS: { id: string; label: string; icon: ReactNode }[] = [
  { id: "bitacora", label: "Bitácora", icon: <BookOpen /> },
  { id: "equipo", label: "Equipo", icon: <Users /> },
  { id: "firmas", label: "Firmas", icon: <PenLine /> },
  { id: "evidencias", label: "Evidencias", icon: <Camera /> },
];

type AlertState = {
  show: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

const riseStyle = (i: number) => ({ "--cot-i": i }) as CSSProperties;

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-1.5 first:pt-0 last:pb-0">
      <dt className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{label}</dt>
      <dd className="mt-0.5 break-words text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{children}</dd>
    </div>
  );
}

function EquiposMeter({ label, value, total, barClass }: { label: string; value: number; total: number; barClass: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{label}</span>
        <span className="text-[13px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
          {value}
          <span className="font-normal text-[#A1A1AA] dark:text-[#64748B]">/{total}</span>
        </span>
      </div>
      <ProgressBar value={pct} barClass={barClass} size="sm" className="mt-1.5" label={`${label}: ${value} de ${total}`} />
    </div>
  );
}

/**
 * Vista previa / descarga del PDF de un proyecto.
 * Mismo esquema que la vista PDF de Cotizaciones: barra del documento, visor y resumen lateral.
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
  const [isHtmlFallback, setIsHtmlFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(8);
  const [proyecto, setProyecto] = useState<ProyectoRow | null>(null);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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
          return;
        }

        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        const dispo = resp.headers.get("content-disposition") || "";
        const m = dispo.match(/filename="?([^";]+)"?/i);
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
        setFilename(m?.[1] ? String(m[1]) : `Proyecto_${proyectoId}.${isPdf ? "pdf" : "html"}`);
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

  // Progreso simulado del diálogo mientras el servidor arma el PDF.
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

  const abrirEnvio = () => {
    if (!proyecto) return;
    setEnviarTarget({ id: Number(proyecto.id), folio: proyecto.folio, cliente: proyecto.cliente, estado: proyecto.estado });
  };

  return (
    <div className={erpPageCanvasClass} style={sansStyle}>
      <div className={`${erpPageInnerClass} space-y-4! sm:space-y-5!`}>
        <PageMeta title="PDF Proyecto | Digitalflow" description="Vista previa y descarga del PDF del proyecto" />

        <AppProgressDialog
          open={loading}
          icon={<FileText />}
          title="Generando PDF"
          description="Estamos armando el documento con la bitácora, el equipo y las evidencias más recientes."
          subject={folio ?? undefined}
          progress={loadingProgress}
          steps={["Reuniendo bitácora y equipo", "Insertando firmas y evidencias", "Preparando la vista previa"]}
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

        {alert.show ? (
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            showLink={false}
            onClose={() => setAlert((a) => ({ ...a, show: false }))}
          />
        ) : null}

        {/* ============================ Barra del documento ============================ */}
        <header
          className="cot-rise flex flex-col gap-4 rounded-2xl border border-[#E4E4E7] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827] sm:px-5 lg:flex-row lg:items-center lg:justify-between"
          style={riseStyle(0)}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(returnPath)}
              className={`${btnGhost} w-10! px-0!`}
              aria-label="Volver al listado de proyectos"
              title="Volver al listado"
            >
              <ArrowLeft aria-hidden />
            </button>
            <span className="h-8 w-px shrink-0 bg-[#E4E4E7] dark:bg-[#273244]" aria-hidden />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[17px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                  {folio ? `Proyecto ${folio}` : "Proyecto"}
                </h1>
                {proyecto ? <EstadoPill estado={proyecto.estado} size="sm" className="cot-fade" /> : null}
                {liquidado ? (
                  <span className="cot-fade inline-flex h-5 items-center rounded-full bg-[#E6F6F2] px-2 text-[11px] font-semibold text-[#0B6B5C] ring-1 ring-inset ring-[#BEE5DA] dark:bg-[rgba(45,212,191,0.12)] dark:text-[#5EEAD4] dark:ring-[rgba(45,212,191,0.3)]">
                    Liquidado
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                {proyecto ? (
                  <>
                    {clienteNombre || "Sin cliente"}
                    {tipos.length ? <span className="text-[#A1A1AA] dark:text-[#64748B]"> · {tipos.join(" · ")}</span> : null}
                  </>
                ) : metaLoaded ? (
                  "Documento operativo del proyecto"
                ) : (
                  <span className={`${bone} inline-block! h-3 w-48 align-middle`} />
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!puedeEnviar}
              onClick={abrirEnvio}
              title={proyecto?.estado === "cancelado" ? "No se puede enviar un proyecto cancelado" : undefined}
              className={btnSecondary}
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
              className={`${btnSecondary} ${!pdfDownloadUrl ? "pointer-events-none opacity-50" : ""}`}
            >
              <ExternalLink aria-hidden />
              Abrir
            </a>
            <button type="button" disabled={!pdfDownloadUrl} onClick={handleDownload} className={btnPrimary}>
              <Download aria-hidden />
              {isHtmlFallback ? "Descargar HTML" : "Descargar"}
            </button>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* ============================ Documento ============================ */}
          <section
            aria-label="Documento"
            className="cot-rise min-w-0 overflow-hidden rounded-2xl border border-[#E4E4E7] bg-[#EDEEF1] shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#0B1220]"
            style={riseStyle(1)}
          >
            {estado === "cargando" ? (
              <div className="flex justify-center px-3 py-6 sm:px-8 sm:py-10" aria-busy="true" aria-label="Cargando documento">
                <div className="w-full max-w-[760px] rounded-md bg-white p-8 shadow-[0_18px_40px_-24px_rgba(9,9,11,0.45)] dark:bg-[#1B2539] sm:p-12">
                  <div className="flex items-start justify-between gap-6">
                    <span className={`${bone} h-10 w-36`} />
                    <span className={`${bone} h-14 w-40`} />
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <span className={`${bone} h-2 w-14`} />
                        <span className={`${bone} h-3 w-full`} />
                      </div>
                    ))}
                  </div>
                  {/* Jornadas de la bitácora */}
                  <div className="mt-8 space-y-5">
                    {[0, 1, 2].map((d) => (
                      <div key={d} className="flex gap-4">
                        <span className="mt-0.5 size-3 shrink-0 rounded-full bg-[#1B5CFF]/25" />
                        <div className="flex-1 space-y-2">
                          <span className={`${bone} h-2.5 w-28`} />
                          <span className={`${bone} h-2.5`} style={{ width: `${92 - d * 9}%` }} />
                          <span className={`${bone} h-2.5`} style={{ width: `${70 - d * 6}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={`${bone} aspect-4/3 rounded-md!`} />
                    ))}
                  </div>
                </div>
              </div>
            ) : estado === "listo" ? (
              <div className="cot-fade">
                {/*
                  Solo iframe. El <object data="blob…#toolbar=…"> hace que Chrome pida
                  recursos internos `invalid/` y llene la consola con net::ERR_FAILED.
                */}
                <iframe
                  key={pdfObjectUrl}
                  title={viewerTitle}
                  aria-label={viewerTitle}
                  src={pdfObjectUrl ?? undefined}
                  className={viewerFrameClass}
                />
              </div>
            ) : (
              <div className="cot-fade flex flex-col items-center px-6 py-16 text-center sm:py-24">
                <span className="cot-tick inline-flex size-14 items-center justify-center rounded-2xl bg-white text-[#C22B2B] ring-1 ring-inset ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]">
                  <FileWarning className="size-6" strokeWidth={1.8} aria-hidden />
                </span>
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
              </div>
            )}
          </section>

          {/* ============================ Resumen ============================ */}
          <aside
            className={`cot-rise ${panelClass} xl:sticky xl:top-24`}
            style={riseStyle(2)}
            aria-label="Resumen del proyecto"
          >
            <div className="p-5">
              <p className="text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]">Avance</p>
              {proyecto ? (
                <p
                  key={avance}
                  className={`cot-flash mt-1 text-[28px] font-semibold leading-none tracking-[-0.8px] tabular-nums ${tone.text}`}
                >
                  {avance}%
                </p>
              ) : (
                <span className={`${bone} mt-2 h-7 w-20`} />
              )}
              <ProgressBar
                value={proyecto ? avance : 0}
                barClass={tone.bar}
                className="mt-3"
                label={folio ? `Avance de ${folio}` : "Avance del proyecto"}
              />

              {proyecto && proyecto.equiposTotal > 0 ? (
                <div className="cot-fade mt-5 space-y-3">
                  <EquiposMeter
                    label="Equipos entregados"
                    value={proyecto.equiposEntregados}
                    total={proyecto.equiposTotal}
                    barClass="bg-[#17235B] dark:bg-[#D6DEEA]"
                  />
                  <EquiposMeter
                    label="Equipos instalados"
                    value={proyecto.equiposInstalados}
                    total={proyecto.equiposTotal}
                    barClass="bg-[#0E8A5F] dark:bg-[#34D399]"
                  />
                </div>
              ) : proyecto ? (
                <p className="mt-4 text-[12px] text-[#A1A1AA] dark:text-[#64748B]">Sin equipos registrados.</p>
              ) : null}
            </div>

            <dl className="border-t border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C]">
              {[
                { label: "Cliente", value: clienteNombre },
                { label: "Periodo", value: periodo ? formatPeriodoLabel(periodo) : "" },
                { label: cotizaciones.length > 1 ? "Cotizaciones" : "Cotización", value: cotizaciones.map((c) => c.folio).join(", ") },
              ].map((r) => (
                <SummaryRow key={r.label} label={r.label}>
                  {proyecto ? r.value || "—" : metaLoaded ? "—" : <span className={`${bone} inline-block! h-3.5 w-32 align-middle`} />}
                </SummaryRow>
              ))}
            </dl>

            <div className="border-t border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C]">
              <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">Equipo de campo</p>
              {team && team.todos.length ? (
                <ul className="mt-2 space-y-2">
                  {team.todos.slice(0, 5).map((p, i) => (
                    <li key={p.id ?? `p-${i}`} className="cot-rise flex min-w-0 items-center gap-2.5" style={riseStyle(i + 3)}>
                      <Avatar person={p} size="sm" />
                      <span className="min-w-0 truncate text-[13.5px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{p.nombre}</span>
                      {p.responsable ? (
                        <span className="ml-auto shrink-0 rounded-full bg-[rgba(230,162,60,0.14)] px-2 py-0.5 text-[10.5px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
                          Responsable
                        </span>
                      ) : null}
                    </li>
                  ))}
                  {team.todos.length > 5 ? (
                    <li className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">+{team.todos.length - 5} más</li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-1 text-[13px] text-[#A1A1AA] dark:text-[#64748B]">{proyecto || metaLoaded ? "Sin asignar" : "…"}</p>
              )}
            </div>

            <div className="border-t border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C]">
              <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">Contenido del documento</p>
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Secciones del documento">
                {CONTENT_SECTIONS.map((s) => (
                  <li
                    key={s.id}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F4F4F5] px-2.5 text-[12px] font-medium text-[#3F3F46] dark:bg-white/6 dark:text-[#D6DEEA] [&_svg]:size-3.5 [&_svg]:text-[#1B5CFF] dark:[&_svg]:text-[#7EA0FF]"
                  >
                    <span aria-hidden className="inline-flex">{s.icon}</span>
                    {s.label}
                  </li>
                ))}
              </ul>
              <p className="mt-3 truncate font-mono text-[11.5px] text-[#A1A1AA] dark:text-[#64748B]" title={filename}>
                {filename}
              </p>
            </div>
          </aside>
        </div>

        {estado === "listo" ? (
          <p className="cot-fade flex items-center gap-2 px-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
            <Info className="size-3.5 shrink-0" aria-hidden />
            {isHtmlFallback
              ? "Respaldo HTML: el motor PDF del servidor no está disponible."
              : "¿No se ve el documento o pesa mucho por las fotos? Usa «Abrir» o «Descargar»."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
