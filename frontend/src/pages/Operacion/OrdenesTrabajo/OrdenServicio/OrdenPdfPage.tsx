import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FileWarning,
  Mail,
  MapPin,
  Phone,
  RotateCw,
  UserRound,
  Wrench,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { objectUrlsForPdfViewer } from "@/utils/pdfViewerPreview";
import "@/components/ui/modal-kit/motion.css";
import { OrdenPdfLoadingModal } from "./list/OrdenPdfLoadingModal";
import OrdenEnviarPdfModal, { type OrdenEnviarPdfTarget } from "./list/OrdenEnviarPdfModal";
import { erpPageCanvasClass, erpPageInnerClass, erpSansStyle } from "./ordenServicioStyles";
import type { Orden } from "./shared/ordenesPageTypes";
import { displayOrdenFolio, downloadOrdenPdfById, isOrdenPdfDirectDownload } from "./shared/useOrdenesShared";

/* Botones de la barra: misma altura (40 px), radio y tipografía; solo cambia el tono. */
const btnBase =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] px-3.5 text-[14px] font-medium transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
const btnPrimary = `${btnBase} border border-[#1B5CFF] bg-[#1B5CFF] font-semibold text-white hover:border-[#1244D1] hover:bg-[#1244D1] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0]`;
const btnSecondary = `${btnBase} border border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#D4D4D8] hover:bg-[#FAFAFA] hover:text-[#09090B] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]`;
const btnGhost = `${btnBase} border border-transparent text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]`;

/** Visor: ocupa el alto útil del viewport (menos layout y barra del documento). */
const viewerFrameClass =
  "pdf-browser-viewer block h-[75dvh] min-h-[460px] w-full border-0 bg-white sm:h-[calc(100dvh-8rem)] sm:min-h-[640px]";

