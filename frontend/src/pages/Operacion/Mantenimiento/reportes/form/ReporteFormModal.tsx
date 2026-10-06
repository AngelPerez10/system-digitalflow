import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { CalendarClock, Camera, ChevronDown, ChevronUp, FileText, FolderKanban, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import DatePicker from "@/components/form/date-picker";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { TrashBinIcon } from "@/icons";
import { cn } from "@/lib/utils";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import { erpDeleteModalClass, erpDeleteModalPanelClass } from "../../../OrdenesTrabajo/ordenTrabajoStyles";
import { OrdenPhotoPreviewModal } from "../../../OrdenesTrabajo/OrdenTrabajoModals";
import { erpDangerBtnClass, erpSecondaryBtnClass } from "../../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { fetchTodosLosUsuariosApi } from "../../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import type { Usuario } from "../../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { listProyectos } from "../../../Proyectos/shared/proyectoApi";
import type { ProyectoRow } from "../../../Proyectos/shared/proyectoTypes";
import { displayProyectoFolio } from "../../../Proyectos/shared/proyectoFormUtils";
import { Field } from "../../../Proyectos/shared/ProyectoUi";
import { OrdenFormSection } from "../../../OrdenesTrabajo/OrdenServicio/form/tabs/ordenTabHelpers";
import MantenimientoFormShell, { type MantenimientoFormStep } from "../../form/MantenimientoFormShell";
import { btn, btnSm, emptyPanel, iconBtn, iconBtnDanger, input, metaChip } from "../../../Proyectos/shared/proyectoTokens";
import { createReporte, deleteReporteImage, fetchProyectosOcupados, getReporte, isReporteApiError, updateReporte } from "../reporteApi";
import { uploadReporteFile } from "../reporteImageUpload";
import { ReporteTecnicosField } from "../ReporteTecnicosField";
import { usuarioDisplayName } from "../reporteTecnicos";
import { countReporteFotos, countSeccionFotos, emptyReporteDraft, newSeccion, REPORTE_MAX_FOTOS_POR_LADO, type ReporteDraft, type ReporteSeccion } from "../reporteTypes";
import { ReporteProyectoPickerModal, type ProyectoOcupadoInfo } from "./ReporteProyectoPickerModal";
import { ProyectoVacio, ProyectoVinculadoCard, ProyectoVinculadoResumen } from "./ReporteProyectoVinculado";
import { REPORTE_STEPS, type ReporteStepId, type ReporteStepState } from "./reporteSteps";


/* -------------------------------------------------------------------------- */
/*  Tokens locales — lenguaje marino/azul, sobrio (igual que Órdenes)         */
/* -------------------------------------------------------------------------- */



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

/** `2026-10-01` → «01/10/2026» (formato del calendario). */
function isoToMx(iso: string): string {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

/** «01/10/2026» → `2026-10-01`. */
function mxToIso(mx: string): string {
  const [d, m, y] = String(mx || "").split("/");
  return y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
}

/** Técnicos del proyecto (el responsable primero) como texto «Ana, Luis». */
function tecnicosFromProyecto(p: ProyectoRow): string {
  const list = [...(p.draft?.tecnicos ?? [])].sort((a, b) => Number(Boolean(b.responsable)) - Number(Boolean(a.responsable)));
  return list
    .map((t) => (t.nombre || "").trim())
    .filter(Boolean)
    .join(", ");
}

type Props = {
  open: boolean;
  /** `null` = reporte nuevo. */
  reporteId: number | null;
  onClose: () => void;
  /** Se llama tras guardar (el listado se recarga y muestra el aviso). */
  onSaved: (flash: { variant: "success"; title: string; message: string }) => void;
};


/** Pasos del asistente con su descripción (encabezado del paso). */
const PASOS: MantenimientoFormStep<ReporteStepId>[] = REPORTE_STEPS.map((st) => ({
  ...st,
  description:
    st.id === 1
      ? "Liga el proyecto al que pertenece el reporte y, si quieres, una imagen para el PDF."
      : st.id === 2
        ? "Cuándo se hizo el mantenimiento y qué técnicos lo realizaron."
        : "Una zona por área revisada, con sus fotos de Antes y Después.",
}));

export default function ReporteFormModal({ open, reporteId, onClose, onSaved }: Props) {
  const isNew = reporteId == null;
  const { user, isAdmin } = useAuth();
  const tecnicosHintId = useId();
  const ordenErrorId = useId();
  const deleteSeccionTitleId = useId();

  const [draft, setDraft] = useState<ReporteDraft>(emptyReporteDraft);
  const [folio, setFolio] = useState("");
  const [ordenFolio, setOrdenFolio] = useState("");
  const [ordenCliente, setOrdenCliente] = useState("");
  const [proyectos, setProyectos] = useState<ProyectoRow[]>([]);
  const [loadingProyectos, setLoadingProyectos] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ocupados, setOcupados] = useState<Record<string, ProyectoOcupadoInfo>>({});
  const [ocupadosError, setOcupadosError] = useState("");
  /** Usuarios con foto de perfil para el selector de técnicos. */
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [ordenError, setOrdenError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [seccionToDelete, setSeccionToDelete] = useState<ReporteSeccion | null>(null);
  const [deletingSeccion, setDeletingSeccion] = useState(false);
  const [activeStep, setActiveStep] = useState<ReporteStepId>(1);
  const [photoPreview, setPhotoPreview] = useState<{ urls: string[]; index: number } | null>(null);
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
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await fetchProyectosOcupados(reporteId);
      if (!cancelled) {
        setOcupados(res.byId);
        setOcupadosError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, reporteId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingProyectos(true);
      try {
        const rows = await listProyectos();
        if (!cancelled) setProyectos(rows);
      } catch {
        if (!cancelled) setProyectos([]);
      } finally {
        if (!cancelled) setLoadingProyectos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const rows = await fetchTodosLosUsuariosApi();
      if (!cancelled) {
        setUsuarios(rows);
        setLoadingUsuarios(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Al abrir un reporte nuevo se parte de un borrador vacío; al abrir uno existente, del primer paso.
  useEffect(() => {
    if (!open) return;
    setActiveStep(1);
    setOrdenError("");
    setPhotoPreview(null);
    setPickerOpen(false);
    if (isNew) {
      setDraft(emptyReporteDraft());
      setFolio("");
      setOrdenFolio("");
      setOrdenCliente("");
    }
  }, [open, isNew]);

  // Quien no es administrador no elige técnicos: en un reporte nuevo queda su propio nombre
  // (o el del proyecto vinculado, ver `applyProyecto`).
  useEffect(() => {
    if (!open || isAdmin || !isNew || !user) return;
    const propio = usuarioDisplayName(user);
    setDraft((prev) => (prev.tecnico_nombre.trim() ? prev : { ...prev, tecnico_nombre: propio }));
  }, [open, isAdmin, isNew, user]);

  useEffect(() => {
    if (!open || reporteId == null || !Number.isFinite(reporteId)) return;
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
          origen: row.origen_tipo,
          orden_id: row.orden_id != null ? String(row.orden_id) : "",
          proyecto_id: row.proyecto_id != null ? String(row.proyecto_id) : "",
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
  }, [open, reporteId, showAlert]);

  const esProyecto = draft.origen === "proyecto";
  const origenId = esProyecto ? draft.proyecto_id : draft.orden_id;
  /** Reporte anterior vinculado a una orden de trabajo (ya no se crean así): se muestra de solo lectura. */
  const esLegacyOrden = !esProyecto && Boolean(draft.orden_id);
  /** Proyectos libres más recientes: atajo para vincular sin abrir el buscador. */
  const disponibles = useMemo(() => proyectos.filter((p) => !ocupados[String(p.id)]), [proyectos, ocupados]);
  const sugeridos = useMemo(() => disponibles.slice(0, 3), [disponibles]);
  const proyectoSel = useMemo(() => proyectos.find((p) => String(p.id) === draft.proyecto_id) || null, [proyectos, draft.proyecto_id]);

  const totalFotos = useMemo(() => countReporteFotos(draft.secciones), [draft.secciones]);

  const applyProyecto = (p: ProyectoRow) => {
    // Un proyecto, un reporte: si ya tiene otro (y no es el de este reporte), no se vincula.
    const uso = ocupados[String(p.id)];
    if (uso && String(p.id) !== draft.proyecto_id) {
      setOrdenError(`El proyecto ${displayProyectoFolio(p.folio)} ya tiene el reporte ${uso.folio}.`);
      setPickerOpen(false);
      return;
    }
    setOrdenError("");
    setPickerOpen(false);
    setOrdenFolio(displayProyectoFolio(p.folio));
    setOrdenCliente((p.cliente || "").trim());
    setDraft((prev) => ({
      ...prev,
      origen: "proyecto",
      orden_id: "",
      proyecto_id: String(p.id),
      fecha_servicio: (p.draft?.fechasInicio?.[0] || prev.fecha_servicio || "").slice(0, 10),
      tecnico_nombre: tecnicosFromProyecto(p) || prev.tecnico_nombre,
    }));
  };

  const quitarProyecto = () => {
    setOrdenFolio("");
    setOrdenCliente("");
    setDraft((prev) => ({ ...prev, origen: "proyecto", orden_id: "", proyecto_id: "" }));
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

  const setSeccionFotos = (
    secId: string,
    kind: "antes" | "despues",
    updater: (prev: string[]) => string[]
  ) => {
    setDraft((prev) => ({
      ...prev,
      secciones: prev.secciones.map((s) => {
        if (s.id !== secId) return s;
        return kind === "antes"
          ? { ...s, fotos_antes: updater(s.fotos_antes) }
          : { ...s, fotos_despues: updater(s.fotos_despues) };
      }),
    }));
  };

  const handleUploadSeccion = async (
    files: File[],
    kind: "antes" | "despues",
    secId: string
  ) => {
    if (!files.length) return;
    const sec = draft.secciones.find((s) => s.id === secId);
    const current = sec ? (kind === "antes" ? sec.fotos_antes : sec.fotos_despues) : [];
    const remaining = REPORTE_MAX_FOTOS_POR_LADO - current.length;
    if (remaining <= 0) {
      showAlert(
        "warning",
        "Límite alcanzado",
        `Ya tienes ${REPORTE_MAX_FOTOS_POR_LADO} fotos de "${kind === "antes" ? "Antes" : "Después"}" en esta zona.`
      );
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > toUpload.length) {
      showAlert(
        "warning",
        "Algunas fotos no se subieron",
        `Solo caben ${remaining} foto${remaining === 1 ? "" : "s"} más en "${kind === "antes" ? "Antes" : "Después"}".`
      );
    }
    setUploadingKey(`${kind}-${secId}`);
    let uploaded = 0;
    let lastError = "";
    for (const file of toUpload) {
      try {
        const url = await uploadReporteFile(file);
        setSeccionFotos(secId, kind, (prev) => [...prev, url]);
        uploaded += 1;
      } catch (err) {
        lastError =
          err instanceof Error
            ? err.message
            : isReporteApiError(err)
              ? err.message
              : "No se pudo subir la imagen.";
      }
    }
    setUploadingKey(null);
    if (uploaded > 0 && !lastError) {
      showAlert(
        "success",
        "Imagen subida",
        uploaded === 1 ? "La foto se adjuntó correctamente." : `${uploaded} fotos se adjuntaron correctamente.`
      );
    } else if (lastError) {
      showAlert("error", "Error al subir", lastError, 5000);
    }
  };

  const handleRemoveSeccionFoto = (secId: string, kind: "antes" | "despues", url: string) => {
    setSeccionFotos(secId, kind, (prev) => prev.filter((u) => u !== url));
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

  const validate = (): ReporteStepId | null => {
    if (!origenId) {
      setOrdenError("Vincula el proyecto al que pertenece este reporte.");
      showAlert("warning", "Falta el proyecto", "Vincula un proyecto.");
      return 1;
    }
    if (!draft.fecha_servicio) {
      showAlert("warning", "Falta la fecha", "Indica la fecha de servicio.");
      return 2;
    }
    if (!draft.tecnico_nombre.trim()) {
      showAlert("warning", "Falta el técnico", "Selecciona al menos un técnico.");
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
        reporteId == null
          ? await createReporte(draft)
          : await updateReporte(reporteId, draft);
      onSaved({
        variant: "success",
        title: isNew ? "Reporte guardado" : "Reporte actualizado",
        message: `${saved.folio} se ${isNew ? "creó" : "guardó"} correctamente.`,
      });
      onClose();
    } catch (err) {
      const message = isReporteApiError(err) ? err.message : "Revisa los datos e inténtalo de nuevo.";
      if (/proyecto/i.test(message)) {
        // P. ej. otro usuario hizo el reporte de ese proyecto mientras se capturaba éste.
        setOrdenError(message);
        setActiveStep(1);
        void fetchProyectosOcupados(reporteId).then((res) => {
          setOcupados(res.byId);
          setOcupadosError(res.error);
        });
      }
      showAlert("error", "No se pudo guardar", message, 5000);
    } finally {
      setSaving(false);
    }
  };


  const stepState: Record<ReporteStepId, ReporteStepState> = {
    1: origenId ? "done" : "pending",
    2: draft.fecha_servicio && draft.tecnico_nombre.trim() ? "done" : "pending",
    3: draft.secciones.length > 0 ? "done" : "pending",
  };
  const stepHints: Record<ReporteStepId, string> = {
    1: ordenFolio ? `${ordenFolio}${ordenCliente ? ` · ${ordenCliente}` : ""}` : "Vincula el proyecto",
    2: draft.tecnico_nombre.trim() ? draft.tecnico_nombre : "Fecha y técnicos",
    3: draft.secciones.length > 0 ? `${draft.secciones.length} ${draft.secciones.length === 1 ? "zona" : "zonas"} · ${totalFotos} fotos` : "Antes / Después",
  };

  const titulo = ordenCliente.trim();
  const blockedEscape = saving || Boolean(seccionToDelete) || Boolean(photoPreview);

  const ordenResumen = origenId ? (
    <ProyectoVinculadoResumen
      esProyecto={esProyecto}
      proyecto={esProyecto ? proyectoSel : null}
      folio={ordenFolio}
      cliente={ordenCliente}
      pdfHref={esProyecto ? `/proyectos/${draft.proyecto_id}/pdf` : `/ordenes/${draft.orden_id}/pdf`}
      onChange={activeStep !== 1 ? () => setActiveStep(1) : undefined}
    />
  ) : null;

  const renderStep1 = () => (
    <div className="space-y-5">
      <OrdenFormSection title="Proyecto" icon={<FolderKanban />} description="El reporte pertenece a un proyecto. Cada proyecto tiene un solo reporte.">
        {esLegacyOrden ? (
          <div className="space-y-3">
            {ordenResumen}
            <p className="text-[12.5px] leading-snug text-[#71717A] dark:text-[#8EA0B8]">
              Este reporte se hizo sobre una orden de trabajo. Los reportes nuevos se vinculan a un proyecto; puedes pasarlo a uno si lo necesitas.
            </p>
            <button type="button" className={`${btn.secondary} ${btnSm}`} onClick={() => setPickerOpen(true)} aria-haspopup="dialog">
              <FolderKanban aria-hidden />
              Cambiar a un proyecto
            </button>
          </div>
        ) : esProyecto && draft.proyecto_id ? (
          <ProyectoVinculadoCard
            key={draft.proyecto_id}
            proyecto={proyectoSel}
            folio={ordenFolio}
            cliente={ordenCliente}
            proyectoId={draft.proyecto_id}
            onChange={() => setPickerOpen(true)}
            onRemove={quitarProyecto}
            onEditServicio={() => setActiveStep(2)}
          />
        ) : (
          <ProyectoVacio
            loading={loadingProyectos}
            total={proyectos.length}
            disponibles={disponibles.length}
            sugeridos={sugeridos}
            error={ordenError}
            errorId={ordenErrorId}
            onOpenPicker={() => setPickerOpen(true)}
            onPick={applyProyecto}
          />
        )}
      </OrdenFormSection>

      <OrdenFormSection title="Imagen del proyecto" icon={<ImageIcon />} description="Opcional. Aparece en el PDF junto a los datos del proyecto.">
        <div className="max-w-md">
        <SinglePhoto
          accent="orden"
          title="Proyecto"
          url={draft.foto_orden_url}
          busy={uploadingKey === "foto-orden"}
          onPick={(file) => void handleUploadFotoOrden(file)}
          onClear={() => setDraft((prev) => ({ ...prev, foto_orden_url: "" }))}
          onPreview={draft.foto_orden_url ? () => setPhotoPreview({ urls: [draft.foto_orden_url], index: 0 }) : undefined}
        />
        </div>
      </OrdenFormSection>
    </div>
  );

  const renderStep2 = () => (
    <>
      <OrdenFormSection title="Datos del servicio" icon={<CalendarClock />} description="Cuándo se hizo el mantenimiento y quién lo realizó.">
        <div className="grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
          <div>
            <DatePicker
              id="rm-fecha"
              label="Fecha de servicio"
              required
              placeholder="dd/mm/aaaa"
              dateFormat="d/m/Y"
              appendToBody
              defaultDate={isoToMx(draft.fecha_servicio) || undefined}
              onChange={(_dates, str: string) => setDraft((p) => ({ ...p, fecha_servicio: mxToIso(str) }))}
            />
          </div>
          <Field
            label={isAdmin ? "Técnicos" : "Técnicos asignados"}
            htmlFor="rm-tecnico"
            required
            hint={isAdmin ? "Puedes seleccionar a varios técnicos; todos aparecerán en el reporte y en el PDF." : "Solo un administrador puede cambiar los técnicos del reporte."}
            hintId={tecnicosHintId}
          >
            <ReporteTecnicosField id="rm-tecnico" value={draft.tecnico_nombre} onChange={(next) => setDraft((p) => ({ ...p, tecnico_nombre: next }))} usuarios={usuarios} loading={loadingUsuarios} disabled={!isAdmin} describedBy={tecnicosHintId} />
          </Field>
        </div>
      </OrdenFormSection>
      {ordenResumen}
    </>
  );

  const renderStep3 = () => (
    <OrdenFormSection
      title="Zonas de evidencia"
      icon={<Camera />}
      description={`Una zona por área (Cámara entrada, DVR, Patio…) con hasta ${REPORTE_MAX_FOTOS_POR_LADO} fotos de Antes y de Después.`}
      actions={
        <>
          {draft.secciones.length > 0 ? (
            <span className={`${metaChip} tabular-nums`}>
              {draft.secciones.length} {draft.secciones.length === 1 ? "zona" : "zonas"} · {totalFotos} fotos
            </span>
          ) : null}
          <button type="button" className={`${btn.primary} ${btnSm}`} onClick={addSeccion}>
            <Plus aria-hidden />
            Agregar zona
          </button>
        </>
      }
    >
      {draft.secciones.length === 0 ? (
        <div className={emptyPanel}>
          <span className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]" aria-hidden>
            <Camera className="size-6" />
          </span>
          <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Aún no hay zonas</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Crea la primera zona para subir las fotos de Antes y Después del servicio.</p>
          <button type="button" className={`${btn.primary} mt-4`} onClick={addSeccion}>
            <Plus aria-hidden />
            Crear primera zona
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {draft.secciones.map((sec, index) => (
            <li key={sec.id} className="cot-rise overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFB] dark:border-[#273244] dark:bg-[#0F172A]/60" style={{ "--cot-i": Math.min(index, 6) } as CSSProperties}>
              <div className="flex flex-wrap items-center gap-2 border-b border-[#EDEDF0] bg-white px-3 py-2.5 dark:border-[#1F2A3C] dark:bg-[#111827] sm:px-4">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#17235B] font-mono text-[12px] font-semibold text-white dark:bg-[#4B7CFF]">{String(index + 1).padStart(2, "0")}</span>
                <input
                  type="text"
                  className={`${input} h-10! min-w-0 flex-1 basis-48 font-semibold`}
                  placeholder={`Zona ${index + 1} — ej. Cámara entrada`}
                  value={sec.titulo}
                  onChange={(e) => updateSeccion(sec.id, { titulo: e.target.value })}
                  aria-label={`Título de la zona ${index + 1}`}
                />
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <span className="mr-1 hidden items-center gap-1 sm:inline-flex">
                    <span className={cn("inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold tabular-nums", sec.fotos_antes.length > 0 ? "bg-[rgba(230,162,60,0.16)] text-[#8A5D0F] dark:text-[#E6A23C]" : "bg-[#F4F4F5] text-[#A1A1AA] dark:bg-white/6 dark:text-[#6E6E77]")}>Antes {sec.fotos_antes.length}</span>
                    <span className={cn("inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold tabular-nums", sec.fotos_despues.length > 0 ? "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300" : "bg-[#F4F4F5] text-[#A1A1AA] dark:bg-white/6 dark:text-[#6E6E77]")}>Después {sec.fotos_despues.length}</span>
                  </span>
                  <button type="button" className={iconBtn} aria-label={`Subir zona ${index + 1}`} disabled={index === 0} onClick={() => moveSeccion(sec.id, -1)}>
                    <ChevronUp aria-hidden />
                  </button>
                  <button type="button" className={iconBtn} aria-label={`Bajar zona ${index + 1}`} disabled={index === draft.secciones.length - 1} onClick={() => moveSeccion(sec.id, 1)}>
                    <ChevronDown aria-hidden />
                  </button>
                  <button type="button" className={iconBtnDanger} aria-label={`Eliminar zona ${index + 1}`} onClick={() => setSeccionToDelete(sec)}>
                    <Trash2 aria-hidden />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2 lg:gap-4">
                <PhotoGroup accent="antes" title="Antes" urls={sec.fotos_antes} max={REPORTE_MAX_FOTOS_POR_LADO} busy={uploadingKey === `antes-${sec.id}`} onAdd={(files) => void handleUploadSeccion(files, "antes", sec.id)} onRemove={(url) => handleRemoveSeccionFoto(sec.id, "antes", url)} onPreview={(i) => setPhotoPreview({ urls: sec.fotos_antes, index: i })} />
                <PhotoGroup accent="despues" title="Después" urls={sec.fotos_despues} max={REPORTE_MAX_FOTOS_POR_LADO} busy={uploadingKey === `despues-${sec.id}`} onAdd={(files) => void handleUploadSeccion(files, "despues", sec.id)} onRemove={(url) => handleRemoveSeccionFoto(sec.id, "despues", url)} onPreview={(i) => setPhotoPreview({ urls: sec.fotos_despues, index: i })} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {draft.secciones.length > 0 ? (
        <button type="button" onClick={addSeccion} className={`${btn.secondary} w-full border-dashed`}>
          <Plus aria-hidden />
          Agregar otra zona
        </button>
      ) : null}
    </OrdenFormSection>
  );

  return (
    <>
      <MantenimientoFormShell
        open={open}
        onClose={onClose}
        busy={saving}
        escapeBlocked={blockedEscape}
        ariaLabel={isNew ? "Nuevo reporte de mantenimiento" : `Editar reporte ${folio}`}
        icon={FileText}
        kicker="Reporte de mantenimiento"
        title={isNew ? "Nuevo reporte" : "Editar reporte"}
        editing={!isNew}
        newBadge="Nuevo"
        folio={folio || undefined}
        steps={PASOS}
        active={activeStep}
        onActiveChange={setActiveStep}
        done={{ 1: stepState[1] === "done", 2: stepState[2] === "done", 3: stepState[3] === "done" }}
        summary={[
          { label: esProyecto ? "Proyecto" : "Origen", value: ordenFolio ? `${ordenFolio}${titulo ? ` · ${titulo}` : ""}` : "" },
          { label: "Técnicos", value: draft.tecnico_nombre.trim() },
          { label: "Evidencia", value: draft.secciones.length > 0 ? stepHints[3] : "" },
        ]}
        asideFooter={
          !isNew && reporteId != null ? (
            <Link to={`/reportes-mantenimiento/${reporteId}/pdf`} state={{ from: `/mantenimiento/reportes/${reporteId}` }} className={`${btn.secondary} w-full`}>
              <FileText aria-hidden />
              Ver PDF
            </Link>
          ) : null
        }
        alert={
          alert.show ? (
            <div role="alert">
              <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} placement="inline" />
            </div>
          ) : null
        }
        loading={loading}
        loadingText="Cargando el reporte…"
        panels={{ 1: renderStep1(), 2: renderStep2(), 3: renderStep3() }}
        onSubmit={() => void handleSave()}
        saveLabel={{ idle: isNew ? "Crear reporte" : "Guardar cambios", busy: "Guardando…" }}
      />

      {/* Modal eliminar zona */}
      <Modal
        isOpen={Boolean(seccionToDelete)}
        onClose={() => {
          if (!deletingSeccion) setSeccionToDelete(null);
        }}
        className={`${erpDeleteModalClass} z-[100000]`}
        ariaLabelledBy={deleteSeccionTitleId}
        closeOnBackdropClick={!deletingSeccion}
        closeOnEscape={!deletingSeccion}
        showCloseButton={!deletingSeccion}
      >
        <div className={erpDeleteModalPanelClass}>
          <div className="flex flex-col items-center text-center">
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/20" aria-hidden>
              {deletingSeccion ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600 dark:border-rose-900 dark:border-t-rose-400" aria-hidden /> : <TrashBinIcon className="h-6 w-6" />}
            </span>
            <h3 id={deleteSeccionTitleId} className="text-base font-semibold text-[#09090B] dark:text-[#F8FAFC]">
              Eliminar zona
            </h3>
            <p className="mt-2 max-w-88 text-sm leading-relaxed text-[#52525B] dark:text-[#94a3b8]">
              {deletingSeccion ? (
                "Por favor espera; se están borrando las imágenes…"
              ) : (
                <>
                  ¿Eliminar <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{seccionToDelete?.titulo.trim() || "esta zona"}</span>
                  {seccionToDelete && countSeccionFotos(seccionToDelete) > 0 ? ` y sus ${countSeccionFotos(seccionToDelete)} foto${countSeccionFotos(seccionToDelete) === 1 ? "" : "s"} de Cloudinary` : ""}? Esta acción no se puede deshacer.
                </>
              )}
            </p>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
            <button type="button" className={`${erpSecondaryBtnClass} sm:min-w-32`} disabled={deletingSeccion} onClick={() => setSeccionToDelete(null)}>
              Cancelar
            </button>
            <button type="button" className={`${erpDangerBtnClass} sm:min-w-32`} disabled={deletingSeccion} aria-busy={deletingSeccion || undefined} onClick={() => void confirmDeleteSeccion()}>
              {deletingSeccion ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      </Modal>

      <ReporteProyectoPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        proyectos={proyectos}
        loading={loadingProyectos}
        ocupados={ocupados}
        ocupadosError={ocupadosError}
        selectedId={draft.proyecto_id}
        onSelect={applyProyecto}
      />

      {/* Vista ampliada de fotos (Antes/Después/Orden) */}
      <OrdenPhotoPreviewModal
        open={Boolean(photoPreview)}
        url={photoPreview ? photoPreview.urls[photoPreview.index] || null : null}
        index={photoPreview?.index}
        total={photoPreview?.urls.length}
        onClose={() => setPhotoPreview(null)}
        onPrev={photoPreview && photoPreview.urls.length > 1 ? () => setPhotoPreview((prev) => (prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : prev)) : undefined}
        onNext={photoPreview && photoPreview.urls.length > 1 ? () => setPhotoPreview((prev) => (prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : prev)) : undefined}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponentes                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Antes/Después de una zona: no siempre es 1+1 — algunas zonas necesitan una
 * sola foto por lado y otras varios ángulos, así que cada lado es una
 * cuadrícula independiente hasta `max` fotos (REPORTE_MAX_FOTOS_POR_LADO).
 */
function PhotoGroup({
  accent,
  title,
  urls,
  max,
  busy,
  onAdd,
  onRemove,
  onPreview,
}: {
  accent: Accent;
  title: string;
  urls: string[];
  max: number;
  busy: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (url: string) => void;
  onPreview: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const a = ACCENT[accent];
  const isAntes = accent === "antes";
  const canAddMore = urls.length < max;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy && canAddMore) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (busy || !canAddMore) return;
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
        if (files.length) onAdd(files);
      }}
      className={cn(
        "rounded-[14px] border p-3 transition-colors dark:bg-[#111827]",
        dragOver
          ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.04)] dark:border-[#4B7CFF]"
          : "border-[#E7E7EA] bg-white dark:border-[#273244]"
      )}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest", a.label)}>
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
        <span className="text-[10px] font-semibold tabular-nums text-[#A1A1AA] dark:text-[#6E7A91]">
          {urls.length}/{max}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onAdd(files);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className={cn("group relative aspect-square overflow-hidden rounded-[10px] ring-1", a.ring)}>
            <button
              type="button"
              onClick={() => onPreview(i)}
              aria-label={`Ver foto ${i + 1} de ${title} en tamaño completo`}
              className="block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF]"
            >
              <img
                src={url}
                alt={`${title} ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </button>
            <button
              type="button"
              onClick={() => onRemove(url)}
              disabled={busy}
              aria-label={`Quitar foto ${i + 1} de ${title}`}
              className="absolute right-1 top-1 z-1 inline-flex size-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-[#C22B2B] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white active:scale-95 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
            <span className="pointer-events-none absolute bottom-1 left-1 inline-flex h-4 min-w-4 items-center justify-center rounded-md bg-black/55 px-1 text-[9px] font-semibold tabular-nums text-white">
              {i + 1}
            </span>
          </div>
        ))}

        {canAddMore ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] text-[11px] text-[#6E6E77] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] disabled:opacity-60 dark:border-[#3A4661] dark:bg-[#1B2539] dark:text-[#8EA0B8]",
              a.add
            )}
          >
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            ) : (
              <span className={cn("inline-flex size-6 items-center justify-center rounded-[7px]", a.chip)} aria-hidden>
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </span>
            )}
            <span className="font-medium">{busy ? "Subiendo…" : "Agregar"}</span>
          </button>
        ) : null}
      </div>

      {urls.length === 0 ? (
        <p className="mt-1.5 text-[10px] text-[#A1A1AA] dark:text-[#6E7A91]">Arrastra imágenes o haz clic en Agregar.</p>
      ) : null}
    </div>
  );
}

function SinglePhoto({
  accent,
  title,
  url,
  busy,
  header = false,
  onPick,
  onClear,
  onPreview,
}: {
  accent: Accent;
  title: string;
  url: string;
  busy: boolean;
  header?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  onPreview?: () => void;
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
              "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest",
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
          <button
            type="button"
            onClick={onPreview}
            disabled={!onPreview}
            aria-label={`Ver ${title} en tamaño completo`}
            className={cn("block w-full", onPreview && "cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF]")}
          >
            <img
              src={url}
              alt={title}
              className="aspect-4/3 w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </button>
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-linear-to-t from-black/60 to-transparent p-2">
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-xl bg-white/95 px-2 text-[11px] font-medium text-[#09090B] shadow-sm hover:bg-white disabled:opacity-60"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "…" : "Cambiar"}
            </button>
            {!header ? (
              <button
                type="button"
                className="inline-flex h-7 items-center rounded-xl bg-white/95 px-2 text-[11px] font-medium text-rose-600 shadow-sm hover:bg-white disabled:opacity-60"
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
            "flex aspect-4/3 w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] text-[12px] text-[#6E6E77] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] disabled:opacity-60 dark:border-[#3A4661] dark:bg-[#1B2539] dark:text-[#8EA0B8]",
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
