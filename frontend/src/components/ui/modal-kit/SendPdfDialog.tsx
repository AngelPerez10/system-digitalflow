import { useEffect, useId, useState } from "react";
import { AlertTriangle, AtSign, Check, FileText, Mail, Send } from "lucide-react";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import {
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
  AppSpinner,
} from "./ModalKit";
import { appModalBtn } from "./modalKitStyles";

/**
 * Diálogo genérico «Enviar PDF por correo»: precarga el correo sugerido del
 * registro, valida SMTP de la cuenta y envía. Cada módulo solo pasa sus URLs
 * y textos (ver CotizacionEnviarPdfModal, OrdenEnviarPdfModal).
 */
export type SendPdfDialogProps = {
  open: boolean;
  onClose: () => void;
  /** id del registro; al cambiar, se vuelve a precargar el correo. */
  recordId: number | null;
  /** GET → `{ correo?: string }` */
  suggestedEmailUrl: string;
  /** POST `{ correo }` → respuesta del servidor (se pasa a `onSent`). */
  sendUrl: string;
  eyebrow: string;
  fileName: string;
  /** Texto bajo el nombre del archivo (normalmente el cliente). */
  recipientLabel: string;
  initialCorreo?: string;
  onSent?: (correo: string, data?: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const PASOS_ENVIO = ["Generando el PDF", "Enviando el correo"] as const;

const inputClass =
  "block min-h-12 w-full rounded-[10px] border border-[#E4E4E7] bg-white py-2.5 pl-10 pr-3 text-[15px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D4D4D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:bg-[#FAFAFA] disabled:text-[#71717A] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] dark:focus:border-[#4B7CFF] dark:disabled:bg-[#111827]";

export default function SendPdfDialog({
  open,
  onClose,
  recordId,
  suggestedEmailUrl,
  sendUrl,
  eyebrow,
  fileName,
  recipientLabel,
  initialCorreo = "",
  onSent,
  onError,
}: SendPdfDialogProps) {
  const { user } = useAuth();
  const titleId = useId();
  const descId = useId();
  const hintId = useId();
  const errorId = useId();
  const smtpAlertId = useId();
  const fieldId = useId();

  const [correo, setCorreo] = useState("");
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendPhase, setSendPhase] = useState<0 | 1>(0);
  const [fieldError, setFieldError] = useState("");
  const [smtpBlockedMessage, setSmtpBlockedMessage] = useState("");

  useEffect(() => {
    if (!open || !recordId) return;

    let cancelled = false;
    setFieldError("");
    setSmtpBlockedMessage("");
    setCorreo(String(initialCorreo || "").trim());
    setPrefilled(false);
    setLoadingPrefill(true);

    void (async () => {
      try {
        const knownSmtp = user?.smtp_configured;
        const mePromise =
          knownSmtp === true || knownSmtp === false
            ? Promise.resolve(null)
            : fetchApi("/api/me/");
        const [meRes, correoRes] = await Promise.all([
          mePromise,
          fetchApi(suggestedEmailUrl),
        ]);

        if (!cancelled) {
          if (knownSmtp === false) {
            const who = String(user?.username || "tu usuario").trim() || "tu usuario";
            setSmtpBlockedMessage(
              `La cuenta (${who}) no tiene correo SMTP configurado. Un administrador debe cargar el correo y la contraseña de webmail en Gestión de usuarios.`
            );
          } else if (meRes && meRes.ok) {
            const meData = (await meRes.json().catch(() => null)) as
              | { smtp_configured?: boolean; username?: string }
              | null;
            if (meData && meData.smtp_configured !== true) {
              const who = String(meData.username || "tu usuario").trim() || "tu usuario";
              setSmtpBlockedMessage(
                `La cuenta (${who}) no tiene correo SMTP configurado. Un administrador debe cargar el correo y la contraseña de webmail en Gestión de usuarios.`
              );
            }
          }
        }

        if (!cancelled && correoRes.ok) {
          const data = (await correoRes.json().catch(() => null)) as { correo?: string } | null;
          const suggested = String(data?.correo || "").trim();
          if (suggested) {
            setCorreo(suggested);
            setPrefilled(true);
          }
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
  }, [open, recordId, suggestedEmailUrl, initialCorreo, user?.smtp_configured, user?.username]);

  useEffect(() => {
    if (!sending) {
      setSendPhase(0);
      return;
    }
    setSendPhase(0);
    const t = window.setTimeout(() => setSendPhase(1), 2200);
    return () => window.clearTimeout(t);
  }, [sending]);

  const smtpBlocked = Boolean(smtpBlockedMessage);

  const handleClose = () => {
    if (sending) return;
    onClose();
  };

  const handleSend = async () => {
    if (!recordId || sending || smtpBlocked) return;
    const to = correo.trim();
    if (!isValidEmail(to)) {
      setFieldError("Escribe un correo válido, por ejemplo cliente@empresa.com.");
      return;
    }
    setFieldError("");
    setSending(true);
    try {
      const resp = await fetchApi(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: to }),
      });
      const data = (await resp.json().catch(() => null)) as
        | ({ detail?: string; correo?: string } & Record<string, unknown>)
        | null;
      if (!resp.ok) {
        const msg =
          (data && typeof data.detail === "string" && data.detail) ||
          `No se pudo enviar el PDF (HTTP ${resp.status}).`;
        setFieldError(msg);
        onError?.(msg);
        return;
      }
      onSent?.(String(data?.correo || to), data || undefined);
      onClose();
    } catch {
      const msg = "Error de red al enviar el PDF por correo.";
      setFieldError(msg);
      onError?.(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppModal open={open} onClose={handleClose} busy={sending} size="md" labelledBy={titleId} describedBy={descId}>
      {/* Capa de envío: dos pasos, en los colores del módulo */}
      {sending && (
        <div
          className="cot-fade absolute inset-0 z-20 flex items-center justify-center bg-white/95 px-8 backdrop-blur-[2px] dark:bg-[#111827]/95"
          role="status"
          aria-live="assertive"
        >
          <div className="w-full max-w-xs">
            <p className="text-center text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
              Enviando cotización
            </p>
            <p className="mt-1 truncate text-center text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
              a {correo.trim()}
            </p>
            <ol className="mt-6 space-y-3">
              {PASOS_ENVIO.map((paso, i) => {
                const done = sendPhase > i;
                const active = sendPhase === i;
                return (
                  <li key={paso} className="flex items-center gap-3">
                    <span
                      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                        done
                          ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                          : active
                            ? "bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
                            : "bg-[#F4F4F5] text-[#A1A1AA] dark:bg-[#1B2539] dark:text-[#64748B]"
                      }`}
                      aria-hidden
                    >
                      {done ? (
                        <Check className="cot-tick size-3.5" strokeWidth={3} />
                      ) : active ? (
                        <AppSpinner className="size-3.5" />
                      ) : (
                        <span className="text-[11px] font-semibold">{i + 1}</span>
                      )}
                    </span>
                    <span
                      className={`text-[14px] ${
                        done || active
                          ? "font-medium text-[#09090B] dark:text-[#F8FAFC]"
                          : "text-[#A1A1AA] dark:text-[#64748B]"
                      }`}
                    >
                      {paso}
                      {done ? <span className="sr-only"> (listo)</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <AppModalHeader
          icon={<Mail className="size-5" strokeWidth={1.9} />}
          tone="info"
          eyebrow={eyebrow}
          title="Enviar PDF por correo"
          titleId={titleId}
          description="Confirma el destinatario. El PDF se genera y se adjunta al enviar."
          descriptionId={descId}
          onClose={handleClose}
          closeDisabled={sending}
        />

        <AppModalBody className="space-y-4">
          {smtpBlocked ? (
            <div
              id={smtpAlertId}
              role="alert"
              className="flex gap-3 rounded-xl border border-[#F0D7A3] bg-[#FFF8EB] px-4 py-3 dark:border-[rgba(230,162,60,0.3)] dark:bg-[rgba(230,162,60,0.10)]"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#9A6B15] dark:text-[#E6A23C]" aria-hidden />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#8A5A10] dark:text-[#F0C675]">
                  No se puede enviar desde esta cuenta
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[#8A5A10]/90 dark:text-[#F0C675]/85">
                  {smtpBlockedMessage}
                </p>
              </div>
            </div>
          ) : null}

          {/* Destinatario */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor={fieldId} className="text-[13px] font-medium text-[#3F3F46] dark:text-[#B7C1D1]">
                Para
              </label>
              {!loadingPrefill && prefilled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F8F0] px-2 py-0.5 text-[11px] font-medium text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                  Correo del cliente
                </span>
              )}
            </div>
            <div className="relative">
              {loadingPrefill ? (
                <AppSpinner className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" />
              ) : (
                <AtSign
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]"
                  aria-hidden
                />
              )}
              <input
                id={fieldId}
                type="email"
                name="correo"
                inputMode="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  setPrefilled(false);
                  if (fieldError) setFieldError("");
                }}
                placeholder={loadingPrefill ? "Buscando el correo del cliente…" : "cliente@empresa.com"}
                disabled={sending || loadingPrefill || smtpBlocked}
                required
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={
                  [smtpBlocked ? smtpAlertId : null, fieldError ? errorId : hintId].filter(Boolean).join(" ") ||
                  undefined
                }
                className={`${inputClass} ${
                  fieldError ? "border-[#C22B2B]! focus:ring-[rgba(194,43,43,0.18)]! dark:border-[#F87171]!" : ""
                }`}
              />
            </div>
            {fieldError ? (
              <p id={errorId} className="mt-1.5 text-[12px] font-medium text-[#C22B2B] dark:text-[#F87171]" role="alert">
                {fieldError}
              </p>
            ) : (
              <p id={hintId} className="mt-1.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                Si el cliente no tenía correo, este se guarda en su ficha.
              </p>
            )}
          </div>

          {/* Adjunto */}
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[#3F3F46] dark:text-[#B7C1D1]">Adjunto</p>
            <div className="flex items-center gap-3 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] px-3.5 py-3 dark:border-[#273244] dark:bg-[#0F172A]/60">
              <span
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#C22B2B] ring-1 ring-inset ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]"
                aria-hidden
              >
                <FileText className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{fileName}</p>
                <p className="truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]" title={recipientLabel}>
                  {recipientLabel}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#71717A] ring-1 ring-inset ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#8EA0B8] dark:ring-[#273244]">
                PDF
              </span>
            </div>
          </div>
        </AppModalBody>

        <AppModalFooter>
          <button type="button" onClick={handleClose} disabled={sending} className={appModalBtn.secondary}>
            Enviar después
          </button>
          <button
            type="submit"
            disabled={sending || loadingPrefill || smtpBlocked}
            className={appModalBtn.primary}
          >
            <Send className="size-4" aria-hidden />
            Enviar PDF
          </button>
        </AppModalFooter>
      </form>
    </AppModal>
  );
}
