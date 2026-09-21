import { useEffect, useId, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import { fetchApi } from "@/config/api";
import {
  claudeBodyClass as erpBodyClass,
  cotSubheadingClass as erpSubheadingClass,
  primaryActionBtnClass as erpPrimaryBtnClass,
  secondaryActionBtnClass as erpSecondaryBtnClass,
} from "../shared/cotizacionFormStyles";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";

export type CotizacionMarcarEnviadaTarget = {
  id: number;
  idx?: number;
  cliente?: string;
  /** Nota ya registrada: se precarga para leerla y editarla sin perderla. */
  comentario?: string;
  enviadoPor?: string;
  enviadoEn?: string;
};

type Props = {
  open: boolean;
  cotizacion: CotizacionMarcarEnviadaTarget | null;
  onClose: () => void;
  onMarked?: (data: {
    enviado_por_username?: string;
    enviado_por_full_name?: string;
    enviado_en?: string;
    enviado_comentario?: string;
  }) => void;
  onError?: (message: string) => void;
};

const panelClass =
  "rounded-[20px] border border-[#E7E7EA] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]";

const sendGlyph = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

export default function CotizacionMarcarEnviadaModal({
  open,
  cotizacion,
  onClose,
  onMarked,
  onError,
}: Props) {
  const titleId = useId().replace(/:/g, "");
  const descId = useId().replace(/:/g, "");
  const errorId = useId().replace(/:/g, "");

  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (!open) return;
    setComentario(String(cotizacion?.comentario || ""));
    setFieldError("");
  }, [open, cotizacion?.id, cotizacion?.comentario]);

  const folio = formatDocumentFolio(
    FOLIO_SERIE.cotizacion,
    cotizacion?.idx != null && Number(cotizacion.idx) > 0 ? cotizacion.idx : cotizacion?.id
  );
  const clienteNombre = String(cotizacion?.cliente || "").trim() || "Sin cliente";
  const registroPrevio = String(cotizacion?.enviadoPor || "").trim();
  const registroPrevioFecha = String(cotizacion?.enviadoEn || "").trim();

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (!cotizacion?.id || saving) return;
    const nota = comentario.trim();
    if (!nota) {
      setFieldError("Escribe un comentario para registrar el envío.");
      return;
    }
    setFieldError("");
    setSaving(true);
    try {
      const resp = await fetchApi(`/api/cotizaciones/${cotizacion.id}/marcar-enviada/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario: nota }),
      });
      const data = (await resp.json().catch(() => null)) as
        | {
            detail?: string;
            enviado_por_username?: string;
            enviado_por_full_name?: string;
            enviado_en?: string;
            enviado_comentario?: string;
          }
        | null;
      if (!resp.ok) {
        const msg =
          (data && typeof data.detail === "string" && data.detail) ||
          `No se pudo marcar como enviada (HTTP ${resp.status}).`;
        setFieldError(msg);
        onError?.(msg);
        return;
      }
      onMarked?.(data || {});
      onClose();
    } catch {
      const msg = "Error de red al marcar la cotización como enviada.";
      setFieldError(msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      closeOnBackdropClick={false}
      closeOnEscape={!saving}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
      className="mx-4 w-full max-w-md overflow-visible bg-transparent p-0 shadow-none sm:mx-auto dark:bg-transparent"
    >
      <div className={`${panelClass} relative overflow-hidden`} aria-busy={saving || undefined}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#1B5CFF] via-[#4B7CFF] to-transparent"
          aria-hidden="true"
        />
        <div className="relative space-y-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1B5CFF] text-white shadow-sm">
              {sendGlyph}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1B5CFF] dark:text-[#4B7CFF]">
                {folio || "Cotización"}
              </p>
              <h2 id={titleId} className={`${erpSubheadingClass} mt-0.5`}>
                {registroPrevio ? "Seguimiento del envío" : "Marcar como enviada"}
              </h2>
              <p id={descId} className={`mt-1 text-xs ${erpBodyClass}`}>
                {registroPrevio
                  ? "Revisa o actualiza la nota de seguimiento. Al guardar se registra tu nombre y la hora actual."
                  : "Regístralo cuando ya le enviaste la cotización al cliente y estás en espera de su respuesta, para que cualquier otro usuario sepa en qué quedó."}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] px-3.5 py-2.5 dark:border-[#273244] dark:bg-[#0f172a]/80">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8ea0b8]">
              Cliente
            </p>
            <p className="truncate text-sm font-medium text-[#09090B] dark:text-[#f8fafc]" title={clienteNombre}>
              {clienteNombre}
            </p>
            {registroPrevio ? (
              <p className="mt-2 border-t border-[#E7E7EA] pt-2 text-xs text-[#52525B] dark:border-[#273244] dark:text-[#B7C1D1]">
                Registro actual: {registroPrevio}
                {registroPrevioFecha
                  ? ` · ${new Date(registroPrevioFecha).toLocaleString("es-MX", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}`
                  : ""}
              </p>
            ) : null}
          </div>

          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            <Label htmlFor="cotizacion-marcar-enviada-comentario">Comentario</Label>
            <textarea
              id="cotizacion-marcar-enviada-comentario"
              name="comentario"
              value={comentario}
              onChange={(e) => {
                setComentario(e.target.value);
                if (fieldError) setFieldError("");
              }}
              placeholder="Ej. El cliente dijo que lo revisaría con su jefe y responde el lunes."
              disabled={saving}
              required
              rows={4}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? errorId : undefined}
              className="min-h-24 w-full resize-y rounded-lg border border-[#E7E7EA] bg-white px-3 py-2.5 text-sm leading-relaxed text-[#09090B] shadow-theme-xs placeholder:text-[#A1A1AA] focus:border-[#1B5CFF] focus:outline-none focus:ring-3 focus:ring-[#1B5CFF]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#0f172a] dark:text-white/90 dark:placeholder:text-white/30"
            />
            {fieldError ? (
              <p id={errorId} className="text-xs text-[#c64545]" role="alert">
                {fieldError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className={`${erpSecondaryBtnClass} sm:flex-1`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                aria-busy={saving || undefined}
                className={`${erpPrimaryBtnClass} sm:flex-1`}
              >
                {saving ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden="true"
                    />
                    Guardando…
                  </>
                ) : (
                  <>
                    {sendGlyph}
                    {registroPrevio ? "Guardar seguimiento" : "Marcar como enviada"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
