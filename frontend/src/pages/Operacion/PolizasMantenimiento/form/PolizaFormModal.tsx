import { useId, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { erpSecondaryBtnClass } from "@/layout/erpPageStyles";
import {
  OrdenFormModalHeader,
  OrdenModalFooterActions,
  OrdenModalPrimaryButton,
} from "../../OrdenesTrabajo/OrdenTrabajoModals";
import {
  erpModalBodyClass,
  erpModalFooterClass,
  erpModalFormScrollClass,
  erpModalShellClass,
} from "../../OrdenesTrabajo/ordenTrabajoStyles";
import PolizaAltaForm from "../PolizaAltaForm";
import type { PolizaAltaValues } from "../list/polizaListTypes";

const FORM_ID = "poliza-alta-form";

type SelectOption = { value: string; label: string };

type Props = {
  open: boolean;
  editing: boolean;
  folio: string;
  folioIsPreview: boolean;
  initialValues: PolizaAltaValues;
  extraClienteOption?: SelectOption | null;
  extraCotizacionOption?: SelectOption | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (values: PolizaAltaValues) => void;
  onViewTemplate: (values: PolizaAltaValues) => void;
};

export default function PolizaFormModal({
  open,
  editing,
  folio,
  folioIsPreview,
  initialValues,
  extraClienteOption = null,
  extraCotizacionOption = null,
  saving = false,
  onClose,
  onSave,
  onViewTemplate,
}: Props) {
  const titleId = useId();
  const getValuesRef = useRef<(() => PolizaAltaValues) | null>(null);

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={onClose}
      closeOnBackdropClick={false}
      ariaLabelledBy={titleId}
      className={`${erpModalShellClass} sm:max-w-5xl sm:w-[min(96vw,64rem)]`}
    >
      <OrdenFormModalHeader
        editing={editing}
        titleId={titleId}
        contextLabel="Operación · Pólizas"
        title={editing ? `Póliza ${folio}` : "Nueva póliza"}
        subtitle="Cliente, tipo CCTV, cotización y las tres visitas del año"
      />

      <div className={erpModalBodyClass}>
        <div className={erpModalFormScrollClass}>
          <PolizaAltaForm
            key={editing ? folio : "nueva"}
            embedded
            formId={FORM_ID}
            folio={folio}
            folioIsPreview={folioIsPreview}
            initialValues={initialValues}
            extraClienteOption={extraClienteOption}
            extraCotizacionOption={extraCotizacionOption}
            onSubmit={onSave}
            onRegisterGetValues={(getter) => {
              getValuesRef.current = getter;
            }}
          />
        </div>
      </div>

      <footer className={erpModalFooterClass}>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => onViewTemplate(getValuesRef.current?.() ?? initialValues)}
            className={erpSecondaryBtnClass}
          >
            Ver plantilla PDF
          </button>
          <OrdenModalFooterActions
            onCancel={onClose}
            cancelLabel="Cerrar"
            primary={
              <OrdenModalPrimaryButton type="submit" form={FORM_ID} disabled={saving}>
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar póliza"}
              </OrdenModalPrimaryButton>
            }
          />
        </div>
      </footer>
    </Modal>
  );
}
