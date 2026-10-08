/**
 * Firma de EL PRESTADOR con la firma registrada (Cloudinary) del firmante
 * oficial (`CONTRATOS_FIRMANTE_USERNAME`, hoy @IvanCruz01).
 *
 * No se elige ni se dibuja nada: se muestra la firma tal como quedará en el
 * contrato y se confirma. Puede aplicarla el propio firmante o un
 * administrador (lo valida el servidor).
 */
import { useEffect, useId, useState } from "react";
import { FileSignature, Loader2, PenLine, ShieldAlert, UserRoundX } from "lucide-react";
import { AppModal, AppModalBody, AppModalFooter, AppModalHeader } from "@/components/ui/modal-kit/ModalKit";
import { firmarComoPrestador, listFirmantes, type Contrato, type FirmanteRegistrado } from "../shared/contratoApi";
import { btn } from "../shared/contratoTokens";

type Props = {
  contrato: Contrato;
  open: boolean;
  onClose: () => void;
  onFirmado: (c: Contrato) => void;
};

export default function FirmarPrestadorModal({ contrato, open, onClose, onFirmado }: Props) {
  const titleId = useId();
  const [firmante, setFirmante] = useState<FirmanteRegistrado | null | undefined>(undefined);
  const [acepta, setAcepta] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    listFirmantes()
      .then((lista) => vivo && setFirmante(lista[0] ?? null))
      .catch((e) => {
        if (!vivo) return;
        setFirmante(null);
        setError(e instanceof Error ? e.message : "No se pudo cargar la firma.");
      });
    return () => {
      vivo = false;
    };
  }, [open]);

  const puedeAplicar = Boolean(firmante && firmante.puede_aplicar !== false);

  const aplicar = async () => {
    if (!firmante || !acepta) return;
    setBusy(true);
    setError("");
    try {
      const c = await firmarComoPrestador(contrato.id, {
        firmante_id: firmante.id,
        documento_sha256: contrato.documento_sha256 || undefined,
      });
      onFirmado(c);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la firma.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal open={open} onClose={onClose} size="lg" busy={busy} labelledBy={titleId}>
      <AppModalHeader
        icon={<FileSignature className="size-5" />}
        tone="info"
        eyebrow={contrato.folio}
        title="Firmar como EL PRESTADOR"
        description="Se aplica la firma registrada del representante. El contrato guarda una copia: si después cambia su firma, este documento no se altera."
        titleId={titleId}
        onClose={onClose}
        closeDisabled={busy}
        divided
      />
      <AppModalBody className="space-y-4 pt-5">
        {firmante === undefined ? (
          <div className="h-[220px] animate-pulse rounded-[14px] bg-[#F4F4F5] dark:bg-white/[0.06]" aria-busy />
        ) : firmante === null ? (
          <div className="cot-fade flex flex-col items-center rounded-[14px] border border-dashed border-[#D3D3D8] px-5 py-8 text-center dark:border-[#3A4661]">
            <UserRoundX className="size-6 text-[#A1A1AA]" aria-hidden />
            <p className="mt-2 text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">La firma del representante no está registrada</p>
            <p className="mt-1 max-w-sm text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
              Registra la firma del usuario @IvanCruz01 en Configuración › Gestión de usuarios y vuelve a intentarlo.
            </p>
          </div>
        ) : (
          <>
            <div className="cot-fade overflow-hidden rounded-[14px] border border-[#E4E4E7] dark:border-[#273244]">
              <div className="flex items-center justify-between gap-3 border-b border-[#F0F0F2] bg-[#FAFAFA] px-4 py-2.5 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{firmante.nombre}</p>
                  <p className="font-mono text-[12px] text-[#71717A] dark:text-[#8EA0B8]">@{firmante.username}</p>
                </div>
                <span className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[11px] font-semibold text-[#1244D1] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
                  Firma registrada
                </span>
              </div>
              <div className="flex flex-col items-center bg-white px-6 pb-5 pt-4 text-black [font-family:Calibri,Carlito,'Segoe_UI',Arial,sans-serif]">
                <span className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#0039B2]">El prestador</span>
                <img src={firmante.firma_url} alt={`Firma de ${firmante.nombre}`} className="cot-pop-in mt-1 h-20 max-w-[240px] object-contain" />
                <span className="mt-1 h-px w-60 bg-black" />
                <span className="mt-1 text-[13px] font-bold">{firmante.nombre}</span>
                <span className="text-[12px] text-[#333]">{contrato.prestador_datos?.razon_social}</span>
              </div>
            </div>

            {puedeAplicar ? (
              <label className="flex cursor-pointer items-start gap-3 text-[13px] text-[#3F3F46] dark:text-[#D6DEEA]">
                <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 size-4 accent-[#1B5CFF]" />
                Revisé el contrato y autorizo aplicar la firma de {firmante.nombre} en representación de{" "}
                {contrato.prestador_datos?.razon_social || "la empresa"}.
              </label>
            ) : (
              <p className="flex items-start gap-2 rounded-[12px] bg-[#FFF8EB] p-3 text-[13px] text-[#8A5D0F] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F2C27A]">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                Solo {firmante.nombre} o un administrador pueden aplicar esta firma.
              </p>
            )}
          </>
        )}
        {error && (
          <p className="cot-fade rounded-[12px] bg-[#FEF2F2] p-3 text-[13px] text-[#B42323] dark:bg-[#3F1518] dark:text-[#F87171]" role="alert">
            {error}
          </p>
        )}
      </AppModalBody>
      <AppModalFooter>
        <button type="button" onClick={onClose} className={btn.secondary} disabled={busy}>
          Cancelar
        </button>
        <button type="button" onClick={() => void aplicar()} className={btn.primary} disabled={busy || !firmante || !acepta || !puedeAplicar}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <PenLine aria-hidden />}
          {busy ? "Aplicando firma…" : "Aplicar firma"}
        </button>
      </AppModalFooter>
    </AppModal>
  );
}
