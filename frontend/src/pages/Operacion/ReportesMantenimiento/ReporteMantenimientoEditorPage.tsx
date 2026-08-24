import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Modal } from "@/components/ui/modal";
import { TrashBinIcon } from "@/icons";
import { cn } from "@/lib/utils";
import {
  erpInputLikeClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSecondaryBtnClass,
} from "@/layout/erpPageStyles";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import {
  claudeBodyClass,
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpHeroBlurClass,
  erpHeroGradientClass,
  erpHeroHeadingClass,
  erpHeroIconWrapClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  pageCardShellClass,
  sectionLabelOrangeClass,
} from "../OrdenesTrabajo/ordenTrabajoStyles";
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
  countSeccionFotos,
  emptyReporteDraft,
  newSeccion,
  type ReporteDraft,
  type ReporteSeccion,
} from "./reporteTypes";

const labelClass =
  "mb-1.5 block text-xs font-medium text-[#57534e] dark:text-[#cbd5e1]";

const sectionShellClass = cn(
  pageCardShellClass,
  "border-[#e7ded0] bg-[#fffdfa]/95 p-4 sm:p-5 dark:border-[#273244] dark:bg-[#111a2b]/90"
);

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

export default function ReporteMantenimientoEditorPage() {
  const { id: idParam } = useParams();
  const isNew = !idParam || idParam === "nuevo";
  const reporteId = !isNew ? Number(idParam) : null;
  const navigate = useNavigate();
  const titleId = useId();
  const ordenHintId = useId();
  const ordenErrorId = useId();
  const seccionesHintId = useId();
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
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "warning" | "error";
    title: string;
    message: string;
  }>({ show: false, variant: "warning", title: "", message: "" });

  const showAlert = useCallback(
    (variant: "success" | "warning" | "error", title: string, message: string) => {
      setAlert({ show: true, variant, title, message });
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
            isReporteApiError(err) ? err.message : "No se pudo abrir el reporte."
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

  const handleUpload = async (
    file: File | null | undefined,
    kind: "antes" | "despues",
    secId: string
  ) => {
    if (!file) return;
    const key = `${kind}-${secId}`;
    setUploadingKey(key);
    try {
      const url = await uploadReporteFile(file);
      setDraft((prev) => ({
        ...prev,
        secciones: prev.secciones.map((s) => {
          if (s.id !== secId) return s;
          return kind === "antes"
            ? { ...s, fotos_antes: [url] }
            : { ...s, fotos_despues: [url] };
        }),
      }));
      showAlert("success", "Imagen subida", "La foto se adjuntó correctamente.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isReporteApiError(err)
            ? err.message
            : "No se pudo subir la imagen.";
      showAlert("error", "Error al subir", message);
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
      showAlert("error", "Error al subir", message);
    } finally {
      setUploadingKey(null);
    }
  };

  const clearFotoOrden = () => {
    setDraft((prev) => ({ ...prev, foto_orden_url: "" }));
  };

  const clearFoto = (secId: string, kind: "antes" | "despues") => {
    setDraft((prev) => ({
      ...prev,
      secciones: prev.secciones.map((s) => {
        if (s.id !== secId) return s;
        return kind === "antes"
          ? { ...s, fotos_antes: [] }
          : { ...s, fotos_despues: [] };
      }),
    }));
  };

  const confirmDeleteSeccion = async () => {
    if (!seccionToDelete) return;
    const target = seccionToDelete;
    const urls = [...target.fotos_antes, ...target.fotos_despues].map((u) => u.trim()).filter(Boolean);
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
          "Sección eliminada",
          `Se quitó la sección, pero ${failed} imagen${failed === 1 ? "" : "es"} no se pudo borrar de Cloudinary.`
        );
      } else {
        showAlert(
          "success",
          "Sección eliminada",
          urls.length > 0
            ? "Se eliminó la sección y sus imágenes."
            : "Se eliminó la sección."
        );
      }
    } catch (err) {
      showAlert(
        "error",
        "No se pudo eliminar",
        isReporteApiError(err) ? err.message : "Inténtalo de nuevo."
      );
    } finally {
      setDeletingSeccion(false);
    }
  };

  const validate = (): boolean => {
    if (!draft.orden_id) {
      setOrdenError("Selecciona una orden de servicio del listado.");
      showAlert("warning", "Falta la orden", "Adjunta una orden de trabajo desde el listado.");
      return false;
    }
    if (!draft.fecha_servicio) {
      showAlert("warning", "Falta la fecha", "Indica la fecha de servicio.");
      return false;
    }
    if (!draft.tecnico_nombre.trim()) {
      showAlert("warning", "Falta el técnico", "Indica el nombre del técnico.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isNew || reporteId == null) {
        const created = await createReporte(draft);
        setFolio(created.folio);
        setOrdenFolio(created.orden_folio);
        setOrdenCliente(created.orden_cliente);
        showAlert("success", "Reporte guardado", `${created.folio} se creó correctamente.`);
        navigate(`/reportes-mantenimiento/${created.id}`, { replace: true });
      } else {
        const updated = await updateReporte(reporteId, draft);
        setFolio(updated.folio);
        setOrdenFolio(updated.orden_folio);
        setOrdenCliente(updated.orden_cliente);
        showAlert("success", "Reporte actualizado", `${updated.folio} se guardó correctamente.`);
      }
    } catch (err) {
      showAlert(
        "error",
        "No se pudo guardar",
        isReporteApiError(err) ? err.message : "Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  const addSeccion = () => {
    setDraft((p) => ({ ...p, secciones: [...p.secciones, newSeccion()] }));
  };

  const formBusy = loading || saving;

  return (
    <div className={erpPageCanvasClass}>
      <div className={erpPageInnerClass} style={erpSansStyle}>
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
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <Link to="/reportes-mantenimiento" className={erpBreadcrumbLinkClass}>
            Reporte de mantenimiento
          </Link>
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <span className="text-[#44403c] dark:text-[#cbd5e1]">{isNew ? "Nuevo" : folio || "Editar"}</span>
        </nav>

        <header className={`relative flex w-full flex-col gap-4 ${pageCardShellClass} p-4 sm:p-6`}>
          <div className={erpHeroBlurClass} />
          <div className="relative z-[1] flex min-w-0 items-start justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className={erpHeroIconWrapClass}>
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  aria-hidden
                >
                  <path
                    d="M4 19V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M13 3v5h5M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className={sectionLabelOrangeClass}>Operación</p>
                <h1 id={titleId} className={`mt-0.5 ${erpHeroHeadingClass}`}>
                  {isNew ? "Nuevo reporte" : folio ? `Editar ${folio}` : "Editar reporte"}
                </h1>
                <p className={`mt-1 max-w-2xl ${claudeBodyClass}`}>
                  Orden de servicio, datos de la visita y evidencia Antes / Después.
                </p>
                <div className={erpHeroGradientClass} />
              </div>
            </div>
            <Link
              to="/reportes-mantenimiento"
              className={cn(erpSecondaryBtnClass, "h-10 shrink-0 gap-1.5 px-3")}
              aria-label="Volver al listado de reportes"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Volver</span>
            </Link>
          </div>
        </header>

        <fieldset disabled={loading} className="min-w-0 space-y-5 border-0 p-0 sm:space-y-6">
          <legend className="sr-only">Formulario del reporte</legend>

        <section className={sectionShellClass} aria-labelledby="rm-orden-heading">
          <h2 id="rm-orden-heading" className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">
            Orden de trabajo
          </h2>
          <p className="mt-0.5 text-sm text-[#78716c] dark:text-[#8ea0b8]">
            Vincula la ODT y, si quieres, adjunta una imagen de la orden al reporte.
          </p>
          <div className="mt-4">
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
              <p id={ordenErrorId} className="mt-1.5 text-xs text-[#c64545]" role="alert">
                {ordenError}
              </p>
            ) : (
              <p id={ordenHintId} className="mt-1.5 text-xs text-[#78716c] dark:text-[#8ea0b8]">
                Al elegirla se rellenan fecha y técnico si la orden los trae.
              </p>
            )}
          </div>
          {draft.orden_id ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 dark:border-[#273244] dark:bg-[#0f172a]/55">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716c]">
                  Orden vinculada
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                  {ordenFolio || (selectedOrden ? ordenLabel(selectedOrden) : "—")}
                </p>
                <p className="truncate text-xs text-[#57534e] dark:text-[#cbd5e1]">
                  {ordenCliente || selectedOrden?.cliente || "—"}
                </p>
              </div>
              <Link
                to={`/ordenes/${draft.orden_id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className={cn(erpSecondaryBtnClass, "min-h-10 w-auto shrink-0")}
              >
                Ver orden PDF
              </Link>
            </div>
          ) : null}
          <div className="mt-4 max-w-xs">
            <p className={labelClass}>Imagen de la orden (opcional)</p>
            <PhotoSlot
              label="Orden"
              url={draft.foto_orden_url}
              busy={uploadingKey === "foto-orden"}
              onPick={(file: File) => void handleUploadFotoOrden(file)}
              onClear={clearFotoOrden}
            />
            <p className="mt-1.5 text-xs text-[#78716c] dark:text-[#8ea0b8]">
              Aparece en el PDF junto a los datos de la orden vinculada.
            </p>
          </div>
        </section>

        <section className={sectionShellClass} aria-labelledby="rm-datos-heading">
          <h2 id="rm-datos-heading" className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">
            Datos del servicio
          </h2>
          <p className="mt-0.5 text-sm text-[#78716c] dark:text-[#8ea0b8]">
            Fecha y técnico responsables del mantenimiento.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rm-fecha" className={labelClass}>
                Fecha de servicio <span className="text-[#c64545]">*</span>
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
                Técnico <span className="text-[#c64545]">*</span>
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
        </section>

        <section
          className={sectionShellClass}
          aria-labelledby="rm-secciones-heading"
          aria-describedby={seccionesHintId}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="rm-secciones-heading" className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                Evidencia Antes / Después
              </h2>
              <p className="mt-0.5 text-sm text-[#78716c] dark:text-[#8ea0b8]">
                Una sección por zona: Cámara entrada, DVR, Patio…
              </p>
            </div>
            <button
              type="button"
              className={cn(erpPrimaryBtnClass, "min-h-10 w-auto shrink-0")}
              onClick={addSeccion}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Agregar sección
            </button>
          </div>
          <p id={seccionesHintId} className="mt-1 text-xs text-[#78716c] dark:text-[#8ea0b8]">
            Una foto Antes y una Después por zona.
          </p>

          {draft.secciones.length === 0 ? (
            <button
              type="button"
              onClick={addSeccion}
              className="mt-4 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-[#d6d3d1] bg-[#fcfaf6]/80 px-4 py-10 text-center transition hover:border-[#ff801f]/45 hover:bg-[#fff8f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f] dark:border-[#334155] dark:bg-[#0f172a]/40"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3e6] text-[#c2410c] ring-1 ring-[#ff801f]/25 dark:bg-[#fb923c]/15 dark:text-[#fdba74]">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8.5" cy="10.5" r="1.5" />
                  <path d="M21 15l-4.5-4.5L9 18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                Crear primera sección
              </span>
              <span className="text-xs text-[#78716c]">Cámara entrada · DVR · Patio…</span>
            </button>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {draft.secciones.map((sec, index) => (
                <li
                  key={sec.id}
                  className="overflow-hidden rounded-2xl border border-[#efe6d8] bg-gradient-to-br from-[#fcfaf6] to-[#fffdfa] dark:border-[#273244] dark:from-[#0f172a]/70 dark:to-[#111a2b]/80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#efe6d8]/90 bg-white/50 px-3 py-2 dark:border-[#273244] dark:bg-[#0f172a]/40">
                    <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a8a29e]">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#ff801f]/12 font-mono text-[10px] text-[#c2410c] dark:text-[#fdba74]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      Sección {index + 1}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className={cn(erpSecondaryBtnClass, "h-8 min-h-0 w-auto px-2")}
                        aria-label={`Subir sección ${index + 1}`}
                        disabled={index === 0}
                        onClick={() => moveSeccion(sec.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={cn(erpSecondaryBtnClass, "h-8 min-h-0 w-auto px-2")}
                        aria-label={`Bajar sección ${index + 1}`}
                        disabled={index === draft.secciones.length - 1}
                        onClick={() => moveSeccion(sec.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={cn(
                          erpSecondaryBtnClass,
                          "h-8 min-h-0 w-auto px-2 text-[#c64545] hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        )}
                        aria-label={`Eliminar sección ${index + 1}`}
                        onClick={() => setSeccionToDelete(sec)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 p-3">
                    <div>
                      <label htmlFor={`sec-titulo-${sec.id}`} className={labelClass}>
                        Título
                      </label>
                      <input
                        id={`sec-titulo-${sec.id}`}
                        type="text"
                        className={erpInputLikeClass}
                        placeholder="Ej. Cámara entrada"
                        value={sec.titulo}
                        onChange={(e) => updateSeccion(sec.id, { titulo: e.target.value })}
                      />
                    </div>
                    <div
                      className="grid grid-cols-2 gap-2"
                      role="group"
                      aria-label={`Fotos Antes y Después de la sección ${index + 1}`}
                    >
                      <PhotoSlot
                        label="Antes"
                        url={sec.fotos_antes[0] || ""}
                        busy={uploadingKey === `antes-${sec.id}`}
                        onPick={(file) => void handleUpload(file, "antes", sec.id)}
                        onClear={() => clearFoto(sec.id, "antes")}
                      />
                      <PhotoSlot
                        label="Después"
                        url={sec.fotos_despues[0] || ""}
                        busy={uploadingKey === `despues-${sec.id}`}
                        onPick={(file) => void handleUpload(file, "despues", sec.id)}
                        onClear={() => clearFoto(sec.id, "despues")}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div
          className="flex flex-col-reverse gap-2 border-t border-[#e7ded0] pt-4 sm:flex-row sm:justify-end dark:border-[#273244]"
          role="region"
          aria-label="Acciones del reporte"
        >
          {!isNew && reporteId != null ? (
            <Link
              to={`/reportes-mantenimiento/${reporteId}/pdf`}
              state={{ from: `/reportes-mantenimiento/${reporteId}` }}
              className={cn(erpSecondaryBtnClass, "min-h-10 w-full sm:w-auto sm:min-w-[9.5rem]")}
            >
              Ver PDF
            </Link>
          ) : null}
          <button
            type="button"
            className={cn(erpPrimaryBtnClass, "min-h-10 w-full sm:w-auto sm:min-w-[9.5rem]")}
            disabled={formBusy}
            onClick={() => void handleSave()}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
        </fieldset>

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
              <h3 id={deleteSeccionTitleId} className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                Eliminar sección
              </h3>
              <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-[#57534e] dark:text-[#94a3b8]">
                {deletingSeccion ? (
                  "Por favor espera; se están borrando las imágenes…"
                ) : (
                  <>
                    ¿Eliminar{" "}
                    <span className="font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                      {seccionToDelete?.titulo.trim() || "esta sección"}
                    </span>
                    {seccionToDelete && countSeccionFotos(seccionToDelete) > 0
                      ? ` y sus ${countSeccionFotos(seccionToDelete)} foto${countSeccionFotos(seccionToDelete) === 1 ? "" : "s"} de Cloudinary`
                      : ""}
                    ? Esta acción no se puede deshacer.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
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

function PhotoSlot({
  label,
  url,
  busy,
  onPick,
  onClear,
}: {
  label: string;
  url: string;
  busy: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const isAntes = label === "Antes";
  const isOrden = label === "Orden";
  const accentClass = isOrden
    ? "border-[#bfdbfe]/80 bg-[#eff6ff]/90 dark:border-blue-800/40 dark:bg-blue-950/25"
    : isAntes
      ? "border-[#ff801f]/30 bg-[#fff8f1]/90 dark:border-[#fb923c]/25 dark:bg-[#ff801f]/10"
      : "border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/25";
  const labelTone = isOrden
    ? "text-[#1d4ed8] dark:text-blue-300"
    : isAntes
      ? "text-[#c45f00]"
      : "text-emerald-800 dark:text-emerald-300";
  const iconTone = isOrden
    ? "bg-blue-500/15 text-[#1d4ed8] dark:text-blue-300"
    : isAntes
      ? "bg-[#ff801f]/12 text-[#c2410c]"
      : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";

  return (
    <div className={cn("overflow-hidden rounded-xl border", accentClass)}>
      <div className="flex items-center justify-between gap-1 px-2 pt-2">
        <label htmlFor={inputId} className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", labelTone)}>
          {label}
        </label>
        {url ? (
          <button
            type="button"
            className={cn(erpSecondaryBtnClass, "h-7 min-h-0 w-auto px-2 text-[11px]")}
            onClick={onClear}
            aria-label={`Quitar foto ${label}`}
            disabled={busy}
          >
            Quitar
          </button>
        ) : null}
      </div>

      <input
        id={inputId}
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
        <div className="relative p-2 pt-1.5">
          <img
            src={url}
            alt={`Foto ${label}`}
            className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-black/5"
          />
          <button
            type="button"
            className={cn(
              erpSecondaryBtnClass,
              "absolute bottom-3 right-3 h-8 min-h-0 w-auto bg-white/95 px-2.5 text-[11px] shadow-sm"
            )}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-label={`Cambiar foto ${label}`}
          >
            {busy ? "…" : "Cambiar"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="m-2 flex aspect-[4/3] w-[calc(100%-1rem)] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#d6d3d1] bg-white/75 text-[11px] text-[#78716c] transition hover:border-[#ff801f]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f] disabled:opacity-60 dark:border-[#334155] dark:bg-[#0b1220]/40"
          aria-label={`Subir foto ${label}`}
        >
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", iconTone)} aria-hidden>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-medium text-[#44403c] dark:text-[#cbd5e1]">
            {busy ? "Subiendo…" : `Subir ${label.toLowerCase()}`}
          </span>
        </button>
      )}
    </div>
  );
}
