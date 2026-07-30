import { useEffect, useId, useState } from "react";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Modal } from "@/components/ui/modal";
import {
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
} from "../../OrdenesTrabajo/ordenTrabajoStyles";
import InstalacionForm from "./InstalacionForm";
import { InstalacionFormSection } from "./InstalacionFormSection";
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
  instalacionDangerActionClass,
  instalacionFolioBadgeClass,
  instalacionGhostActionClass,
  instalacionListCardClass,
  instalacionListCardEditingClass,
  instalacionTipoBadgeClass,
  proyectoEmptyPanelClass,
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
 * Pestaña Instalaciones: misma jerarquía visual que Cliente / Operación
 * (eyebrow + título + tarjeta). Lista registrada + ficha de datos.
 */
export function ProyectoFormInstalacionesPanel({
  proyectoId,
  active,
  disabled = false,
  draft,
  onDraftChange,
}: Props) {
  const deleteTitleId = useId();
  const listStatusId = useId();
  const formStatusId = useId();

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
    requestAnimationFrame(() => {
      document.getElementById("proyecto-sec-instalacion-datos")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
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

  const iconList = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );

  const iconGps = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );

  const formEyebrow = editingId != null ? "Editando" : proyectoId == null ? "Paso 2" : "Nueva";
  const formTitle = editingId != null ? "Editar instalación" : "Datos de la instalación";
  const formHint =
    proyectoId == null
      ? "Completa el tipo; se registrará al guardar el proyecto abajo."
      : editingId != null
        ? "Modifica los campos y confirma con Actualizar instalación."
        : "Completa la ficha GPS y guárdala en este proyecto.";

  return (
    <div className="space-y-5">
      {proyectoId != null ? (
        <InstalacionFormSection
          titleId="proyecto-sec-instalaciones-lista"
          eyebrow="Registro"
          title="Instalaciones del proyecto"
          hint={
            rows.length > 0
              ? `${rows.length} ${rows.length === 1 ? "ficha registrada" : "fichas registradas"}.`
              : "Aún no hay fichas; usa el formulario de abajo para agregar la primera."
          }
          icon={iconList}
          card={!loading && rows.length > 0}
        >
          {loading ? (
            <div
              id={listStatusId}
              className={proyectoEmptyPanelClass}
              role="status"
              aria-live="polite"
            >
              <p className="text-sm text-gray-600 dark:text-gray-300">Cargando instalaciones…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className={proyectoEmptyPanelClass} role="status">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                No hay instalaciones guardadas en este proyecto.
              </p>
              <p className="mt-1.5 text-xs text-[#78716c] dark:text-[#8ea0b8]">
                Completa los datos GPS en la sección inferior y pulsa Guardar instalación.
              </p>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Instalaciones del proyecto">
              {rows.map((row) => {
                const folio = displayInstalacionFolio(row.idx);
                const isEditing = editingId === row.id;
                const tipo = subtipoFromPayload(row.payload);
                return (
                  <li
                    key={row.id}
                    className={`${instalacionListCardClass}${isEditing ? ` ${instalacionListCardEditingClass}` : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={instalacionFolioBadgeClass}>{folio}</span>
                        {tipo === "gps" ? (
                          <span className={instalacionTipoBadgeClass}>GPS</span>
                        ) : null}
                        {isEditing ? (
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide text-[#ea580c] dark:text-[#fdba74]"
                            aria-current="true"
                          >
                            En edición
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        Placas {payloadPlacas(row.payload)}
                        {" · "}
                        IMEI {payloadImei(row.payload)}
                      </p>
                    </div>
                    {!disabled ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          className={instalacionGhostActionClass}
                          aria-label={`Editar ${folio}`}
                          aria-pressed={isEditing}
                          onClick={() => openEdit(row)}
                        >
                          <PencilIcon className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={instalacionDangerActionClass}
                          aria-label={`Eliminar ${folio}`}
                          aria-haspopup="dialog"
                          onClick={() => setDeletingRow(row)}
                        >
                          <TrashBinIcon className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </InstalacionFormSection>
      ) : null}

      <InstalacionFormSection
        titleId="proyecto-sec-instalacion-datos"
        eyebrow={formEyebrow}
        title={formTitle}
        hint={formHint}
        icon={iconGps}
      >
        <div
          id={formStatusId}
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          {editingId != null
            ? `Editando ${displayInstalacionFolio(rows.find((r) => r.id === editingId)?.idx)}`
            : "Formulario de nueva instalación"}
        </div>

        {error ? (
          <p className="mb-1 text-sm font-medium text-rose-600 dark:text-rose-400" role="alert">
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
          <div className="mt-1 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-white/10">
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
          <div
            className="mt-1 rounded-xl border border-dashed border-[#e2d9ca] bg-[#fffdf8]/90 px-3.5 py-3 dark:border-[#334155] dark:bg-[#0f172a]/40"
            role="note"
          >
            <p className="text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
              Al pulsar{" "}
              <strong className="font-semibold text-[#1c1917] dark:text-[#f8fafc]">Guardar</strong>{" "}
              en el pie del modal se crea el proyecto y, si elegiste un tipo, también esta ficha GPS.
            </p>
          </div>
        )}
      </InstalacionFormSection>

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
            Esta acción no se puede deshacer.
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
    </div>
  );
}
