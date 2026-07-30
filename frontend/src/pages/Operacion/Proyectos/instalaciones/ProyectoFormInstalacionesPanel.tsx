import { useEffect, useId, useState } from "react";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Modal } from "@/components/ui/modal";
import {
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpPrimaryBtnClass,
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpSecondaryBtnClass,
} from "../../OrdenesTrabajo/ordenTrabajoStyles";
import InstalacionForm from "./InstalacionForm";
import {
  createProyectoInstalacion,
  deleteProyectoInstalacion,
  isProyectoInstalacionApiError,
  listProyectoInstalaciones,
  updateProyectoInstalacion,
} from "./proyectoInstalacionApi";
import {
  buildInstalacionPayload,
  displayInstalacionFolio,
  EMPTY_INSTALACION_FORM,
  payloadFromApi,
  payloadImei,
  payloadPlacas,
  subtipoFromPayload,
  type InstalacionFormValue,
  type InstalacionSubtipo,
  type ProyectoInstalacionDraft,
  type ProyectoInstalacionRow,
} from "./proyectoInstalacionTypes";
import {
  proyectoEmptyPanelClass,
  proyectoOrdenCardClass,
  proyectoOrdenEyebrowClass,
  proyectoOrdenHintClass,
  proyectoOrdenSectionClass,
  proyectoOrdenSectionHeadClass,
  proyectoOrdenTitleClass,
  proyectoSectionIconClass,
} from "./instalacionStyles";

export type { ProyectoInstalacionDraft };

type Props = {
  /** ID numérico del proyecto ya guardado; null si aún es borrador nuevo. */
  proyectoId: number | null;
  active: boolean;
  disabled?: boolean;
  /** Borrador del formulario (controlado por el modal padre). */
  draft: ProyectoInstalacionDraft;
  onDraftChange: (next: ProyectoInstalacionDraft) => void;
};

/**
 * Pestaña Instalaciones: siempre muestra el formulario de tipo de instalación.
 * Si el proyecto ya existe, también lista y permite guardar instalaciones al API.
 * Si es proyecto nuevo, el borrador se persiste al guardar el proyecto.
 */
