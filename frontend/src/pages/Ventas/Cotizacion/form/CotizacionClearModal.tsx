import { Eraser } from "lucide-react";
import { AppConfirmDialog, AppModalContext } from "@/components/ui/modal-kit/ModalKit";

type CotizacionClearModalProps = {
  open: boolean;
  onClose: () => void;
  /** Vacía todo el formulario (resetAll) y cierra. */
  onConfirm: () => void;
};

const QUE_SE_BORRA = [
  "Cliente, contacto y condiciones comerciales",
  "Todas las partidas y categorías",
  "Textos del documento y opciones del PDF",
];

/**
 * Confirmación de "Limpiar formulario". Aislado: solo recibe `open` y dos
 * callbacks, no lee estado del formulario.
 */
export function CotizacionClearModal({ open, onClose, onConfirm }: CotizacionClearModalProps) {
  return (
    <AppConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      tone="danger"
      icon={<Eraser className="size-5" strokeWidth={1.9} />}
      title="¿Limpiar el formulario?"
      description="Empezarás de cero. Esto no se puede deshacer."
      confirmLabel="Sí, limpiar todo"
      detail={
        <AppModalContext>
          <p className="px-4 pt-3 text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]">Se borrará:</p>
          <ul className="space-y-1.5 px-4 pb-3.5 pt-2">
            {QUE_SE_BORRA.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-[#3F3F46] dark:text-[#D6DEEA]">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#C22B2B] dark:bg-[#F87171]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </AppModalContext>
      }
    />
  );
}