export default function OrdenPdfPage() {
  const params = useParams();
  const ordenId = params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = (location.state as { from?: string } | null)?.from || "/ordenes";

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
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
  /** Detalle de la orden (cliente, técnico, fechas…) para el panel de resumen. */
  const [detalle, setDetalle] = useState<Orden | null>(null);
  const [enviarPdfTarget, setEnviarPdfTarget] = useState<OrdenEnviarPdfTarget | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /** En celular el visor incrustado es opcional (muchos navegadores móviles no lo pintan). */
  const [showMobilePreview, setShowMobilePreview] = useState(false);

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
        if (isMounted) {
          setLoading(true);
          setAlert((p) => ({ ...p, show: false }));
        }

        const metaRes = await fetchApi(`/api/ordenes/${ordenId}/`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store" as RequestCache,
        });
        if (!isMounted) return;

        if (metaRes.ok) {
          const meta = (await metaRes.json().catch(() => null)) as Orden | null;
          if (meta) setDetalle(meta);
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

        const pdfPath = `/api/ordenes/${ordenId}/pdf/`;
        const resp = await fetchApi(pdfPath);

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
        const urls = isPdf ? objectUrlsForPdfViewer(blob) : { previewUrl: URL.createObjectURL(blob), downloadUrl: URL.createObjectURL(blob) };
        setPdfObjectUrl(urls.previewUrl);
        setPdfDownloadUrl(urls.downloadUrl);
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
  }, [ordenId, navigate, returnPath, reloadKey]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

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
  const estado: "cargando" | "listo" | "error" = loading ? "cargando" : pdfObjectUrl ? "listo" : "error";
  const folio = ordenIdx != null || detalle?.folio ? displayOrdenFolio({ folio: detalle?.folio, idx: ordenIdx }) : "";
  const statusKey = String(detalle?.status || "").toLowerCase();
  const statusInfo =
    statusKey === "resuelto"
      ? { label: "Resuelta", dot: "bg-[#04724D] dark:bg-[#4ADE80]", chip: "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]" }
      : statusKey === "cancelada"
        ? { label: "Cancelada", dot: "bg-[#C22B2B] dark:bg-[#F87171]", chip: "bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]" }
        : statusKey === "saldo_pendiente"
          ? { label: "Saldo pendiente", dot: "bg-[#A21CAF] dark:bg-[#E879F9]", chip: "bg-[#FDF4FF] text-[#86198F] dark:bg-[#3B0A45] dark:text-[#F5D0FE]" }
          : statusKey === "pausado"
          ? { label: "Pausada", dot: "bg-[#71717A] dark:bg-[#8EA0B8]", chip: "bg-[#F4F4F5] text-[#3F3F46] dark:bg-[#1B2539] dark:text-[#D6DEEA]" }
          : statusKey === "pendiente"
            ? { label: "Pendiente", dot: "bg-[#D97706] dark:bg-[#E6A23C]", chip: "bg-[#FFF8EB] text-[#8A5A10] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F0C675]" }
            : null;
  const clienteNombre = String(detalle?.cliente || detalle?.nombre_cliente || "").trim();
  const tecnico = String(
    detalle?.tecnico_asignado_full_name || detalle?.tecnico_asignado_username || detalle?.nombre_encargado || "",
  ).trim();
  const fmtFechaHora = (fecha?: string | null, hora?: string | null) => {
    const f = String(fecha || "").slice(0, 10);
    if (!f) return "";
    const [y, m, d] = f.split("-");
    const h = String(hora || "").slice(0, 5);
    return `${d}/${m}/${y}${h ? ` · ${h}` : ""}`;
  };
  const inicio = fmtFechaHora(detalle?.fecha_inicio, detalle?.hora_inicio);
  const termino = fmtFechaHora(detalle?.fecha_finalizacion, detalle?.hora_termino);
  const telefono = String(detalle?.telefono_cliente || "").trim();
  const direccion = String(detalle?.direccion || "").trim();
  const direccionEsMapa = /^https?:\/\//i.test(direccion);
  const puedeEnviarCorreo = !!detalle && estado === "listo" && statusKey !== "cancelada";

  const abrirEnvio = () =>
    detalle &&
    setEnviarPdfTarget({
      id: detalle.id,
      folio: detalle.folio,
      idx: detalle.idx,
      cliente: clienteNombre || undefined,
      cliente_id: detalle.cliente_id,
      status: detalle.status,
    });

  const facts: { key: string; label: string; icon: ReactNode; value: ReactNode }[] = [
    { key: "tecnico", label: "Técnico", icon: <Wrench className="size-3.5" aria-hidden />, value: tecnico },
    { key: "inicio", label: "Inicio", icon: <CalendarClock className="size-3.5" aria-hidden />, value: inicio },
    { key: "termino", label: "Término", icon: <CalendarCheck className="size-3.5" aria-hidden />, value: termino },
    {
      key: "telefono",
      label: "Teléfono",
      icon: <Phone className="size-3.5" aria-hidden />,
      value: telefono ? (
        <a href={`tel:${telefono}`} className="underline-offset-4 hover:underline">
          {telefono}
        </a>
      ) : (
        ""
      ),
    },
  ];

  const openLinkProps = {
    href: pdfDownloadUrl || undefined,
    target: "_blank",
    rel: "noreferrer",
    tabIndex: pdfDownloadUrl ? undefined : -1,
    "aria-disabled": !pdfDownloadUrl,
    onClick: (e: React.MouseEvent) => {
      if (!pdfDownloadUrl) e.preventDefault();
    },
  };

  return (
    <div className={erpPageCanvasClass} style={erpSansStyle}>
      <div className={`${erpPageInnerClass} space-y-4! pb-28! sm:space-y-5! sm:pb-12!`}>
        <PageMeta title="PDF Orden de servicio | Digitalflow" description="Vista previa y descarga del PDF de la orden" />

        <OrdenPdfLoadingModal open={loading} downloading={directDownload} />

        <OrdenEnviarPdfModal
          open={enviarPdfTarget != null}
          orden={enviarPdfTarget}
          onClose={() => setEnviarPdfTarget(null)}
          onSent={(correo) => {
            setEnviarPdfTarget(null);
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

        {/* ============================ Ficha del documento ============================ */}
        <header
          className="cot-rise overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827]"
          style={{ "--cot-i": 0 } as CSSProperties}
        >
          <div className="flex flex-col gap-4 px-4 pb-4 pt-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pb-5 sm:pt-5">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={() => navigate(returnPath)}
                className={`${btnGhost} -ml-1.5 w-10! shrink-0 px-0!`}
                aria-label="Volver al listado de órdenes"
                title="Volver al listado"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </button>
              <div className="min-w-0 pt-0.5">
                <p className="text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]">Orden de servicio</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <h1 className="font-mono text-[22px] font-semibold tracking-[-0.5px] text-[#09090B] dark:text-[#F8FAFC] sm:text-[24px]">
                    {folio || "—"}
                  </h1>
                  {statusInfo && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${statusInfo.chip}`}>
                      <span className={`size-1.5 rounded-full ${statusInfo.dot}`} aria-hidden />
                      {statusInfo.label}
                    </span>
                  )}
                </div>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[14px] font-medium text-[#27272A] dark:text-[#E5E7EB]">
                  <UserRound className="size-4 shrink-0 text-[#A1A1AA]" aria-hidden />
                  {detalle ? (
                    <span className="truncate">{clienteNombre || "Sin cliente"}</span>
                  ) : (
                    <span className="inline-block h-3.5 w-40 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1F2A3C]" />
                  )}
                </p>
              </div>
            </div>

            {/* Acciones (escritorio / tableta) */}
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <button type="button" disabled={!puedeEnviarCorreo} onClick={abrirEnvio} className={btnSecondary}>
                <Mail className="size-4" aria-hidden />
                Enviar
              </button>
              <a {...openLinkProps} className={`${btnSecondary} ${!pdfDownloadUrl ? "pointer-events-none opacity-50" : ""}`}>
                <ExternalLink className="size-4" aria-hidden />
                Abrir
              </a>
              <button type="button" disabled={!pdfDownloadUrl} onClick={handleDownloadPdf} className={btnPrimary}>
                <Download className="size-4" aria-hidden />
                Descargar PDF
              </button>
            </div>
          </div>

          {/* Datos clave */}
          <dl className="grid grid-cols-2 gap-px border-t border-[#F0F0F2] bg-[#F0F0F2] dark:border-[#1F2A3C] dark:bg-[#1F2A3C] md:grid-cols-4">
            {facts.map((f) => (
              <div key={f.key} className="min-w-0 bg-white px-4 py-3 dark:bg-[#111827] sm:px-6">
                <dt className="flex items-center gap-1.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                  {f.icon}
                  {f.label}
                </dt>
                <dd className="mt-0.5 truncate text-[14px] font-medium tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                  {!detalle ? (
                    <span className="inline-block h-3.5 w-24 animate-pulse rounded bg-[#F0F0F2] align-middle dark:bg-[#1F2A3C]" />
                  ) : f.value ? (
                    f.value
                  ) : (
                    <span className="font-normal text-[#A1A1AA] dark:text-[#64748B]">—</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {detalle && (direccion || detalle.problematica || (statusKey === "cancelada" && detalle.motivo_cancelacion)) ? (
            <div className="space-y-3 border-t border-[#F0F0F2] px-4 py-4 dark:border-[#1F2A3C] sm:px-6">
              {direccion ? (
                <p className="flex min-w-0 items-start gap-2 text-[13px] text-[#3F3F46] dark:text-[#D6DEEA]">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#A1A1AA]" aria-hidden />
                  {direccionEsMapa ? (
                    <a
                      href={direccion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#1B5CFF] underline-offset-4 hover:underline dark:text-[#7FA2FF]"
                    >
                      Ver ubicación en Google Maps
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <span className="break-words">{direccion}</span>
                  )}
                </p>
              ) : null}
              {detalle.problematica ? (
                <details className="group rounded-xl bg-[#FAFAFA] px-3.5 py-2.5 dark:bg-[#0F172A]/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-[#27272A] dark:text-[#E5E7EB] [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 truncate">
                      <span className="text-[#71717A] dark:text-[#8EA0B8]">Problemática · </span>
                      <span className="font-normal group-open:hidden">{detalle.problematica}</span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-[#A1A1AA] transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[#3F3F46] dark:text-[#D6DEEA]">
                    {detalle.problematica}
                  </p>
                </details>
              ) : null}
              {statusKey === "cancelada" && detalle.motivo_cancelacion ? (
                <p className="rounded-xl bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
                  <span className="font-semibold">Motivo de cancelación:</span> {detalle.motivo_cancelacion}
                </p>
              ) : null}
            </div>
          ) : null}
        </header>

        {/* ============================ Documento ============================ */}
        <section
          aria-label="Documento PDF"
          className="cot-rise overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827]"
          style={{ "--cot-i": 1 } as CSSProperties}
        >
          <div className="flex items-center gap-3 border-b border-[#F0F0F2] px-4 py-3 dark:border-[#1F2A3C] sm:px-6">
            <span
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#C22B2B] ring-1 ring-inset ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]"
              aria-hidden
            >
              <FileText className="size-4.5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]" title={filename}>
                {filename}
              </p>
              <p className="flex items-center gap-1.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]" aria-live="polite">
                <span
                  className={`size-1.5 rounded-full ${
                    estado === "listo"
                      ? "bg-[#04724D] dark:bg-[#4ADE80]"
                      : estado === "error"
                        ? "bg-[#C22B2B] dark:bg-[#F87171]"
                        : "animate-pulse bg-[#1B5CFF]"
                  }`}
                  aria-hidden
                />
                {estado === "listo" ? "Listo" : estado === "error" ? "No se pudo generar" : "Generando…"}
              </p>
            </div>
            {estado === "listo" && (
              <button
                type="button"
                onClick={() => setShowMobilePreview((v) => !v)}
                aria-expanded={showMobilePreview}
                className={`${btnGhost} h-9! px-3! text-[13px]! sm:hidden`}
              >
                {showMobilePreview ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                {showMobilePreview ? "Ocultar" : "Vista previa"}
              </button>
            )}
          </div>

          {estado === "cargando" ? (
            <div className="flex justify-center bg-[#EDEEF1] px-3 py-6 dark:bg-[#0B1220] sm:px-8 sm:py-10" aria-busy="true" aria-label="Cargando documento">
              <div className="w-full max-w-[760px] rounded-md bg-white p-6 shadow-[0_18px_40px_-24px_rgba(9,9,11,0.45)] dark:bg-[#1B2539] sm:p-12">
                <div className="flex items-start justify-between gap-6">
                  <div className="h-10 w-28 animate-pulse rounded bg-[#E4E4E7] dark:bg-[#273244] sm:w-36" />
                  <div className="h-12 w-28 animate-pulse rounded bg-[#E4E4E7] dark:bg-[#273244] sm:w-40" />
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-2.5 w-20 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1F2A3C]" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-[#E4E4E7] dark:bg-[#273244]" />
                    </div>
                  ))}
                </div>
                <div className="mt-8 space-y-2.5">
                  {[92, 76, 84].map((w) => (
                    <div key={w} className="h-2.5 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1F2A3C]" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            </div>
          ) : estado === "listo" ? (
            <>
              {/* Celular: tarjeta de acceso; el visor incrustado es opcional */}
              {!showMobilePreview && (
                <div className="cot-fade flex flex-col items-center px-6 py-8 text-center sm:hidden">
                  <div className="relative h-24 w-20" aria-hidden>
                    <div className="absolute inset-0 rotate-[-6deg] rounded-lg bg-[#EEF3FF] dark:bg-[#1B2A63]/60" />
                    <div className="absolute inset-0 overflow-hidden rounded-lg bg-white shadow-[0_10px_24px_-12px_rgba(9,9,11,0.35)] ring-1 ring-[#E4E4E7] dark:ring-[#3A4661]">
                      <div className="h-2.5 bg-[#1B5CFF]" />
                      <div className="space-y-1.5 px-2.5 pt-3">
                        {[100, 80, 92, 64, 86].map((w, i) => (
                          <span key={i} className="block h-[3px] rounded-full bg-[#D4D4D8]" style={{ width: `${w}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="mt-5 text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">El PDF está listo</p>
                  <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">
                    Ábrelo en el visor de tu teléfono para leerlo cómodo, o descárgalo.
                  </p>
                  <a {...openLinkProps} className={`${btnPrimary} mt-5 h-11! w-full max-w-xs`}>
                    <ExternalLink className="size-4" aria-hidden />
                    Abrir PDF
                  </a>
                </div>
              )}
              <div className={`cot-fade bg-[#EDEEF1] dark:bg-[#0B1220] ${showMobilePreview ? "block" : "hidden sm:block"}`}>
                {/*
                  Solo iframe (como Órdenes/Proyectos). El <object data="blob…#toolbar=…">
                  hace que Chrome pida recursos internos `invalid/` y llene la consola
                  con net::ERR_FAILED aunque el PDF se vea.
                */}
                <iframe
                  key={pdfObjectUrl}
                  title="Vista previa del PDF"
                  aria-label={`Vista previa del PDF de la orden${folio ? ` ${folio}` : ""}`}
                  src={pdfObjectUrl ?? undefined}
                  className={viewerFrameClass}
                  onLoad={() => {
                    // El visor PDF de Chrome toma el foco al cargar y baja la página; se regresa arriba.
                    // (Mientras carga, el diálogo de progreso impide que el usuario se haya desplazado.)
                    window.scrollTo({ top: 0 });
                    window.setTimeout(() => window.scrollTo({ top: 0 }), 250);
                  }}
                />
              </div>
            </>
          ) : (
            <div className="cot-fade flex flex-col items-center px-6 py-14 text-center sm:py-20">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#C22B2B] ring-1 ring-inset ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]">
                <FileWarning className="size-6" strokeWidth={1.8} aria-hidden />
              </span>
              <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                {directDownload ? "No se pudo descargar el PDF" : "No se pudo generar el documento"}
              </h2>
              <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
                {alert.message || "Vuelve a intentarlo en unos segundos."}
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <button type="button" className={btnPrimary} onClick={() => setReloadKey((k) => k + 1)}>
                  <RotateCw className="size-4" aria-hidden />
                  Reintentar
                </button>
                <Link to={returnPath} className={btnSecondary}>
                  Ir a órdenes
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ============================ Barra de acciones (celular) ============================ */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E4E4E7] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-md dark:border-[#273244] dark:bg-[#111827]/95 sm:hidden">
          <div className="grid grid-cols-[auto_auto_1fr] gap-2">
            <button
              type="button"
              disabled={!puedeEnviarCorreo}
              onClick={abrirEnvio}
              className={`${btnSecondary} h-11! w-11! px-0!`}
              aria-label="Enviar por correo"
            >
              <Mail className="size-4.5" aria-hidden />
            </button>
            <a
              {...openLinkProps}
              aria-label="Abrir PDF"
              className={`${btnSecondary} h-11! w-11! px-0! ${!pdfDownloadUrl ? "pointer-events-none opacity-50" : ""}`}
            >
              <ExternalLink className="size-4.5" aria-hidden />
            </a>
            <button type="button" disabled={!pdfDownloadUrl} onClick={handleDownloadPdf} className={`${btnPrimary} h-11!`}>
              <Download className="size-4.5" aria-hidden />
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
