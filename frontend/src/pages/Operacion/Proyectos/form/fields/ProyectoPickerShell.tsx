import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { fontSans } from "../../shared/proyectoTokens";

type Props = {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** Controles fijos bajo el encabezado (pestañas, búsqueda). */
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

/** Diálogo de selección: hoja inferior en móvil, panel centrado en escritorio. */
export function ProyectoPickerShell({ open, onClose, icon, eyebrow, title, description, toolbar, footer, children }: Props) {
  const titleId = useId();
  const descId = useId();
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnEscape
      mobileBottomSheet
      showCloseButton={false}
      ariaLabelledBy={titleId}
      ariaDescribedBy={description ? descId : undefined}
      className={`${fontSans} flex max-h-[min(88dvh,44rem)] w-full flex-col overflow-hidden rounded-t-[22px] border border-[#E7E7EA] bg-white! p-0 pb-[env(safe-area-inset-bottom)] shadow-[0_32px_64px_-24px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:bg-[#111827]! sm:max-w-xl sm:rounded-[22px] sm:pb-0`}
    >
      <header className="relative shrink-0 px-5 pb-4 pr-16 pt-5 sm:px-6">
        <div className="flex items-start gap-3.5">
          <span
            className="cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF] text-[#1B5CFF] ring-1 ring-inset ring-[#D7E3FF] dark:bg-[#1B2A63] dark:text-[#9BB6FF] dark:ring-[#3A4A6B] [&_svg]:size-5"
            aria-hidden
          >
            {icon}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">{eyebrow}</p>
            <h2 id={titleId} className="mt-0.5 text-[18px] font-semibold leading-snug tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-[13.5px] leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="cot-press absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] hover:text-[#3F3F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#64748B] dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA]"
        >
          <X className="size-4.5" aria-hidden />
        </button>
      </header>
      {toolbar ? <div className="shrink-0 space-y-3 px-5 pb-3 sm:px-6">{toolbar}</div> : null}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[#F0F0F2] px-3 py-3 dark:border-[#1F2A3C] sm:px-4">
        {children}
      </div>
      {footer ? (
        <footer className="flex shrink-0 justify-end gap-2 border-t border-[#F0F0F2] bg-[#FAFAFA] px-5 py-3 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 sm:px-6">
          {footer}
        </footer>
      ) : null}
    </Modal>
  );
}

/** Pestañas de origen/fuente dentro de un selector. */
export function PickerTabs<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-[12px] bg-[#F4F4F5] p-1 dark:bg-[#0F172A]">
      {options.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`cot-press min-h-9 flex-1 rounded-[9px] px-3 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 ${
              selected
                ? "bg-white text-[#09090B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] dark:bg-[#1B2539] dark:text-white"
                : "text-[#71717A] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
