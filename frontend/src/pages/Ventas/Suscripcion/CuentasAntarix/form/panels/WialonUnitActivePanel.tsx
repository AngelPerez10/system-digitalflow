import { cn } from "@/lib/utils";
import {
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
} from "../../shared/cuentasAntarixStyles";
import { wialonEyebrowClass, wialonUiBadge, wialonUiCaption } from "../chrome/WialonModalChrome";

type Props = {
  unitIsActive: boolean;
  canEdit: boolean;
  confirmDeactivate: boolean;
  activeBusy: boolean;
  saving: boolean;
  loading: boolean;
  onAskDeactivate: () => void;
  onCancelConfirm: () => void;
  onConfirmDeactivate: () => void;
  onReactivate: () => void;
};

export default function WialonUnitActivePanel({
  unitIsActive,
  canEdit,
  confirmDeactivate,
  activeBusy,
  saving,
  loading,
  onAskDeactivate,
  onCancelConfirm,
  onConfirmDeactivate,
  onReactivate,
}: Props) {
  const busy = activeBusy || saving || loading;
  const showConfirm = unitIsActive && confirmDeactivate;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-[border-color,background-color,box-shadow] duration-300 motion-reduce:transition-none",
        unitIsActive
          ? "border-[#E7E7EA]/95 bg-[#ffffff] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75)] dark:border-[#273244] dark:bg-[#0f172a]/70 dark:shadow-none"
          : "border-[#D3D3D8]/90 bg-[#FAFAFA]/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)] dark:border-[#273244]/70 dark:bg-[#18181b]/55 dark:shadow-none",
        showConfirm &&
          "border-[#1B5CFF]/45 bg-[#F1F5FF] dark:border-[#4B7CFF]/40 dark:bg-[#0f172a]/35",
      )}
      role="region"
      aria-labelledby="unit-active-status-label"
      aria-describedby="unit-active-help"
    >
      {/* Accent rail */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          showConfirm
            ? "bg-[#1B5CFF]"
            : unitIsActive
              ? "bg-emerald-500"
              : "bg-[#A1A1AA] dark:bg-[#71717a]",
        )}
        aria-hidden
      />

      {/* Soft atmosphere */}
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl",
          showConfirm
            ? "bg-[#1B5CFF]/20"
            : unitIsActive
              ? "bg-emerald-400/15"
              : "bg-[#A1A1AA]/20 dark:bg-zinc-500/10",
        )}
        aria-hidden
      />

      <div className="relative grid gap-4 p-4 pl-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5 sm:pl-6">
        {/* Power glyph */}
        <div
          className={cn(
            "relative mx-auto flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:mx-0",
            showConfirm
              ? "bg-[#1B5CFF]/15 text-[#1244D1] ring-1 ring-[#1B5CFF]/35 dark:bg-[#4B7CFF]/15 dark:text-[#4B7CFF] dark:ring-[#4B7CFF]/30"
              : unitIsActive
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/50"
                : "bg-[#ebe6df] text-[#6E6E77] ring-1 ring-[#D3D3D8] dark:bg-[#27272a] dark:text-[#a1a1aa] dark:ring-[#273244]",
          )}
          aria-hidden
        >
          <svg
            className="h-7 w-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M12 2v10" strokeLinecap="round" />
            <path d="M6.7 5.8a8 8 0 1 0 10.6 0" strokeLinecap="round" />
          </svg>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#ffffff] dark:border-[#0f172a]",
              showConfirm
                ? "bg-[#1B5CFF]"
                : unitIsActive
                  ? "bg-emerald-500"
                  : "bg-[#A1A1AA] dark:bg-[#71717a]",
            )}
          />
        </div>

        {/* Copy */}
        <div className="min-w-0 text-center sm:text-left">
          <p className={wialonEyebrowClass}>Estado en Wialon</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <p
              id="unit-active-status-label"
              className="text-xl font-medium tracking-[-0.02em] text-[#09090B] dark:text-[#f8fafc] sm:text-2xl"
            >
              {showConfirm ? "¿Desactivar?" : unitIsActive ? "Activa" : "Inactiva"}
            </p>
            {!showConfirm ? (
              <span
                className={cn(
                  wialonUiBadge,
                  "ring-1 ring-inset",
                  unitIsActive
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
                    : "bg-[#ebe6df] text-[#52525B] ring-[#D3D3D8] dark:bg-[#27272a] dark:text-[#d4d4d8] dark:ring-[#273244]",
                )}
              >
                {unitIsActive ? "En servicio" : "Fuera de servicio"}
              </span>
            ) : null}
          </div>
          <p className={cn("mt-1.5 max-w-md", wialonUiCaption)} id="unit-active-help">
            {showConfirm
              ? "La unidad dejará de contar en facturación. No se borra el dispositivo ni su historial; puedes reactivarla después."
              : unitIsActive
                ? "La unidad cuenta en Wialon. Desactivar no elimina el dispositivo ni su historial."
                : "La unidad está fuera de facturación. Los datos se conservan; reactívala cuando vuelva a operar."}
          </p>
          {showConfirm ? (
            <p className="sr-only" role="status" aria-live="polite">
              Confirma si deseas desactivar esta unidad.
            </p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[11.5rem]">
          {!canEdit ? (
            <p
              className={cn(
                wialonUiCaption,
                "rounded-xl border border-dashed border-[#E7E7EA] px-3 py-2.5 text-center dark:border-[#273244]",
              )}
            >
              Solo lectura
            </p>
          ) : showConfirm ? (
            <>
              <button
                type="button"
                className={cn(
                  erpPrimaryBtnClass,
                  "w-full min-h-11 justify-center bg-[#1244D1] hover:bg-[#1244D1] focus-visible:outline-[#1244D1]",
                )}
                disabled={busy}
                aria-busy={activeBusy || undefined}
                onClick={onConfirmDeactivate}
              >
                {activeBusy ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeOpacity="0.25"
                        strokeWidth="2"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Desactivando…
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M12 2v10" strokeLinecap="round" />
                      <path d="M6.7 5.8a8 8 0 1 0 10.6 0" strokeLinecap="round" />
                    </svg>
                    Sí, desactivar
                  </>
                )}
              </button>
              <button
                type="button"
                className={cn(erpSecondaryBtnClass, "w-full min-h-11 justify-center")}
                disabled={busy}
                onClick={onCancelConfirm}
              >
                Cancelar
              </button>
            </>
          ) : unitIsActive ? (
            <button
              type="button"
              className={cn(
                erpSecondaryBtnClass,
                "w-full min-h-11 justify-center border-[#D3D3D8] text-[#3d3d3a] hover:border-[#1244D1]/40 hover:bg-[#F1F5FF] hover:text-[#1244D1] dark:border-[#273244] dark:text-[#F8FAFC] dark:hover:border-[#4B7CFF]/40 dark:hover:bg-[#0f172a]/40 dark:hover:text-[#4B7CFF]",
              )}
              disabled={busy}
              onClick={onAskDeactivate}
            >
              <svg
                className="h-4 w-4 opacity-80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M12 2v10" strokeLinecap="round" />
                <path d="M6.7 5.8a8 8 0 1 0 10.6 0" strokeLinecap="round" />
              </svg>
              Desactivar
            </button>
          ) : (
            <button
              type="button"
              className={cn(erpPrimaryBtnClass, "w-full min-h-11 justify-center")}
              disabled={busy}
              aria-busy={activeBusy || undefined}
              onClick={onReactivate}
            >
              {activeBusy ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeOpacity="0.25"
                      strokeWidth="2"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Reactivando…
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M12 2v10" strokeLinecap="round" />
                    <path d="M6.7 5.8a8 8 0 1 0 10.6 0" strokeLinecap="round" />
                  </svg>
                  Reactivar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
