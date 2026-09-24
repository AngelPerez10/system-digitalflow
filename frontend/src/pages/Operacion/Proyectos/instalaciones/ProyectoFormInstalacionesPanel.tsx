import { useEffect, useState, type CSSProperties } from "react";
import { ListOrdered, Pencil, Satellite, Trash2 } from "lucide-react";
import { AppConfirmDialog, AppModalContext } from "@/components/ui/modal-kit/ModalKit";
import { Notice, SectionCard } from "../shared/ProyectoUi";
import { btn, btnSm, emptyPanel, fontSans, iconBtn, iconBtnDanger } from "../shared/proyectoTokens";
import InstalacionForm from "./InstalacionForm";
import {
  deleteProyectoInstalacion,
  isProyectoInstalacionApiError,
  listProyectoInstalaciones,
} from "./proyectoInstalacionApi";
import {
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
 * Paso «Instalación»: fichas ya registradas + ficha en captura.
 * La ficha se guarda junto con el proyecto (botón Guardar del pie).
 */
export function ProyectoFormInstalacionesPanel({
  proyectoId,
  active,
  disabled = false,
  draft,
  onDraftChange,
}: Props) {
  const [rows, setRows] = useState<ProyectoInstalacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingRow, setDeletingRow] = useState<ProyectoInstalacionRow | null>(null);
  const editingId = draft.editingId ?? null;

  useEffect(() => {
    if (!active) return;
    if (proyectoId == null) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    listProyectoInstalaciones(proyectoId)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        console.error("Error al cargar instalaciones del proyecto:", err);
        if (!cancelled) {
          setError(isProyectoInstalacionApiError(err) ? err.message : "No se pudieron cargar las instalaciones.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, proyectoId]);

  const setForm = (form: InstalacionFormValue) => onDraftChange({ ...draft, form });
  const setSubtipo = (subtipo: InstalacionSubtipo) => onDraftChange({ ...draft, subtipo });
  const resetDraft = () => onDraftChange({ form: { ...EMPTY_INSTALACION_FORM }, subtipo: "", editingId: null });

  const openEdit = (row: ProyectoInstalacionRow) => {
    onDraftChange({
      form: payloadFromApi(row.payload),
      subtipo: subtipoFromPayload(row.payload),
      editingId: row.id,
    });
    setError("");
    requestAnimationFrame(() => {
      document.getElementById("proyecto-sec-instalacion-datos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    const target = deletingRow;
    try {
      await deleteProyectoInstalacion(target.id);
      setRows((prev) => prev.filter((r) => r.id !== target.id));
      if (editingId === target.id) resetDraft();
    } catch (err) {
      console.error("Error al eliminar instalación:", err);
      setError(isProyectoInstalacionApiError(err) ? err.message : "No se pudo eliminar la instalación.");
    }
  };

  const editingFolio = editingId != null ? displayInstalacionFolio(rows.find((r) => r.id === editingId)?.idx) : "";

  return (
    <>
      {error ? (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      ) : null}

      {proyectoId != null ? (
        <SectionCard
          id="proyecto-sec-instalaciones-lista"
          index={0}
          title="Fichas registradas"
          icon={<ListOrdered />}
          hint={
            loading
              ? "Cargando…"
              : rows.length
                ? `${rows.length} ${rows.length === 1 ? "ficha" : "fichas"} en este proyecto.`
                : "Aún no hay fichas; captura la primera abajo."
          }
          flush
        >
          {loading ? (
            <div className="space-y-2 p-4 sm:p-5" role="status" aria-label="Cargando instalaciones">
              {[0, 1].map((i) => (
                <span key={i} className="block h-14 rounded-[12px] bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#1B2539]" />
              ))}
            </div>
          ) : rows.length === 0 ? null : (
            <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" aria-label="Instalaciones del proyecto">
              {rows.map((row, i) => {
                const folio = displayInstalacionFolio(row.idx);
                const isEditing = editingId === row.id;
                return (
                  <li
                    key={row.id}
                    className={`cot-rise flex items-center gap-3 px-4 py-3 transition-colors duration-200 sm:px-5 ${
                      isEditing ? "bg-[#F5F8FF] dark:bg-[#1B2A63]/30" : ""
                    }`}
                    style={{ "--cot-i": i } as CSSProperties}
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
                      <Satellite className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{folio}</span>
                        {subtipoFromPayload(row.payload) === "gps" ? (
                          <span className="inline-flex h-5 items-center rounded-full bg-[#F4F4F5] px-2 text-[11px] font-semibold text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]">
                            GPS
                          </span>
                        ) : null}
                        {isEditing ? (
                          <span className="cot-pop text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1B5CFF] dark:text-[#7EA0FF]" aria-current="true">
                            En edición
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
                        Placas {payloadPlacas(row.payload)} · IMEI {payloadImei(row.payload)}
                      </p>
                    </div>
                    {!disabled ? (
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label={`Editar ${folio}`}
                          aria-pressed={isEditing}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={iconBtnDanger}
                          aria-label={`Eliminar ${folio}`}
                          aria-haspopup="dialog"
                          onClick={() => setDeletingRow(row)}
                        >
                          <Trash2 aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      ) : null}

      <SectionCard
        id="proyecto-sec-instalacion-datos"
        index={1}
        title={editingId != null ? `Editar ${editingFolio}` : "Nueva ficha de instalación"}
        icon={<Satellite />}
        hint={
          editingId != null
            ? "Los cambios se aplican al guardar el proyecto."
            : "Opcional. Si eliges un tipo, la ficha se registra al guardar el proyecto."
        }
        actions={
          editingId != null && !disabled ? (
            <button type="button" className={`${btn.secondary} ${btnSm}`} onClick={resetDraft}>
              Cancelar edición
            </button>
          ) : null
        }
      >
        <p className="sr-only" role="status" aria-live="polite">
          {editingId != null ? `Editando ${editingFolio}` : "Formulario de nueva instalación"}
        </p>
        {proyectoId == null && !draft.subtipo ? (
          <p className={`${emptyPanel} py-5! text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]`}>
            Si este proyecto incluye la instalación de un GPS, elige el tipo para capturar la ficha.
          </p>
        ) : null}
        <InstalacionForm
          value={draft.form}
          subtipo={draft.subtipo}
          onChange={setForm}
          onSubtipoChange={setSubtipo}
          disabled={disabled}
        />
      </SectionCard>

      <AppConfirmDialog
        open={Boolean(deletingRow)}
        onClose={() => setDeletingRow(null)}
        onConfirm={confirmDelete}
        tone="danger"
        icon={<Trash2 className="size-5" />}
        title="Eliminar instalación"
        description="La ficha se elimina de inmediato, sin esperar a guardar el proyecto. Esta acción no se puede deshacer."
        detail={
          deletingRow ? (
            <AppModalContext
              rows={[
                { label: "Ficha", value: displayInstalacionFolio(deletingRow.idx), strong: true },
                { label: "Placas", value: payloadPlacas(deletingRow.payload) },
                { label: "IMEI", value: payloadImei(deletingRow.payload) },
              ]}
            />
          ) : null
        }
        confirmLabel="Eliminar"
        busyLabel="Eliminando…"
        className={fontSans}
      />
    </>
  );
}
