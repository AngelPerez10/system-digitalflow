import { useId, useState } from "react";
import { Check, Copy, Link2, Mail, ShieldCheck } from "lucide-react";
import {
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
  AppSpinner,
} from "@/components/ui/modal-kit/ModalKit";
import { btn } from "../shared/contratoTokens";
import { cn } from "@/lib/utils";
import { generarEnlaceFirma, type Contrato, type EnlaceFirmaResult } from "../shared/contratoApi";
import { formatoFecha } from "../shared/contratoFormato";

type Props = {
  contrato: Contrato;
  open: boolean;
  onClose: () => void;
  onGenerado: (c: Contrato) => void;
};

/**
 * Genera el link único de firma. El token solo existe en esta respuesta (el
 * servidor guarda su hash): si se pierde, hay que generar otro, y eso revoca
 * el anterior.
 */
export default function EnviarEnlaceModal({ contrato, open, onClose, onGenerado }: Props) {
  const titleId = useId();
  const [enviarCorreo, setEnviarCorreo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<EnlaceFirmaResult | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cerrar = () => {
    if (busy) return;
    setResultado(null);
    setError("");
    setCopiado(false);
    onClose();
  };

  const generar = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await generarEnlaceFirma(contrato.id, enviarCorreo);
      setResultado(r);
      onGenerado(r.contrato);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el enlace.");
    } finally {
      setBusy(false);
    }
  };

  const copiar = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setError("No se pudo copiar; selecciona el enlace y cópialo manualmente.");
    }
  };

  const hayEnlace = Boolean(contrato.enlace_activo);

  return (
    <AppModal open={open} onClose={cerrar} size="lg" busy={busy} labelledBy={titleId}>
      <AppModalHeader
        icon={<Link2 className="size-5" />}
        tone="info"
        eyebrow={contrato.folio}
        title={resultado ? "Enlace listo" : "Enviar a firma del cliente"}
        titleId={titleId}
        onClose={cerrar}
        closeDisabled={busy}
        divided
      />
      <AppModalBody className="space-y-4 pt-5">
        {!resultado ? (
          <>
            <div className="flex gap-3 rounded-xl border border-[#F0F0F2] bg-[#FAFAFA] p-4 text-sm text-[#3F3F46] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#cbd5e1]">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#04724D]" aria-hidden />
              <div className="space-y-1">
                <p>
                  El cliente recibirá un enlace personal. Al abrirlo, se le enviará un <strong>código de 6 dígitos</strong> a{" "}
                  <strong>{contrato.cliente_correo}</strong> para verificar su identidad antes de ver y firmar el contrato.
                </p>
                <p className="text-[#71717A] dark:text-[#8ea0b8]">El enlace vence en 7 días y solo sirve para una firma.</p>
              </div>
            </div>
            {hayEnlace && (
              <p className="rounded-xl border border-[#F0D7A3] bg-[#FFF8EB] p-3 text-sm text-[#8A5D0F]">
                Ya hay un enlace activo (vence {formatoFecha(contrato.enlace_activo?.expira_at, true)}). Generar uno nuevo
                invalida el anterior.
              </p>
            )}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E7E7EA] p-3 text-sm dark:border-[#273244]">
              <input
                type="checkbox"
                checked={enviarCorreo}
                onChange={(e) => setEnviarCorreo(e.target.checked)}
                className="size-4 accent-[#1B5CFF]"
              />
              <Mail className="size-4 text-[#71717A]" aria-hidden />
              Enviar el enlace por correo desde mi cuenta
            </label>
          </>
        ) : (
          <>
            {resultado.correo_enviado && (
              <p className="flex items-center gap-2 rounded-xl bg-[#E9F8F0] p-3 text-sm text-[#04724D] cot-fade">
                <Check className="size-4" aria-hidden /> Enviado a {resultado.correo_destino}.
              </p>
            )}
            {resultado.correo_error && (
              <p className="rounded-xl bg-[#FFF8EB] p-3 text-sm text-[#8A5D0F]">{resultado.correo_error}</p>
            )}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-[#3F3F46] dark:text-[#cbd5e1]">Enlace de firma</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={resultado.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-xl border border-[#E7E7EA] bg-[#F4F4F5] px-3 py-2 font-mono text-xs text-[#09090B] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]"
                  aria-label="Enlace de firma"
                />
                <button type="button" onClick={() => void copiar()} className={cn(btn.secondary, "w-auto")}>
                  {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copiado ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
            <p className="text-xs text-[#71717A] dark:text-[#8ea0b8]">
              Por seguridad este enlace se muestra <strong>solo una vez</strong> y no se guarda en el sistema. Compártelo
              únicamente con el cliente. Vence el {formatoFecha(resultado.expira_at, true)}.
            </p>
          </>
        )}
        {error && <p className="rounded-xl bg-[#FEF2F2] p-3 text-sm text-[#B42323] cot-fade">{error}</p>}
      </AppModalBody>
      <AppModalFooter>
        {!resultado ? (
          <>
            <button type="button" onClick={cerrar} className={btn.secondary} disabled={busy}>
              Cancelar
            </button>
            <button type="button" onClick={() => void generar()} className={btn.primary} disabled={busy}>
              {busy ? <AppSpinner /> : <Link2 className="size-4" />}
              {busy ? "Generando…" : hayEnlace ? "Generar nuevo enlace" : "Generar enlace"}
            </button>
          </>
        ) : (
          <button type="button" onClick={cerrar} className={btn.primary}>
            Listo
          </button>
        )}
      </AppModalFooter>
    </AppModal>
  );
}
