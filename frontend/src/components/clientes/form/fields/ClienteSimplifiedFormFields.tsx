/**
 * Campos del formulario de cliente en tres pestañas (Datos básicos, Contacto,
 * Facturación). Lo usan el alta/edición de Contactos, Órdenes y Facturas CFDI.
 * Este archivo solo arma las pestañas; cada una vive en su propio componente.
 *
 * - Pestañas WAI-ARIA: flechas, Inicio/Fin y una marca en la pestaña con errores.
 * - Cada campo tiene etiqueta enlazada, `name` (para enfocar el primero
 *   inválido) y su error debajo.
 * - Las actualizaciones son funcionales (`prev => …`): no se pierden teclazos
 *   aunque React agrupe renders.
 */
import { useId, useRef, type KeyboardEvent } from "react";
import type { ClienteFormTab, ClienteTipo } from "../../domain/clienteTipos";
import { CLIENTE_FIELD_TAB, type ClienteFieldErrors } from "../../domain/clienteValidation";
import { focusRing } from "../../ui/tokens";
import { CLIENTE_STEPS } from "../clienteStepMeta";
import { ContactoFields } from "./ContactoFields";
import { FacturacionFields } from "./FacturacionFields";
import type { ClienteFieldsTabProps } from "./fieldBinding";
import { GeneralFields, type RepresentanteSelectConfig } from "./GeneralFields";

type Props = Omit<ClienteFieldsTabProps, "errors"> & {
  activeTab: ClienteFormTab;
  setActiveTab: (tab: ClienteFormTab) => void;
  fixedTipo?: ClienteTipo;
  onOpenMap: () => void;
  /** Oculta tipo de contacto, clave y prospecto (p. ej. factura CFDI). */
  hideContactMeta?: boolean;
  /** Oculta la barra de pestañas interna (el padre controla las pestañas). */
  hideTabs?: boolean;
  /** Errores por campo (se muestran tras el primer intento de guardar). */
  errors?: ClienteFieldErrors;
  /** Reemplaza el campo Representante por un SearchableSelect (p. ej. clientes SICAR). */
  representanteSelect?: RepresentanteSelectConfig;
};

const TABS = CLIENTE_STEPS;

export function ClienteSimplifiedFormFields({
  formData,
  setFormData,
  activeTab,
  setActiveTab,
  fixedTipo,
  editingCliente,
  onOpenMap,
  hideContactMeta = false,
  hideTabs = false,
  errors = {},
  representanteSelect,
}: Props) {
  const tabsId = useId();
  const tabProps = { formData, setFormData, errors, editingCliente };
  const tabRefs = useRef<Partial<Record<ClienteFormTab, HTMLButtonElement | null>>>({});

  const tabHasError = (tab: ClienteFormTab) =>
    (Object.keys(errors) as (keyof ClienteFieldErrors)[]).some((k) => errors[k] && CLIENTE_FIELD_TAB[k] === tab);

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (index + 1) % TABS.length
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (index - 1 + TABS.length) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    const tab = TABS[next].id;
    setActiveTab(tab);
    tabRefs.current[tab]?.focus();
  };

  const panelProps = (tab: ClienteFormTab) =>
    hideTabs
      ? { className: "cot-fade space-y-4" }
      : {
          role: "tabpanel" as const,
          id: `${tabsId}-panel-${tab}`,
          "aria-labelledby": `${tabsId}-tab-${tab}`,
          className: "cot-fade space-y-4",
        };

  return (
    <div className={hideTabs ? "" : "md:flex md:items-start md:gap-5"}>
      {!hideTabs ? (
        <div
          role="tablist"
          aria-label="Secciones del formulario"
          className="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-[14px] border border-[#E7E7EA] bg-white p-1.5 dark:border-[#273244] dark:bg-[#111827] md:sticky md:top-0 md:mb-0 md:w-56 md:shrink-0 md:flex-col md:gap-0.5 md:overflow-visible"
        >
          {TABS.map((tab, i) => {
            const selected = activeTab === tab.id;
            const hasError = tabHasError(tab.id);
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`${tabsId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${tabsId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={`relative flex min-h-10 shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-left text-[13.5px] font-medium transition-colors duration-150 md:w-full ${focusRing} ${
                  selected
                    ? "bg-[#17235B] text-white dark:bg-[#4B7CFF]"
                    : "text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-white/[0.05] dark:hover:text-[#F8FAFC]"
                }`}
              >
                <span aria-hidden className={selected ? "text-[#E6A23C] dark:text-white" : "text-[#9A9AA2] dark:text-[#6E7A91]"}><tab.icon className="size-4" /></span>
                <span className="truncate">{tab.label}</span>
                {hasError ? (
                  <>
                    <span className="ml-auto size-2 shrink-0 rounded-full bg-[#C22B2B] dark:bg-[#F87171]" aria-hidden />
                    <span className="sr-only"> (tiene errores)</span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={hideTabs ? "" : "min-w-0 flex-1"}>
        {activeTab === "general" && (
          <div key="general" {...panelProps("general")}>
            <GeneralFields
              {...tabProps}
              fixedTipo={fixedTipo}
              hideContactMeta={hideContactMeta}
              representanteSelect={representanteSelect}
            />
          </div>
        )}

        {activeTab === "contacto" && (
          <div key="contacto" {...panelProps("contacto")}>
            <ContactoFields {...tabProps} />
          </div>
        )}

        {activeTab === "more" && (
          <div key="more" {...panelProps("more")}>
            <FacturacionFields {...tabProps} onOpenMap={onOpenMap} />
          </div>
        )}
      </div>
    </div>
  );
}
