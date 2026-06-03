import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSearchInputClass,
  erpSecondaryBtnClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import type { WialonUserRow, WialonUserUpdatePayload } from "./wialonTypes";

const uiLabel = "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8]";
const uiCaption = "text-xs font-normal leading-relaxed text-[#78716c] dark:text-[#8ea0b8]";

const editModalClass =
  "my-2 w-[calc(100vw-1rem)] max-w-lg rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_30px_90px_-45px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b] sm:my-auto sm:rounded-3xl";

type Props = {
  user: WialonUserRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: WialonUserRow) => void;
};

export default function EditWialonUserModal({ user, isOpen, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [dealerRights, setDealerRights] = useState("No");
  const [status, setStatus] = useState("Activo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !isOpen) return;
    setName(user.name === "—" ? "" : user.name);
    setDealerRights(user.dealer_rights);
    setStatus(user.status);
    setError("");
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    const baselineName = user.name === "—" ? "" : user.name;
    const trimmedName = name.trim();
    const payload: WialonUserUpdatePayload = {};

    if (trimmedName !== baselineName) {
      payload.name = trimmedName;
    }
    if (dealerRights !== user.dealer_rights) {
      payload.dealer_rights = dealerRights;
    }
    if (status !== user.status) {
      payload.status = status;
      payload.enabled = status === "Activo";
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetchApi(`/api/wialon/usuarios/${user.wialon_id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      const updated = (data?.user ?? data) as WialonUserRow | null;
      if (!updated || updated.wialon_id == null) {
        setError("Wialon respondió sin datos de la cuenta actualizada.");
        return;
      }
      onSaved({ ...user, ...updated, wialon_id: Number(updated.wialon_id) });
      onClose();
    } catch {
      setError("No se pudo guardar en Wialon.");
    } finally {
      setSaving(false);
    }
  };

  const titleId = "edit-wialon-user-title";

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={!saving} ariaLabelledBy={titleId} className={editModalClass}>
      <form onSubmit={handleSubmit} className="flex flex-col" style={erpSansStyle}>
        <header className="border-b border-[#e7ded0] px-5 py-4 dark:border-[#334155] sm:px-6 sm:py-5">
          <p className={cn(uiLabel, "text-[#ea580c] dark:text-[#fb923c]")}>Editar en Wialon</p>
          <h2 id={titleId} className={cn("mt-1", erpSubheadingClass)}>
            {user?.name || "Cuenta"}
          </h2>
          <p className={cn("mt-1 tabular-nums", uiCaption)}>
            ID login {user?.user_id || "—"} · Los cambios se aplican en Wialon Hosting.
          </p>
        </header>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div>
            <label htmlFor="wialon-edit-name" className={uiLabel}>
              Nombre de cuenta
            </label>
            <input
              id="wialon-edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(erpSearchInputClass, "mt-2 w-full")}
              required
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="wialon-edit-dealer" className={uiLabel}>
              Derechos de distribuidor
            </label>
            <select
              id="wialon-edit-dealer"
              value={dealerRights}
              onChange={(e) => setDealerRights(e.target.value)}
              className={cn(erpSearchInputClass, "mt-2 w-full")}
              disabled={saving}
            >
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
          </div>

          <div>
            <label htmlFor="wialon-edit-status" className={uiLabel}>
              Status de cuenta
            </label>
            <select
              id="wialon-edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={cn(erpSearchInputClass, "mt-2 w-full")}
              disabled={saving}
            >
              <option value="Activo">Activo</option>
              <option value="Bloqueado">Bloqueado</option>
            </select>
            <p className={cn("mt-2", uiCaption)}>
              Bloquear o activar la cuenta de facturación (no modifica el ID de login).
            </p>
          </div>

          <div className="rounded-xl border border-[#e7ded0]/90 bg-[#fcfaf6]/80 px-3 py-2.5 dark:border-[#334155] dark:bg-[#0f172a]/50">
            <p className={uiLabel}>Solo lectura</p>
            <p className={cn("mt-1 text-sm text-[#57534e] dark:text-[#cbd5e1]", uiCaption)}>
              Creador: {user?.creator || "—"} · Cuenta padre: {user?.parent_account || "—"}
            </p>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#e7ded0] px-5 py-4 dark:border-[#334155] sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={saving} className={erpSecondaryBtnClass}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={erpPrimaryBtnClass}>
            {saving ? "Guardando…" : "Guardar en Wialon"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
