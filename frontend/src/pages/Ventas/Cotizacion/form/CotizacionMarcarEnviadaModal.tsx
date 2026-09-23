import { useEffect, useId, useState } from "react";
import { Clock3, Send } from "lucide-react";
import { fetchApi } from "@/config/api";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import {
  AppModal,
  AppModalBody,
  AppModalContext,
  AppModalFooter,
  AppModalHeader,
  AppSpinner,
} from "@/components/ui/modal-kit/ModalKit";
import { appModalBtn } from "@/components/ui/modal-kit/modalKitStyles";

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

/** Frases frecuentes: un clic las agrega al comentario. */
const SUGERENCIAS = [
  "Enviada por WhatsApp.",
  "Enviada por correo.",
  "Entregada en persona.",
  "El cliente la revisará y responde esta semana.",
];

const textareaClass =
  "block min-h-28 w-full resize-y rounded-[10px] border border-[#E4E4E7] bg-white px-3.5 py-3 text-[15px] leading-relaxed text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D4D4D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] dark:focus:border-[#4B7CFF]";

export default function CotizacionMarcarEnviadaModal({
  open,
  cotizacion,
  onClose,
  onMarked,
  onError,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const errorId = useId();
  const fieldId = useId();

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

  const agregarSugerencia = (texto: string) => {
    setComentario((prev) => {
      const base = prev.trim();
      if (base.includes(texto)) return prev;
      return base ? `${base} ${texto}` : texto;
    });
    if (fieldError) setFieldError("");
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
    <AppModal open={open} onClose={handleClose} busy={saving} size="md" labelledBy={titleId} describedBy={descId}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void handleConfirm();
        }}
      >
        <AppModalHeader
          icon={<Send className="size-5" strokeWidth={1.9} />}
          tone="info"
          eyebrow={folio && folio !== "—" ? `Cotización ${folio}` : "Cotización"}
          title={registroPrevio ? "Seguimiento del envío" : "Marcar como enviada"}
          titleId={titleId}
          description={
            registroPrevio
              ? "Actualiza la nota. Al guardar se registra tu nombre y la hora."
              : "Regístralo cuando ya se la mandaste al cliente, para que el equipo sepa en qué quedó."
          }
          descriptionId={descId}
          onClose={handleClose}
          closeDisabled={saving}
        />

        <AppModalBody className="space-y-5">
          <AppModalContext rows={[{ label: "Cliente", value: <span title={clienteNombre}>{clienteNombre}</span> }]}>
            {registroPrevio ? (
              <div className="flex items-center gap-2.5 border-t border-[#F0F0F2] px-4 py-2.5 dark:border-[#1F2A3C]">
                <Clock3 className="size-4 shrink-0 text-[#1B5CFF] dark:text-[#9BB6FF]" aria-hidden />
                <p className="min-w-0 text-[13px] text-[#3F3F46] dark:text-[#D6DEEA]">
                  Último registro de <span className="font-semibold">{registroPrevio}</span>
                  {registroPrevioFecha ? (
                    <span className="text-[#71717A] dark:text-[#8EA0B8]">
                      {" · "}
                      {new Date(registroPrevioFecha).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : null}
                </p>
              </div>
            ) : null}
          </AppModalContext>

          <div>
            <label
              htmlFor={fieldId}
              className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[#3F3F46] dark:text-[#B7C1D1]"
            >
              Comentario
              <span className="text-[#C22B2B] dark:text-[#F87171]" aria-hidden>
                *
              </span>
            </label>
            <textarea
              id={fieldId}
              name="comentario"
              value={comentario}
              onChange={(e) => {
                setComentario(e.target.value);
                if (fieldError) setFieldError("");
              }}
              placeholder="Ej. Lo revisará con su jefe y responde el lunes."
              disabled={saving}
              required
              rows={4}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? errorId : undefined}
              className={`${textareaClass} ${
                fieldError ? "border-[#C22B2B]! focus:ring-[rgba(194,43,43,0.18)]! dark:border-[#F87171]!" : ""
              }`}
            />
            {fieldError ? (
              <p id={errorId} className="mt-1.5 text-[12px] font-medium text-[#C22B2B] dark:text-[#F87171]" role="alert">
                {fieldError}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Sugerencias">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => agregarSugerencia(s)}
                  disabled={saving}
                  className="rounded-full border border-[#E4E4E7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#52525B] transition-colors hover:border-[#BBD0FF] hover:bg-[#F4F7FF] hover:text-[#1244D1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 active:scale-[0.97] disabled:opacity-50 dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] dark:hover:border-[#3A4A6B] dark:hover:bg-[#1B2A63]/50 dark:hover:text-[#9BB6FF]"
                >
                  + {s.replace(/\.$/, "")}
                </button>
              ))}
            </div>
          </div>
        </AppModalBody>

        <AppModalFooter>
          <button type="button" onClick={handleClose} disabled={saving} className={appModalBtn.secondary}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={appModalBtn.primary}>
            {saving ? <AppSpinner /> : <Send className="size-4" aria-hidden />}
            {saving ? "Guardando…" : registroPrevio ? "Guardar seguimiento" : "Marcar como enviada"}
          </button>
        </AppModalFooter>
      </form>
    </AppModal>
  );
}
