import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Modal } from "@/components/ui/modal";
import { TrashBinIcon } from "@/icons";
import { cn } from "@/lib/utils";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import {
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
} from "../OrdenesTrabajo/ordenTrabajoStyles";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpDangerBtnClass,
  erpHeroBlurClass,
  erpHeroHeadingClass,
  erpHeroIconWrapClass,
  erpInputLikeClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSecondaryBtnClass,
  osHeroBandClass,
  osHeroBodyClass,
  osHeroEyebrowClass,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { fetchOrdenesApi } from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import type { Orden } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import {
  createReporte,
  deleteReporteImage,
  getReporte,
  isReporteApiError,
  updateReporte,
} from "./reporteApi";
import { uploadReporteFile } from "./reporteImageUpload";
import {
  countReporteFotos,
  countSeccionFotos,
  emptyReporteDraft,
  newSeccion,
  type ReporteDraft,
  type ReporteSeccion,
} from "./reporteTypes";

/* -------------------------------------------------------------------------- */
/*  Tokens locales — lenguaje marino/azul, sobrio (igual que Órdenes)         */
/* -------------------------------------------------------------------------- */

const cardClass =
  "rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_4px_16px_-12px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827]";

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]";
const heading2Class = "text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC] sm:text-[17px]";
const helpTextClass = "text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]";

const iconBtnClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] disabled:pointer-events-none disabled:opacity-40 dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]";

type Accent = "orden" | "antes" | "despues";

const ACCENT: Record<Accent, { label: string; chip: string; ring: string; add: string }> = {
  orden: {
    label: "text-[#1244D1] dark:text-[#4B7CFF]",
    chip: "bg-[rgba(27,92,255,0.12)] text-[#1B5CFF] dark:text-[#4B7CFF]",
    ring: "ring-[rgba(27,92,255,0.25)]",
    add: "hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] hover:bg-[rgba(27,92,255,0.04)]",
  },
  antes: {
    label: "text-[#9A6B15] dark:text-[#E6A23C]",
    chip: "bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]",
    ring: "ring-[rgba(230,162,60,0.3)]",
    add: "hover:border-[#E6A23C]/60 hover:text-[#9A6B15] hover:bg-[rgba(230,162,60,0.06)]",
  },
  despues: {
    label: "text-emerald-700 dark:text-emerald-300",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/25",
    add: "hover:border-emerald-500/60 hover:text-emerald-700 hover:bg-emerald-500/[0.06]",
  },
};

/* -------------------------------------------------------------------------- */

function ordenLabel(o: Orden): string {
  const folio =
    (o.folio || "").trim() || formatDocumentFolio(FOLIO_SERIE.orden, o.idx || o.id);
  const cliente = (o.cliente || "").trim() || "Sin cliente";
  const fecha = (o.fecha_inicio || "").slice(0, 10);
  return fecha ? `${folio} · ${cliente} · ${fecha}` : `${folio} · ${cliente}`;
}

function tecnicoFromOrden(o: Orden): string {
  return (
    (o.tecnico_asignado_full_name || "").trim() ||
    (o.tecnico_asignado_username || "").trim() ||
    (o.quien_instalo_full_name || "").trim() ||
    ""
  );
}

type StepId = 1 | 2 | 3;