export function ProyectoFormInstalacionesPanel({
  proyectoId,
  active,
  disabled = false,
  draft,
  onDraftChange,
}: Props) {
  const deleteTitleId = useId();
  const sectionTitleId = "proyecto-sec-instalaciones";

  const [rows, setRows] = useState<ProyectoInstalacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingRow, setDeletingRow] = useState<ProyectoInstalacionRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    if (proyectoId == null) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await listProyectoInstalaciones(proyectoId);
      setRows(data);
    } catch (err) {
      console.error("Error al cargar instalaciones del proyecto:", err);
      setError(
        isProyectoInstalacionApiError(err)
          ? err.message
          : "No se pudieron cargar las instalaciones."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when tab/proyecto changes
  }, [active, proyectoId]);

  const setForm = (form: InstalacionFormValue) => {
    onDraftChange({ ...draft, form });
  };

  const setSubtipo = (subtipo: InstalacionSubtipo) => {
    onDraftChange({ ...draft, subtipo });
  };

  const resetDraft = () => {
    onDraftChange({ form: { ...EMPTY_INSTALACION_FORM }, subtipo: "" });
    setEditingId(null);
  };

  const openEdit = (row: ProyectoInstalacionRow) => {
    setEditingId(row.id);
    onDraftChange({
      form: payloadFromApi(row.payload),
      subtipo: subtipoFromPayload(row.payload),
    });
    setError("");
  };

  const handleSaveInstalacion = async () => {
    if (proyectoId == null) {
      setError("Guarda el proyecto con el botón Guardar de abajo para registrar esta instalación.");
      return;
    }
    if (!draft.subtipo) {
      setError("Selecciona el tipo de instalación.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = buildInstalacionPayload(draft.form, draft.subtipo);
      if (editingId != null) {
        const updated = await updateProyectoInstalacion(editingId, {
          proyecto: proyectoId,
          payload,
        });
        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createProyectoInstalacion({ proyecto: proyectoId, payload });
        setRows((prev) => [created, ...prev]);
      }
      resetDraft();
    } catch (err) {
      console.error("Error al guardar instalación:", err);
      setError(
        isProyectoInstalacionApiError(err) ? err.message : "No se pudo guardar la instalación."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      await deleteProyectoInstalacion(deletingRow.id);
      setRows((prev) => prev.filter((r) => r.id !== deletingRow.id));
      if (editingId === deletingRow.id) resetDraft();
      setDeletingRow(null);
    } catch (err) {
      console.error("Error al eliminar instalación:", err);
      setError(
        isProyectoInstalacionApiError(err) ? err.message : "No se pudo eliminar la instalación."
      );
    } finally {
      setDeleting(false);
    }
  };

  const iconGps = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );

  const sectionHint =
    proyectoId == null
      ? "Completa el tipo de instalación. Se guardará al guardar el proyecto."
      : "Registra una o más instalaciones de este proyecto.";

  return (
    <>
      <section className={proyectoOrdenSectionClass} aria-labelledby={sectionTitleId}>
        <div className={proyectoOrdenSectionHeadClass}>
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <span className="mt-0.5 inline-flex shrink-0 text-[#ea580c] dark:text-[#fb923c]" aria-hidden>
              {iconGps}
            </span>
            <div className="min-w-0">
              <p className={proyectoOrdenEyebrowClass}>Paso 2</p>
              <h4 id={sectionTitleId} className={`${proyectoOrdenTitleClass} mt-0.5`}>
                Instalaciones
              </h4>
              <p className={proyectoOrdenHintClass}>{sectionHint}</p>
            </div>
          </div>
        </div>
        <div className={proyectoOrdenCardClass}>
          {proyectoId != null ? (
            <div className="mb-4 space-y-2">
              {loading ? (
                <div className={proyectoEmptyPanelClass} role="status" aria-live="polite">
                  Cargando instalaciones…
                </div>
              ) : rows.length === 0 ? (
                <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]" role="status">
                  Aún no hay instalaciones guardadas en este proyecto.
                </p>
              ) : (
                <ul className="space-y-2" aria-label="Instalaciones del proyecto">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-[#e7ded0] bg-white/80 px-3 py-2.5 dark:border-[#334155] dark:bg-[#0f172a]/60"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                          {displayInstalacionFolio(row.idx)}
                          {editingId === row.id ? (
                            <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-[#ea580c]">
                              Editando
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-[#78716c] dark:text-[#8ea0b8]">
                          Placas {payloadPlacas(row.payload)} · IMEI {payloadImei(row.payload)}
                        </p>
                      </div>
                      {!disabled ? (
                        <div className={erpRowActionBarClass}>
                          <button
                            type="button"
                            className={erpRowActionBtnClass}
                            aria-label={`Editar ${displayInstalacionFolio(row.idx)}`}
                            onClick={() => openEdit(row)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={erpRowActionBtnClass}
                            aria-label={`Eliminar ${displayInstalacionFolio(row.idx)}`}
                            onClick={() => setDeletingRow(row)}
                          >
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {error ? (
            <p className="mb-3 text-sm text-rose-600 dark:text-rose-400" role="alert">
              {error}
            </p>
          ) : null}

          <InstalacionForm
            value={draft.form}
            subtipo={draft.subtipo}
            onChange={setForm}
            onSubtipoChange={setSubtipo}
            disabled={disabled || saving}
          />

          {proyectoId != null ? (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {editingId != null ? (
                <button
                  type="button"
                  className={erpSecondaryBtnClass}
                  disabled={saving}
                  onClick={resetDraft}
                >
                  Cancelar edición
                </button>
              ) : null}
              <button
                type="button"
                className={erpPrimaryBtnClass}
                disabled={disabled || saving}
                onClick={() => void handleSaveInstalacion()}
              >
                {saving
                  ? "Guardando…"
                  : editingId != null
                    ? "Actualizar instalación"
                    : "Guardar instalación"}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#78716c] dark:text-[#8ea0b8]" role="note">
              Al pulsar <strong className="font-semibold text-[#1c1917] dark:text-[#f8fafc]">Guardar</strong>{" "}
              abajo se crea el proyecto y, si elegiste un tipo de instalación, también esta ficha.
            </p>
          )}
        </div>
      </section>

      <Modal
        isOpen={Boolean(deletingRow)}
        onClose={() => {
          if (!deleting) setDeletingRow(null);
        }}
        closeOnBackdropClick={!deleting}
        closeOnEscape={!deleting}
        showCloseButton={!deleting}
        ariaLabelledBy={deleteTitleId}
        className={`${erpDeleteModalClass} z-[100003]`}
      >
        <div className={erpDeleteModalPanelClass}>
          <h3
            id={deleteTitleId}
            className="text-center text-base font-semibold text-[#1c1917] dark:text-[#f8fafc]"
          >
            Eliminar instalación
          </h3>
          <p className="mt-2 text-center text-sm text-[#57534e] dark:text-[#94a3b8]">
            ¿Eliminar {deletingRow ? displayInstalacionFolio(deletingRow.idx) : "esta instalación"}?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className={erpSecondaryBtnClass}
              disabled={deleting}
              onClick={() => setDeletingRow(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={erpDangerBtnClass}
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
