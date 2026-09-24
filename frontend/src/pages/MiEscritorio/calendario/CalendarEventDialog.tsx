import { useId, useRef } from "react";
import { ClipboardList, ExternalLink, FileText, FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppModal, AppModalBody, AppModalContext, AppModalFooter, AppModalHeader, type AppModalTone } from "@/components/ui/modal-kit/ModalKit";
import { appModalBtn } from "@/components/ui/modal-kit/modalKitStyles";
import { diasAtraso, isOpen, itemPaths, KIND_META, rangeLabel, statusLabel, type CalendarItem, type ItemStatus } from "./calendarModel";
import { fontSans, STATUS_TONE } from "./calendarUi";

const MODAL_TONE: Record<ItemStatus, AppModalTone> = {
  pendiente: "info",
  pausado: "warning",
  resuelto: "success",
  cancelada: "neutral",
};

type Props = {
  item: CalendarItem | null;
  onClose: () => void;
};

/** Detalle de una orden o proyecto al hacer clic en el calendario o el panel lateral. */
export function CalendarEventDialog({ item, onClose }: Props) {
  const titleId = useId();
  const descId = useId();
  const navigate = useNavigate();
  // Conserva el último elemento para que el contenido no desaparezca durante la animación de salida.
  const lastRef = useRef<CalendarItem | null>(item);
  if (item) lastRef.current = item;
  const shown = item ?? lastRef.current;

  const go = (path: string) => {
    onClose();
    navigate(path, { state: { from: "/calendar" } });
  };

  const atraso = shown && isOpen(shown) ? diasAtraso(shown) : 0;
  const paths = shown ? itemPaths(shown) : null;
  const kind = shown ? KIND_META[shown.kind] : null;

  return (
    <AppModal open={item != null} onClose={onClose} dismissOnBackdrop size="md" labelledBy={titleId} describedBy={descId} className={fontSans}>
      {shown && paths && kind ? (
        <>
          <AppModalHeader
            icon={shown.kind === "orden" ? <ClipboardList className="size-5" /> : <FolderKanban className="size-5" />}
            tone={MODAL_TONE[shown.status]}
            eyebrow={`${kind.label} · ${shown.folio}`}
            title={shown.cliente}
            titleId={titleId}
            description={
              <span className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold ring-1 ring-inset ${STATUS_TONE[shown.status].pill}`}>
                  <span className={`size-1.5 rounded-full ${STATUS_TONE[shown.status].dot}`} aria-hidden />
                  {statusLabel(shown)}
                </span>
                {atraso > 0 ? (
                  <span className="inline-flex h-6 items-center rounded-full bg-[#FEF2F2] px-2.5 text-[12px] font-semibold text-[#B42323] ring-1 ring-inset ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]">
                    Vencido hace {atraso} {atraso === 1 ? "día" : "días"}
                  </span>
                ) : null}
              </span>
            }
            descriptionId={descId}
            onClose={onClose}
          />
          <AppModalBody className="space-y-4">
            <AppModalContext
              rows={[
                { label: shown.kind === "orden" ? "Fechas" : "Periodo en campo", value: rangeLabel(shown), strong: true },
                ...(shown.horaInicio
                  ? [
                      {
                        label: shown.kind === "orden" ? "Horario" : "Llegada / salida",
                        value: `${shown.horaInicio}${shown.horaTermino ? ` – ${shown.horaTermino}` : ""}`,
                      },
                    ]
                  : []),
                { label: shown.kind === "orden" ? "Técnico" : "Responsable", value: shown.tecnico || "Sin asignar" },
                ...(shown.direccion ? [{ label: "Dirección", value: shown.direccion }] : []),
              ]}
            />
            {shown.avance != null ? (
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                  <span className="text-[#52525B] dark:text-[#B7C1D1]">Avance</span>
                  <span className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{shown.avance}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#EDEDF0] dark:bg-[#1F2A3C]" aria-hidden>
                  <div
                    className={`cot-bar h-full w-full rounded-full ${STATUS_TONE[shown.status].dot}`}
                    style={{ transform: `scaleX(${Math.min(100, Math.max(0, shown.avance)) / 100})` }}
                  />
                </div>
              </div>
            ) : null}
            {shown.descripcion ? (
              <div>
                <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#8EA0B8]">
                  {shown.kind === "orden" ? "Problemática" : "Tipo de trabajo"}
                </p>
                <p className="line-clamp-5 whitespace-pre-line text-[14px] leading-relaxed text-[#3F3F46] dark:text-[#D6DEEA]">
                  {shown.descripcion}
                </p>
              </div>
            ) : null}
          </AppModalBody>
          <AppModalFooter>
            <button type="button" onClick={() => go(paths.list)} className={appModalBtn.secondary}>
              <ExternalLink aria-hidden />
              Ir a {kind.plural.toLowerCase()}
            </button>
            <button type="button" onClick={() => go(paths.pdf)} className={appModalBtn.primary}>
              <FileText aria-hidden />
              Ver PDF
            </button>
          </AppModalFooter>
        </>
      ) : null}
    </AppModal>
  );
}