export default function ReporteMantenimientoEditorPage() {
  const { id: idParam } = useParams();
  const isNew = !idParam || idParam === "nuevo";
  const reporteId = !isNew ? Number(idParam) : null;
  const navigate = useNavigate();
  const titleId = useId();
  const ordenHintId = useId();
  const ordenErrorId = useId();
  const deleteSeccionTitleId = useId();

  const [draft, setDraft] = useState<ReporteDraft>(emptyReporteDraft);
  const [folio, setFolio] = useState("");
  const [ordenFolio, setOrdenFolio] = useState("");
  const [ordenCliente, setOrdenCliente] = useState("");
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [ordenError, setOrdenError] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [seccionToDelete, setSeccionToDelete] = useState<ReporteSeccion | null>(null);
  const [deletingSeccion, setDeletingSeccion] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>(1);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "warning" | "error";
    title: string;
    message: string;
  }>({ show: false, variant: "warning", title: "", message: "" });

  const showAlert = useCallback(
    (variant: "success" | "warning" | "error", title: string, message: string, ms = 3500) => {
      setAlert({ show: true, variant, title, message });
      window.setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), ms);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOrdenes(true);
      const rows = await fetchOrdenesApi(true);
      if (!cancelled) {
        setOrdenes(rows);
        setLoadingOrdenes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isNew || reporteId == null || !Number.isFinite(reporteId)) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const row = await getReporte(reporteId);
        if (cancelled) return;
        setFolio(row.folio || formatDocumentFolio(FOLIO_SERIE.reporte, row.idx));
        setOrdenFolio(row.orden_folio);
        setOrdenCliente(row.orden_cliente);
        setDraft({
          orden_id: row.orden_id != null ? String(row.orden_id) : "",
          fecha_servicio: row.fecha_servicio,
          tecnico_nombre: row.tecnico_nombre,
          foto_orden_url: row.foto_orden_url,
          secciones: row.secciones,
        });
      } catch (err) {
        if (!cancelled) {
          showAlert(
            "error",
            "Error al cargar",
            isReporteApiError(err) ? err.message : "No se pudo abrir el reporte.",
            5000
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, reporteId, showAlert]);

  const ordenOptions = useMemo(() => {
    const opts = ordenes.map((o) => ({ value: String(o.id), label: ordenLabel(o) }));
    if (
      draft.orden_id &&
      !opts.some((o) => o.value === draft.orden_id) &&
      (ordenFolio || ordenCliente)
    ) {
      opts.unshift({
        value: draft.orden_id,
        label: `${ordenFolio || `Orden #${draft.orden_id}`} · ${ordenCliente || "Cliente"}`,
      });
    }
    return opts;
  }, [ordenes, draft.orden_id, ordenFolio, ordenCliente]);

  const selectedOrden = useMemo(
    () => ordenes.find((o) => String(o.id) === draft.orden_id) || null,
    [ordenes, draft.orden_id]
  );

  const totalFotos = useMemo(() => countReporteFotos(draft.secciones), [draft.secciones]);

  const applyOrden = (ordenId: string) => {
    setOrdenError("");
    const o = ordenes.find((row) => String(row.id) === ordenId);
    if (!o) {
      setDraft((prev) => ({ ...prev, orden_id: ordenId }));
      return;
    }
    const folioOdt =
      (o.folio || "").trim() || formatDocumentFolio(FOLIO_SERIE.orden, o.idx || o.id);
    setOrdenFolio(folioOdt);
    setOrdenCliente((o.cliente || "").trim());
    setDraft((prev) => ({
      ...prev,
      orden_id: ordenId,
      fecha_servicio: (o.fecha_inicio || prev.fecha_servicio || "").slice(0, 10),
      tecnico_nombre: tecnicoFromOrden(o) || prev.tecnico_nombre,
    }));
  };

  const updateSeccion = (secId: string, patch: Partial<ReporteSeccion>) => {
    setDraft((prev) => ({
      ...prev,
      secciones: prev.secciones.map((s) => (s.id === secId ? { ...s, ...patch } : s)),
    }));
  };

  const moveSeccion = (secId: string, dir: -1 | 1) => {
    setDraft((prev) => {
      const idx = prev.secciones.findIndex((s) => s.id === secId);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.secciones.length) return prev;
      const copy = [...prev.secciones];
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return { ...prev, secciones: copy };
    });
  };

  const addSeccion = () => {
    setDraft((p) => ({ ...p, secciones: [...p.secciones, newSeccion()] }));
  };

  const setSeccionFoto = (secId: string, kind: "antes" | "despues", urls: string[]) => {
    setDraft((prev) => ({
      ...prev,
      secciones: prev.secciones.map((s) =>
        s.id === secId
          ? kind === "antes"
            ? { ...s, fotos_antes: urls }
            : { ...s, fotos_despues: urls }
          : s
      ),
    }));
  };

  const handleUploadSeccion = async (
    file: File | null | undefined,
    kind: "antes" | "despues",
    secId: string
  ) => {
    if (!file) return;
    setUploadingKey(`${kind}-${secId}`);
    try {
      const url = await uploadReporteFile(file);
      setSeccionFoto(secId, kind, [url]);
      showAlert("success", "Imagen subida", "La foto se adjuntó correctamente.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isReporteApiError(err)
            ? err.message
            : "No se pudo subir la imagen.";
      showAlert("error", "Error al subir", message, 5000);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleUploadFotoOrden = async (file: File | null | undefined) => {
    if (!file) return;
    setUploadingKey("foto-orden");
    try {
      const url = await uploadReporteFile(file);
      setDraft((prev) => ({ ...prev, foto_orden_url: url }));
      showAlert("success", "Imagen subida", "La foto de la orden se adjuntó correctamente.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isReporteApiError(err)
            ? err.message
            : "No se pudo subir la imagen.";
      showAlert("error", "Error al subir", message, 5000);
    } finally {
      setUploadingKey(null);
    }
  };

  const confirmDeleteSeccion = async () => {
    if (!seccionToDelete) return;
    const target = seccionToDelete;
    const urls = [...target.fotos_antes, ...target.fotos_despues]
      .map((u) => u.trim())
      .filter(Boolean);
    setDeletingSeccion(true);
    try {
      const results = await Promise.allSettled(urls.map((url) => deleteReporteImage(url)));
      const failed = results.filter((r) => r.status === "rejected").length;
      setDraft((prev) => ({
        ...prev,
        secciones: prev.secciones.filter((s) => s.id !== target.id),
      }));
      setSeccionToDelete(null);
      if (failed > 0) {
        showAlert(
          "warning",
          "Zona eliminada",
          `Se quitó la zona, pero ${failed} imagen${failed === 1 ? "" : "es"} no se pudo borrar de Cloudinary.`,
          5000
        );
      } else {
        showAlert(
          "success",
          "Zona eliminada",
          urls.length > 0 ? "Se eliminó la zona y sus imágenes." : "Se eliminó la zona."
        );
      }
    } catch (err) {
      showAlert(
        "error",
        "No se pudo eliminar",
        isReporteApiError(err) ? err.message : "Inténtalo de nuevo.",
        5000
      );
    } finally {
      setDeletingSeccion(false);
    }
  };

  const validate = (): StepId | null => {
    if (!draft.orden_id) {
      setOrdenError("Selecciona una orden de servicio del listado.");
      showAlert("warning", "Falta la orden", "Vincula una orden de trabajo.");
      return 1;
    }
    if (!draft.fecha_servicio) {
      showAlert("warning", "Falta la fecha", "Indica la fecha de servicio.");
      return 2;
    }
    if (!draft.tecnico_nombre.trim()) {
      showAlert("warning", "Falta el técnico", "Indica el nombre del técnico.");
      return 2;
    }
    return null;
  };

  const handleSave = async () => {
    const failStep = validate();
    if (failStep) {
      setActiveStep(failStep);
      return;
    }
    setSaving(true);
    try {
      const saved =
        isNew || reporteId == null
          ? await createReporte(draft)
          : await updateReporte(reporteId, draft);
      navigate("/reportes-mantenimiento", {
        replace: true,
        state: {
          flash: {
            variant: "success",
            title: isNew ? "Reporte guardado" : "Reporte actualizado",
            message: `${saved.folio} se ${isNew ? "creó" : "guardó"} correctamente.`,
          },
        },
      });
    } catch (err) {
      showAlert(
        "error",
        "No se pudo guardar",
        isReporteApiError(err) ? err.message : "Revisa los datos e inténtalo de nuevo.",
        5000
      );
    } finally {
      setSaving(false);
    }
  };

  const formBusy = loading || saving;
  const pageTitle = isNew ? "Nuevo reporte" : folio ? `Editar ${folio}` : "Editar reporte";

  const steps: { id: StepId; label: string; hint: string; done: boolean }[] = [
    { id: 1, label: "Orden de trabajo", hint: "Vincula la ODT", done: Boolean(draft.orden_id) },
    {
      id: 2,
      label: "Datos del servicio",
      hint: "Fecha y técnico",
      done: Boolean(draft.fecha_servicio && draft.tecnico_nombre.trim()),
    },
    {
      id: 3,
      label: "Evidencia",
      hint:
        draft.secciones.length > 0
          ? `${draft.secciones.length} ${draft.secciones.length === 1 ? "zona" : "zonas"} · ${totalFotos} fotos`
          : "Antes / Después",
      done: draft.secciones.length > 0,
    },
  ];
  const requiredDone = [
    Boolean(draft.orden_id),
    Boolean(draft.fecha_servicio),
    Boolean(draft.tecnico_nombre.trim()),
  ].filter(Boolean).length;
  const pct = Math.round((requiredDone / 3) * 100);

  const currentStep = steps.find((s) => s.id === activeStep) ?? steps[0];

  /* ---------------------------------------------------------------- */
  /*  Paneles de cada paso                                            */
  /* ---------------------------------------------------------------- */

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
        <div>
          <SearchableSelect
            id="rm-elegir-orden"
            label="Elegir orden"
            required
            value={draft.orden_id}
            onChange={applyOrden}
            options={ordenOptions}
            placeholder={loadingOrdenes ? "Cargando…" : "Buscar folio, cliente o fecha"}
            filterLocally
            invalid={Boolean(ordenError)}
            describedBy={ordenError ? ordenErrorId : ordenHintId}
          />
          {ordenError ? (
            <p id={ordenErrorId} className="mt-1.5 text-xs text-[#C22B2B]" role="alert">
              {ordenError}
            </p>
          ) : (
            <p id={ordenHintId} className="mt-1.5 text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
              Al vincularla se rellenan fecha y técnico si la orden los trae.
            </p>
          )}

          {draft.orden_id ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[rgba(27,92,255,0.22)] bg-[rgba(27,92,255,0.05)] px-4 py-3 dark:border-[#4B7CFF]/25 dark:bg-[rgba(75,124,255,0.08)]">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1244D1] dark:text-[#4B7CFF]">
                  Orden vinculada
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                  {ordenFolio || (selectedOrden ? ordenLabel(selectedOrden) : "—")}
                </p>
                <p className="truncate text-xs text-[#52525B] dark:text-[#B7C1D1]">
                  {ordenCliente || selectedOrden?.cliente || "—"}
                </p>
              </div>
              <Link
                to={`/ordenes/${draft.orden_id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className={cn(erpSecondaryBtnClass, "h-9 w-auto shrink-0 px-3 text-xs")}
              >
                Ver orden PDF
              </Link>
            </div>
          ) : null}
        </div>

        <div>
          <p className={labelClass}>Imagen de la orden (opcional)</p>
          <SinglePhoto
            accent="orden"
            title="Orden"
            url={draft.foto_orden_url}
            busy={uploadingKey === "foto-orden"}
            onPick={(file) => void handleUploadFotoOrden(file)}
            onClear={() => setDraft((prev) => ({ ...prev, foto_orden_url: "" }))}
          />
          <p className="mt-1.5 text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
            Aparece en el PDF junto a los datos de la orden.
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="rm-fecha" className={labelClass}>
          Fecha de servicio <span className="text-[#C22B2B]">*</span>
        </label>
        <input
          id="rm-fecha"
          type="date"
          className={erpInputLikeClass}
          value={draft.fecha_servicio}
          onChange={(e) => setDraft((p) => ({ ...p, fecha_servicio: e.target.value }))}
          required
        />
      </div>
      <div>
        <label htmlFor="rm-tecnico" className={labelClass}>
          Técnico <span className="text-[#C22B2B]">*</span>
        </label>
        <input
          id="rm-tecnico"
          type="text"
          className={erpInputLikeClass}
          placeholder="Nombre del técnico"
          value={draft.tecnico_nombre}
          onChange={(e) => setDraft((p) => ({ ...p, tecnico_nombre: e.target.value }))}
          required
          autoComplete="name"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={helpTextClass}>
          Una zona por área (Cámara entrada, DVR, Patio…). Una foto Antes y una Después por zona.
        </p>
        {draft.secciones.length > 0 ? (
          <button
            type="button"
            className={cn(erpPrimaryBtnClass, "h-9 w-auto shrink-0 px-3.5 text-xs")}
            onClick={addSeccion}
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Agregar zona
          </button>
        ) : null}
      </div>

      {draft.secciones.length === 0 ? (
        <button
          type="button"
          onClick={addSeccion}
          className="flex w-full flex-col items-center gap-2 rounded-[16px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-4 py-10 text-center transition-colors hover:border-[#1B5CFF]/50 hover:bg-[rgba(27,92,255,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] dark:border-[#3A4661] dark:bg-[#1B2539]"
        >
          <span className="inline-flex size-12 items-center justify-center rounded-[14px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10.5" r="1.5" />
              <path d="M21 15l-4.5-4.5L9 18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Crear primera zona</span>
          <span className="text-xs text-[#6E6E77] dark:text-[#8EA0B8]">Cámara entrada · DVR · Patio…</span>
        </button>
      ) : (
        <>
          <ul className="space-y-4">
            {draft.secciones.map((sec, index) => (
              <li
                key={sec.id}
                className="overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]"
              >
                <div className="border-b border-[#E7E7EA] bg-[#FAFAFA] px-3 py-2.5 dark:border-[#273244] dark:bg-[#151E32]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-[#1B5CFF] font-mono text-[11px] font-semibold text-white dark:bg-[#4B7CFF]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <input
                      type="text"
                      className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-[#09090B] outline-none transition-colors placeholder:font-normal placeholder:text-[#A1A1AA] hover:border-[#E7E7EA] hover:bg-white focus:border-[#1B5CFF] focus:bg-white dark:text-[#F8FAFC] dark:hover:border-[#273244] dark:hover:bg-[#0f172a] dark:focus:bg-[#0f172a]"
                      placeholder={`Zona ${index + 1} — ej. Cámara entrada`}
                      value={sec.titulo}
                      onChange={(e) => updateSeccion(sec.id, { titulo: e.target.value })}
                      aria-label={`Título de la zona ${index + 1}`}
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className={iconBtnClass}
                        aria-label={`Subir zona ${index + 1}`}
                        disabled={index === 0}
                        onClick={() => moveSeccion(sec.id, -1)}
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={iconBtnClass}
                        aria-label={`Bajar zona ${index + 1}`}
                        disabled={index === draft.secciones.length - 1}
                        onClick={() => moveSeccion(sec.id, 1)}
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={cn(iconBtnClass, "hover:border-rose-400 hover:text-rose-600 dark:hover:border-rose-500/60 dark:hover:text-rose-400")}
                        aria-label={`Eliminar zona ${index + 1}`}
                        onClick={() => setSeccionToDelete(sec)}
                      >
                        <TrashBinIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 pl-9">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        sec.fotos_antes[0]
                          ? "bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]"
                          : "bg-[#F4F4F5] text-[#A1A1AA] dark:bg-white/[0.06] dark:text-[#6E6E77]"
                      )}
                    >
                      {sec.fotos_antes[0] ? "Antes ✓" : "Antes —"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        sec.fotos_despues[0]
                          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                          : "bg-[#F4F4F5] text-[#A1A1AA] dark:bg-white/[0.06] dark:text-[#6E6E77]"
                      )}
                    >
                      {sec.fotos_despues[0] ? "Después ✓" : "Después —"}
                    </span>
                  </div>
                </div>

                <div className="relative grid gap-4 p-3 sm:grid-cols-2 sm:gap-5 sm:p-4">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-4 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-[rgba(230,162,60,0.5)] via-[#E7E7EA] to-emerald-400/50 sm:block dark:via-[#273244]"
                  />
                  <SinglePhoto
                    accent="antes"
                    title="Antes"
                    header
                    url={sec.fotos_antes[0] || ""}
                    busy={uploadingKey === `antes-${sec.id}`}
                    onPick={(file) => void handleUploadSeccion(file, "antes", sec.id)}
                    onClear={() => setSeccionFoto(sec.id, "antes", [])}
                  />
                  <SinglePhoto
                    accent="despues"
                    title="Después"
                    header
                    url={sec.fotos_despues[0] || ""}
                    busy={uploadingKey === `despues-${sec.id}`}
                    onPick={(file) => void handleUploadSeccion(file, "despues", sec.id)}
                    onClear={() => setSeccionFoto(sec.id, "despues", [])}
                  />
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={addSeccion}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] py-3 text-[13px] font-semibold text-[#52525B] transition-colors hover:border-[#1B5CFF]/50 hover:bg-[rgba(27,92,255,0.04)] hover:text-[#1B5CFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] dark:border-[#3A4661] dark:bg-[#1B2539] dark:text-[#B7C1D1]"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Agregar otra zona
          </button>
        </>
      )}
    </div>
  );

  const saveBtn = (extra?: string) => (
    <button
      type="button"
      className={cn(
        erpPrimaryBtnClass,
        "h-11 w-full gap-2 shadow-[0_6px_16px_-8px_rgba(27,92,255,0.45)]",
        extra
      )}
      disabled={formBusy}
      onClick={() => void handleSave()}
    >
      {saving ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          aria-hidden
        />
      ) : (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path
            d={isNew ? "M12 5v14M5 12h14" : "M20 6 9 17l-5-5"}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {saving ? "Guardando…" : isNew ? "Crear reporte" : "Guardar cambios"}
    </button>
  );

  return (
    <div className={erpPageCanvasClass} style={erpSansStyle}>
      <div className={erpPageInnerClass}>
        <PageMeta
          title={`${isNew ? "Nuevo" : folio || "Editar"} reporte | Operación`}
          description="Editor de reporte de mantenimiento"
        />

        {alert.show ? (
          <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
        ) : null}

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
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">
            {isNew ? "Nuevo" : folio || "Editar"}
          </span>
        </nav>

        {/* Hero marino compacto */}
        <header className={cn(osHeroBandClass, "!py-5 sm:!py-6")}>
          <div className={erpHeroBlurClass} aria-hidden />
          <div className="relative flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <span className={erpHeroIconWrapClass} aria-hidden>
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path
                    d="M4 19V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M13 3v5h5M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className={osHeroEyebrowClass}>{isNew ? "Nuevo · Operación" : "Editar · Operación"}</p>
                <h1 id={titleId} className={`mt-0.5 ${erpHeroHeadingClass}`}>
                  {pageTitle}
                </h1>
                <p className={cn(osHeroBodyClass, "hidden sm:block")}>
                  Completa los 3 pasos: orden, datos de la visita y evidencia Antes / Después.
                </p>
              </div>
            </div>
            <Link
              to="/reportes-mantenimiento"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-white/10 px-3 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Volver al listado de reportes"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Volver</span>
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]" aria-hidden>
            <div className={cn(cardClass, "h-64 animate-pulse")} />
            <div className={cn(cardClass, "h-80 animate-pulse")} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
            {/* -------------------------------------------------------- */}
            {/*  RAIL — pasos + progreso + acciones                      */}
            {/* -------------------------------------------------------- */}
            <aside className="lg:sticky lg:top-6">
              <div className={cn(cardClass, "p-4")}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E77] dark:text-[#8EA0B8]">
                    Progreso
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                    {requiredDone}/3
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EDEDED] dark:bg-[#273244]"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-[#1B5CFF] transition-[width] duration-300 dark:bg-[#4B7CFF]"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <nav className="mt-4 space-y-1" aria-label="Pasos del formulario">
                  {steps.map((s) => {
                    const active = s.id === activeStep;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-current={active ? "step" : undefined}
                        onClick={() => setActiveStep(s.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors",
                          active
                            ? "bg-[rgba(27,92,255,0.08)] dark:bg-[rgba(75,124,255,0.12)]"
                            : "hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                            s.done
                              ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
                              : active
                                ? "border-2 border-[#1B5CFF] text-[#1B5CFF] dark:border-[#4B7CFF] dark:text-[#4B7CFF]"
                                : "border border-[#D3D3D8] text-[#6E6E77] dark:border-[#3A4661] dark:text-[#8EA0B8]"
                          )}
                        >
                          {s.done ? (
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            s.id
                          )}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block text-[13px] font-semibold",
                              active
                                ? "text-[#09090B] dark:text-[#F8FAFC]"
                                : "text-[#52525B] dark:text-[#B7C1D1]"
                            )}
                          >
                            {s.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
                            {s.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-4 hidden space-y-2 border-t border-[#E7E7EA] pt-4 dark:border-[#273244] lg:block">
                  {/* sm:w-full anula sm:w-auto de erp*BtnClass en el rail estrecho */}
                  {saveBtn("sm:w-full sm:min-h-[44px]")}
                  <Link
                    to="/reportes-mantenimiento"
                    className={cn(
                      erpSecondaryBtnClass,
                      "h-11 w-full gap-1.5 sm:w-full sm:min-h-[44px]"
                    )}
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                    </svg>
                    Cancelar
                  </Link>
                  {!isNew && reporteId != null ? (
                    <Link
                      to={`/reportes-mantenimiento/${reporteId}/pdf`}
                      state={{ from: `/reportes-mantenimiento/${reporteId}` }}
                      className={cn(
                        erpSecondaryBtnClass,
                        "h-11 w-full gap-1.5 sm:w-full sm:min-h-[44px]"
                      )}
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M14 3v6h6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Ver PDF
                    </Link>
                  ) : null}
                </div>
              </div>
            </aside>

            {/* -------------------------------------------------------- */}
            {/*  PANE — contenido del paso activo                        */}
            {/* -------------------------------------------------------- */}
            <div className={cn(cardClass, "min-w-0 p-4 sm:p-6")}>
              <div className="flex items-start gap-3 border-b border-[#E7E7EA] pb-4 dark:border-[#273244]">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgba(27,92,255,0.10)] text-sm font-semibold text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                  {currentStep.id}
                </span>
                <div className="min-w-0">
                  <h2 className={heading2Class}>{currentStep.label}</h2>
                  <p className={cn(helpTextClass, "mt-0.5")}>
                    {currentStep.id === 1
                      ? "Vincula la orden de servicio; opcionalmente adjunta una imagen de la ODT."
                      : currentStep.id === 2
                        ? "Fecha y técnico responsables del mantenimiento."
                        : "Sube una foto Antes y una Después en cada zona intervenida."}
                  </p>
                </div>
              </div>

              <div className="pt-5">
                {activeStep === 1 && renderStep1()}
                {activeStep === 2 && renderStep2()}
                {activeStep === 3 && renderStep3()}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#E7E7EA] pt-4 dark:border-[#273244]">
                {activeStep > 1 ? (
                  <button
                    type="button"
                    className={cn(erpSecondaryBtnClass, "h-9 w-auto px-3.5 text-xs")}
                    onClick={() => setActiveStep((s) => (s - 1) as StepId)}
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Anterior
                  </button>
                ) : (
                  <span />
                )}
                {activeStep < 3 ? (
                  <button
                    type="button"
                    className={cn(erpSecondaryBtnClass, "h-9 w-auto px-3.5 text-xs")}
                    onClick={() => setActiveStep((s) => (s + 1) as StepId)}
                  >
                    Siguiente
                    <svg className="size-4 text-[#1B5CFF] dark:text-[#4B7CFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <span className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
                    Guarda desde el panel lateral
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Guardar fijo en móvil */}
        {!loading ? (
          <div className="sticky bottom-3 z-30 lg:hidden">
            <div className="flex gap-2 rounded-[16px] border border-[#E7E7EA] bg-white/95 p-2.5 shadow-[0_16px_40px_-16px_rgba(9,9,11,0.28)] backdrop-blur dark:border-[#273244] dark:bg-[#111827]/95">
              <Link
                to="/reportes-mantenimiento"
                className={cn(
                  erpSecondaryBtnClass,
                  "h-11 min-h-[44px] w-auto flex-1 gap-1.5"
                )}
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
                Cancelar
              </Link>
              {saveBtn("w-auto flex-1 sm:min-h-[44px]")}
            </div>
          </div>
        ) : null}

        {/* Modal eliminar zona */}
        <Modal
          isOpen={Boolean(seccionToDelete)}
          onClose={() => {
            if (!deletingSeccion) setSeccionToDelete(null);
          }}
          className={erpDeleteModalClass}
          ariaLabelledBy={deleteSeccionTitleId}
          closeOnBackdropClick={!deletingSeccion}
          closeOnEscape={!deletingSeccion}
          showCloseButton={!deletingSeccion}
        >
          <div className={erpDeleteModalPanelClass}>
            <div className="flex flex-col items-center text-center">
              <span
                className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/20"
                aria-hidden
              >
                {deletingSeccion ? (
                  <span
                    className="h-6 w-6 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600 dark:border-rose-900 dark:border-t-rose-400"
                    aria-hidden
                  />
                ) : (
                  <TrashBinIcon className="h-6 w-6" />
                )}
              </span>
              <h3 id={deleteSeccionTitleId} className="text-base font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                Eliminar zona
              </h3>
              <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-[#52525B] dark:text-[#94a3b8]">
                {deletingSeccion ? (
                  "Por favor espera; se están borrando las imágenes…"
                ) : (
                  <>
                    ¿Eliminar{" "}
                    <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                      {seccionToDelete?.titulo.trim() || "esta zona"}
                    </span>
                    {seccionToDelete && countSeccionFotos(seccionToDelete) > 0
                      ? ` y sus ${countSeccionFotos(seccionToDelete)} foto${countSeccionFotos(seccionToDelete) === 1 ? "" : "s"} de Cloudinary`
                      : ""}
                    ? Esta acción no se puede deshacer.
                  </>
                )}
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
              <button
                type="button"
                className={`${erpSecondaryBtnClass} sm:min-w-[8rem]`}
                disabled={deletingSeccion}
                onClick={() => setSeccionToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${erpDangerBtnClass} sm:min-w-[8rem]`}
                disabled={deletingSeccion}
                aria-busy={deletingSeccion || undefined}
                onClick={() => void confirmDeleteSeccion()}
              >
                {deletingSeccion ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponentes                                                            */
/* -------------------------------------------------------------------------- */

function SinglePhoto({
  accent,
  title,
  url,
  busy,
  header = false,
  onPick,
  onClear,
}: {
  accent: Accent;
  title: string;
  url: string;
  busy: boolean;
  header?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const a = ACCENT[accent];
  const isAntes = accent === "antes";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
        if (file && !busy) onPick(file);
      }}
      className={cn(
        "transition-colors",
        header &&
          cn(
            "rounded-[14px] border p-3 dark:bg-[#111827]",
            dragOver
              ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.04)] dark:border-[#4B7CFF]"
              : "border-[#E7E7EA] bg-white dark:border-[#273244]"
          )
      )}
    >
      {header ? (
        <div className="mb-2.5 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
              a.label
            )}
          >
            <span className={cn("inline-flex size-5 items-center justify-center rounded-[6px]", a.chip)} aria-hidden>
              {isAntes ? (
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                  <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden>
                  <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {title}
          </span>
          {url ? (
            <button
              type="button"
              className="text-[11px] font-medium text-rose-600 hover:underline disabled:opacity-60 dark:text-rose-400"
              onClick={onClear}
              disabled={busy}
            >
              Quitar
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />

      {url ? (
        <div className={cn("group relative overflow-hidden rounded-[10px] ring-1", a.ring)}>
          <img
            src={url}
            alt={title}
            className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-black/60 to-transparent p-2">
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-[8px] bg-white/95 px-2 text-[11px] font-medium text-[#09090B] shadow-sm hover:bg-white disabled:opacity-60"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "…" : "Cambiar"}
            </button>
            {!header ? (
              <button
                type="button"
                className="inline-flex h-7 items-center rounded-[8px] bg-white/95 px-2 text-[11px] font-medium text-rose-600 shadow-sm hover:bg-white disabled:opacity-60"
                disabled={busy}
                onClick={onClear}
              >
                Quitar
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] text-[12px] text-[#6E6E77] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] disabled:opacity-60 dark:border-[#3A4661] dark:bg-[#1B2539] dark:text-[#8EA0B8]",
            a.add
          )}
        >
          {busy ? (
            <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          ) : (
            <span className={cn("inline-flex size-8 items-center justify-center rounded-[9px]", a.chip)} aria-hidden>
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </span>
          )}
          <span className="font-medium">
            {busy ? "Subiendo…" : header ? `Subir ${title.toLowerCase()}` : "Subir imagen"}
          </span>
          {!busy ? (
            <span className="text-[10px] text-[#A1A1AA] dark:text-[#6E6E77]">o arrastra aquí</span>
          ) : null}
        </button>
      )}
    </div>
  );
}
