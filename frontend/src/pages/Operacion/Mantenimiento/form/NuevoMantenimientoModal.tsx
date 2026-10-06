/**
 * «¿Qué quieres crear?»: elige entre una póliza o un reporte de mantenimiento.
 * Dos tarjetas grandes (ícono, título y una línea); solo se muestran las que el
 * usuario puede crear. Kit de modales de la app: Esc cierra, foco atrapado.
 */
import { useId } from "react";
import { ChevronRight, FileText, Plus, ShieldCheck } from "lucide-react";
import { AppModal, AppModalBody, AppModalHeader } from "@/components/ui/modal-kit/ModalKit";
import { focusRing, fontSans } from "../../Proyectos/shared/proyectoTokens";
import type { MantenimientoTipo } from "../shared/mantenimientoItems";

const OPCIONES: { kind: MantenimientoTipo; title: string; body: string; icon: typeof ShieldCheck; tile: string }[] = [
  {
    kind: "poliza",
    title: "Póliza de mantenimiento",
    body: "Contrato con un cliente, su cotización y hasta 4 visitas al año.",
    icon: ShieldCheck,
    tile: "bg-[#EEF3FF] text-[#1B5CFF] ring-[#D7E3FF] dark:bg-[#1B2A63] dark:text-[#9BB6FF] dark:ring-[#3A4A6B]",
  },
  {
    kind: "reporte",
    title: "Reporte de mantenimiento",
    body: "Evidencia de un servicio ligado a un proyecto, con fotos de Antes y Después.",
    icon: FileText,
    tile: "bg-[#E9F8F3] text-[#0B6B5C] ring-[#BFE9DD] dark:bg-[rgba(45,212,191,0.12)] dark:text-[#5EEAD4] dark:ring-[rgba(45,212,191,0.28)]",
  },
];

export default function NuevoMantenimientoModal({
  open,
  onClose,
  opciones,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** Tipos que el usuario puede crear. */
  opciones: MantenimientoTipo[];
  onPick: (kind: MantenimientoTipo) => void;
}) {
  const titleId = useId();
  const descId = useId();
  return (
    <AppModal open={open} onClose={onClose} size="md" dismissOnBackdrop labelledBy={titleId} describedBy={descId} className={fontSans}>
      <AppModalHeader
        icon={<Plus className="size-5" />}
        tone="info"
        eyebrow="Mantenimiento"
        title="¿Qué quieres crear?"
        titleId={titleId}
        description="Elige el tipo de registro. Después se abre su formulario."
        descriptionId={descId}
        onClose={onClose}
      />
      <AppModalBody>
        <div className="grid gap-3">
          {OPCIONES.filter((o) => opciones.includes(o.kind)).map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.kind}
                type="button"
                onClick={() => onPick(o.kind)}
                className={`cot-press group flex w-full items-center gap-4 rounded-[14px] border border-[#E4E4E7] bg-white p-4 text-left transition-colors duration-150 hover:border-[#BFD3FF] hover:bg-[#F8FAFF] dark:border-[#273244] dark:bg-[#0F172A]/40 dark:hover:border-[#2C3F7A] dark:hover:bg-[#1B2A63]/30 ${focusRing}`}
              >
                <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${o.tile}`} aria-hidden>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{o.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]">{o.body}</span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-[#A1A1AA] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#1244D1] motion-reduce:transition-none dark:group-hover:text-[#9BB6FF]"
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </AppModalBody>
    </AppModal>
  );
}
