import { useEffect, useId, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { fetchApi } from "@/config/api";
import { MailIcon } from "@/icons";
import {
  claudeBodyClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSubheadingClass,
  sectionLabelOrangeClass,
} from "../ordenTrabajoStyles";
import { displayOrdenFolio } from "./useOrdenesShared";

export type OrdenEnviarPdfTarget = {
  id: number;
  folio?: string | null;
  idx?: number;
  cliente?: string;
  cliente_id?: number | null;
  status?: string;
};

type Props = {
  open: boolean;
  orden: OrdenEnviarPdfTarget | null;
  /** Correo precargado desde el listado local (cliente / contacto principal). */
  initialCorreo?: string;
  onClose: () => void;
  onSent?: (correo: string) => void;
  onError?: (message: string) => void;
};

function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const pdfGlyph = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const sendGlyph = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

export default function OrdenEnviarPdfModal({
  open,
  orden,
  initialCorreo = "",
  onClose,
  onSent,
  onError,
}: Props) {
  const titleId = useId().replace(/:/g, "");
  const descId = useId().replace(/:/g, "");
  const hintId = useId().replace(/:/g, "");
  const errorId = useId().replace(/:/g, "");
  const statusId = useId().replace(/:/g, "");

  const [correo, setCorreo] = useState("");
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [sending, setSending] = useState(false);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (!open || !orden?.id) return;

    let cancelled = false;
    setFieldError("");
    setCorreo(String(initialCorreo || "").trim());
    setLoadingPrefill(true);

    void (async () => {
      try {
        const resp = await fetchApi(`/api/ordenes/${orden.id}/correo-sugerido/`);
        if (!resp.ok) return;
        const data = (await resp.json().catch(() => null)) as { correo?: string } | null;
        const suggested = String(data?.correo || "").trim();
        if (!cancelled && suggested) {
          setCorreo(suggested);
        }
      } catch {
        // Mantener initialCorreo si falla la precarga.
      } finally {
        if (!cancelled) setLoadingPrefill(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, orden?.id, initialCorreo]);

  const folio = displayOrdenFolio(orden || {});
  const clienteNombre = String(orden?.cliente || "").trim() || "Sin cliente";
  const pdfFileName =
    folio && folio !== "—" ? `Orden_${folio}.pdf` : orden?.id != null ? `Ordenes_Servicio_${orden.id}.pdf` : "Orden_Servicio.pdf";
  const hasPrefill = Boolean(String(correo || "").trim());

  const handleClose = () => {
    if (sending) return;
    onClose();
  };

  const handleSend = async () => {
    if (!orden?.id || sending) return;
    const to = correo.trim();
    if (!isValidEmail(to)) {
      setFieldError("Ingresa un correo electrónico válido.");
      return;
    }
    setFieldError("");
    setSending(true);
    try {
      const resp = await fetchApi(`/api/ordenes/${orden.id}/enviar-pdf/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: to }),
      });
      const data = (await resp.json().catch(() => null)) as
        | { detail?: string; correo?: string }
        | null;
      if (!resp.ok) {
        const msg =
          (data && typeof data.detail === "string" && data.detail) ||
          `No se pudo enviar el PDF (HTTP ${resp.status}).`;
        onError?.(msg);
        return;
      }
      onSent?.(String(data?.correo || to));
      onClose();
    } catch {
      onError?.("Error de red al enviar el PDF por correo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      closeOnBackdropClick={!sending}
      closeOnEscape={!sending}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
      className={`${erpDeleteModalClass} overflow-visible bg-transparent p-0 shadow-none dark:bg-transparent`}
    >
      <div
        className={`${erpDeleteModalPanelClass} relative overflow-hidden`}
      >
        {/* Acento superior Intrax */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ff801f] via-[#ffa057] to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#ff801f]/10 blur-2xl dark:bg-[#ff801f]/15"
          aria-hidden="true"
        />

        <div className="relative space-y-5">
          {/* Cabecera */}
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">
              <MailIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={sectionLabelOrangeClass}>Orden resuelta</p>
              <h2 id={titleId} className={`${erpSubheadingClass} mt-0.5`}>
                Enviar PDF por correo
              </h2>
              <p id={descId} className={`mt-1 text-xs ${claudeBodyClass}`}>
                Revisa el destinatario y envía el comprobante. Puedes omitir y usar el icono de
                correo más tarde.
              </p>
            </div>
          </div>

          {/* Stub de orden + adjunto */}
          <div className="overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]/80">
            <div className="flex items-center justify-between gap-3 border-b border-[#e7ded0]/80 px-3.5 py-2.5 dark:border-[#334155]">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8]">
                  Folio
                </p>
                <p className="truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                  #{folio}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8]">
                  Cliente
                </p>
                <p
                  className="truncate text-sm font-medium text-[#44403c] dark:text-[#e5e7eb]"
                  title={clienteNombre}
                >
                  {clienteNombre}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                {pdfGlyph}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#1c1917] dark:text-white">
                  {pdfFileName}
                </p>
                <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                  Se adjuntará al enviar
                </p>
              </div>
            </div>
          </div>

          {/* Correo */}
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="orden-enviar-pdf-correo">Correo del cliente</Label>
              {!loadingPrefill && (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    hasPrefill
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-[#a8a29e] dark:text-[#64748b]"
                  }`}
                >
                  {hasPrefill ? "Precargado" : "Manual"}
                </span>
              )}
            </div>
            <Input
              id="orden-enviar-pdf-correo"
              type="email"
              name="correo"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                if (fieldError) setFieldError("");
              }}
              placeholder="cliente@correo.com"
              disabled={sending || loadingPrefill}
              required
              error={Boolean(fieldError)}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={
                [fieldError ? errorId : hintId, loadingPrefill ? statusId : null]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
            />
            <div aria-live="polite" className="min-h-[1.1rem]">
              {fieldError ? (
                <p id={errorId} className="text-xs text-[#c64545]" role="alert">
                  {fieldError}
                </p>
              ) : loadingPrefill ? (
                <p id={statusId} className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
                  Cargando correo del cliente…
                </p>
              ) : (
                <p id={hintId} className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
                  Si el cliente no tenía correo, el que uses aquí se guardará en su ficha.
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                className={`${erpSecondaryBtnClass} sm:flex-1`}
              >
                Enviar después
              </button>
              <button
                type="submit"
                disabled={sending || loadingPrefill}
                aria-busy={sending || undefined}
                className={`${erpPrimaryBtnClass} sm:flex-1`}
              >
                {sending ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black"
                      aria-hidden="true"
                    />
                    Enviando…
                  </>
                ) : (
                  <>
                    {sendGlyph}
                    Enviar PDF
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
