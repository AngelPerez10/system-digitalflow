/**
 * Aviso «Reasignado · Deshacer» del tablero Equipo (sin cambios de diseño:
 * se movió a su propio archivo tal cual estaba en la página).
 */
import { Undo2, X } from "lucide-react";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";

export function EquipoUndoToast({
  token,
  message,
  onUndo,
  onClose,
}: {
  token: number;
  message: string;
  onUndo: () => void;
  onClose: () => void;
}) {
  return (
    <div
      key={token}
      role="status"
      aria-live="polite"
      className="cot-pop fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[900] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#17235B] py-2.5 pl-4 pr-2 text-white shadow-[0_18px_40px_-16px_rgba(9,9,11,0.55)] dark:bg-[#1B2A63]"
    >
      <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
        Reasignado: <span className="font-mono">{message}</span>
      </p>
      <button
        type="button"
        onClick={onUndo}
        className={`cot-press inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white/12 px-3 text-[13px] font-semibold hover:bg-white/20 ${focusRing}`}
      >
        <Undo2 className="size-4" aria-hidden />
        Deshacer
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white ${focusRing}`}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
