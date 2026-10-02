import type { Dispatch, SetStateAction, ReactNode, InputHTMLAttributes } from "react";
import { useId } from "react";
import Label from "@/components/form/Label";
import SearchableSelect from "@/components/form/SearchableSelect";
import { estadosPorPais, paisOptions, phoneCountryOptions } from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";
import type { Cliente } from "@/types/cliente";
import { ClienteContactosManager } from "./ClienteContactosManager";
import { ClienteDireccionesManager } from "./ClienteDireccionesManager";
import {
  type ClienteFormTab,
  ClienteTipo,
  TIPO_OPTIONS,
  isGoogleMapsLink,
  modalInputClass,
  modalPanelClass,
  modalPhoneShellClass,
  modalSectionTitleClass,
  modalTabBaseClass,
  modalTextareaClass,
  selectLikeClassName,
} from "./clienteFormShared";

type Props = {
  formData: Record<string, unknown>;
  setFormData: Dispatch<SetStateAction<Record<string, unknown>>>;
  activeTab: ClienteFormTab;
  setActiveTab: (tab: ClienteFormTab) => void;
  fixedTipo?: ClienteTipo;
  editingCliente?: Cliente | null;
  onOpenMap: () => void;
  /** Oculta tipo de contacto, clave y prospecto (p. ej. factura CFDI). */
  hideContactMeta?: boolean;
  /** Oculta la barra de pestañas interna (el padre controla las pestañas). */
  hideTabs?: boolean;
  /** Reemplaza el campo Representante por un SearchableSelect (p. ej. clientes SICAR). */
  representanteSelect?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    onSearchChange?: (query: string) => void;
    placeholder?: string;
    disabled?: boolean;
  };
};

function ModalInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${modalInputClass}${className ? ` ${className}` : ""}`} />;
}

const TABS: { id: ClienteFormTab; label: string; icon: ReactNode }[] = [
  {
    id: "general",
    label: "Datos Básicos",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2.2" />
        <circle cx="9" cy="11" r="2" />
        <path d="M9 15.5c-1.9 0-3.4.9-3.4 2M14 10h5M14 13.5h5" />
      </svg>
    ),
  },
  {
    id: "contacto",
    label: "Contacto",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6.5 4.5h3l1.3 4-2 1.5a11 11 0 0 0 5.2 5.2l1.5-2 4 1.3v3a2 2 0 0 1-2.2 2 17.5 17.5 0 0 1-15.3-15.3 2 2 0 0 1 2-2.2Z" />
      </svg>
    ),
  },
  {
    id: "more",
    label: "Datos Facturación",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M14 2v4h4" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
  },
];

const iconSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const sectionIconTone = {
  azul: "bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]",
  dorado: "bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]",
  marino: "bg-[rgba(23,35,91,0.10)] text-[#17235B] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]",
} as const;

/** Cada tarjeta describe exactamente lo que contiene: sin una única etiqueta
    genérica cubriendo ocho grupos de campos sin relación entre sí. */
function FieldGroup({
  icon,
  tone,
  title,
  hint,
  extra,
  children,
}: {
  icon: ReactNode;
  tone: keyof typeof sectionIconTone;
  title: string;
  hint?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`${modalPanelClass} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E7E7EA]/70 pb-4 dark:border-[#273244]/70">
        <div className="flex items-center gap-3">
          <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] ${sectionIconTone[tone]}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <p className={modalSectionTitleClass}>{title}</p>
            {hint ? <p className="mt-1 text-[12px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">{hint}</p> : null}
          </div>
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}

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
  representanteSelect,
}: Props) {
  const tabsId = useId();
  const estadosOptions =
    estadosPorPais[String(formData.pais || "México")] || estadosPorPais["México"] || [];

  return (
    <div className={hideTabs ? "" : "md:flex md:items-start md:gap-5"}>
      {!hideTabs ? (
        <div
          role="tablist"
          aria-label="Secciones del formulario de cliente"
          className="mb-4 flex gap-1 overflow-x-auto rounded-[14px] border border-[#E7E7EA] bg-white p-1.5 dark:border-[#273244] dark:bg-[#111827] md:sticky md:top-0 md:mb-0 md:w-52 md:shrink-0 md:flex-col md:gap-0.5 md:overflow-visible"
        >
          {TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${tabsId}-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${tabsId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`${modalTabBaseClass} flex shrink-0 items-center justify-start gap-2.5 border-l-[3px] md:w-full ${
                  selected
                    ? "border-l-[#1B5CFF] bg-[rgba(27,92,255,0.06)] text-[#17235B] dark:border-l-[#4B7CFF] dark:bg-[rgba(75,124,255,0.10)] dark:text-[#F8FAFC]"
                    : "border-l-transparent bg-transparent text-[#6E6E77] hover:bg-[#FAFAFA] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/[0.04] dark:hover:text-[#F8FAFC]"
                }`}
              >
                <span className={selected ? "text-[#1B5CFF] dark:text-[#4B7CFF]" : "text-[#9A9AA2] dark:text-[#6E7A91]"}>{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={hideTabs ? "" : "min-w-0 flex-1"}>
      {activeTab === "general" && (
        <div
          role="tabpanel"
          id={`${tabsId}-panel-general`}
          aria-labelledby={`${tabsId}-general`}
          className="space-y-5"
        >
          {/* Identificación: cómo se registra este contacto en el sistema. */}
          <FieldGroup
              tone="azul"
              title="Identificación"
              hint="Cómo se registra este contacto en el sistema."
              icon={
                <svg {...iconSvgProps} className="size-4">
                  <rect x="3" y="5" width="18" height="14" rx="2.2" />
                  <circle cx="9" cy="11" r="2" />
                  <path d="M9 15.5c-1.9 0-3.4.9-3.4 2M14 10h5M14 13.5h5" />
                </svg>
              }
            >
              {!hideContactMeta ? (
                <div
                  className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${fixedTipo ? "" : "lg:grid-cols-3"}`}
                >
                  {!fixedTipo ? (
                    <div>
                      <Label>Tipo de contacto</Label>
                      <select
                        value={String(formData.tipo || "EMPRESA")}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tipo: e.target.value as ClienteTipo,
                          })
                        }
                        className={selectLikeClassName}
                      >
                        {TIPO_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div>
                    <Label>Clave</Label>
                    <ModalInput
                      value={String(formData.clave || "")}
                      onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Prospecto</Label>
                    <div className="flex h-11 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_prospecto: !formData.is_prospecto })}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                          formData.is_prospecto ? "bg-[#1B5CFF] dark:bg-[#4B7CFF]" : "bg-[#D3D3D8] dark:bg-[#3A4661]"
                        }`}
                        aria-pressed={!!formData.is_prospecto}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            formData.is_prospecto ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">
                        {formData.is_prospecto ? "Sí" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {hideContactMeta ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label>No. de Cliente</Label>
                    <ModalInput
                      value={String(formData.no_cliente || "")}
                      disabled
                      className="opacity-70"
                    />
                    <p className="mt-1 text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">Identificador en SICAR.</p>
                  </div>
                  <div>
                    <Label>Clave</Label>
                    <ModalInput
                      value={String(formData.clave || "")}
                      disabled
                      className="opacity-70"
                    />
                  </div>
                </div>
              ) : null}
            </FieldGroup>

          {/* Datos generales: quién es y cómo se identifica fiscalmente. */}
          <FieldGroup
            tone="marino"
            title="Datos generales"
            icon={
              <svg {...iconSvgProps} className="size-4">
                <path d="M20 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H8.4A4.4 4.4 0 0 0 4 19.4V21" />
                <circle cx="12" cy="7.5" r="3.8" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                {representanteSelect ? (
                  <SearchableSelect
                    label="Representante"
                    value={representanteSelect.value}
                    onChange={representanteSelect.onChange}
                    options={representanteSelect.options}
                    onSearchChange={representanteSelect.onSearchChange}
                    filterLocally={false}
                    disabled={representanteSelect.disabled}
                    placeholder={representanteSelect.placeholder || "Buscar cliente..."}
                  />
                ) : (
                  <>
                    <Label>Representante</Label>
                    <ModalInput
                      value={String(formData.representante || "")}
                      onChange={(e) => setFormData({ ...formData, representante: e.target.value.toUpperCase() })}
                    />
                  </>
                )}
              </div>
              <div>
                <Label>Nombre</Label>
                <ModalInput
                  value={String(formData.nombre || "")}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>RFC</Label>
                <ModalInput value={String(formData.rfc || "")} onChange={(e) => setFormData({ ...formData, rfc: e.target.value })} />
              </div>
              <div>
                <Label>CURP</Label>
                <ModalInput value={String(formData.curp || "")} onChange={(e) => setFormData({ ...formData, curp: e.target.value })} />
              </div>
            </div>
          </FieldGroup>

          {/* Contacto directo: cómo se le localiza. */}
          <FieldGroup
            tone="dorado"
            title="Contacto directo"
            icon={
              <svg {...iconSvgProps} className="size-4">
                <path d="M6.5 4.5h3l1.3 4-2 1.5a11 11 0 0 0 5.2 5.2l1.5-2 4 1.3v3a2 2 0 0 1-2.2 2 17.5 17.5 0 0 1-15.3-15.3 2 2 0 0 1 2-2.2Z" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Teléfono</Label>
                <div className={modalPhoneShellClass}>
                  <div className="relative shrink-0 border-r border-[#E7E7EA] dark:border-[#273244]">
                    <select
                      aria-label="País del teléfono"
                      value={String(formData.telefono_pais || "MX")}
                      onChange={(e) => setFormData({ ...formData, telefono_pais: e.target.value })}
                      className="h-full appearance-none bg-transparent py-2.5 pl-3 pr-8 text-[14px] font-medium text-[#09090B] outline-none dark:text-[#F8FAFC]"
                    >
                      {phoneCountryOptions.map((c) => (
                        <option key={c.code} value={c.code} className="bg-white text-[#09090B] dark:bg-[#111827] dark:text-[#F8FAFC]">
                          {c.shortLabel} {c.dial}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#A1A1AA] dark:text-[#8EA0B8]"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="m5 7.5 5 5 5-5" />
                    </svg>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={String(formData.telefono || "")}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: (e.target.value || "").replace(/\D/g, "").slice(0, 10) })
                    }
                    placeholder="10 dígitos"
                    className="w-full min-w-0 flex-1 bg-transparent px-3 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none placeholder:text-[#A1A1AA] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8]"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Selecciona el país para anteponer el código correcto ({phoneCountryOptions.map((c) => c.dial).filter((v, i, a) => a.indexOf(v) === i).join(" / ")}).
                </p>
              </div>
              <div>
                <Label>Celular</Label>
                <ModalInput
                  value={String(formData.celular || "")}
                  onChange={(e) =>
                    setFormData({ ...formData, celular: (e.target.value || "").replace(/\D/g, "") })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Correo</Label>
              <ModalInput
                type="email"
                value={String(formData.correo || "")}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
              />
            </div>
          </FieldGroup>

          {/* Condiciones comerciales: precio, crédito y notas internas. */}
          <FieldGroup
            tone="azul"
            title="Condiciones comerciales"
            icon={
              <svg {...iconSvgProps} className="size-4">
                <rect x="3" y="6" width="18" height="12" rx="2.2" />
                <path d="M3 10.5h18M7 14.5h4" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label>No. de Precio</Label>
                <select
                  value={String(formData.numero_precio || "1")}
                  onChange={(e) => setFormData({ ...formData, numero_precio: e.target.value })}
                  className={selectLikeClassName}
                >
                  <option value="1">Precio 1</option>
                  <option value="2">Precio 2</option>
                  <option value="3">Precio 3</option>
                </select>
              </div>
              <div>
                <Label>Límite Crédito</Label>
                <ModalInput
                  type="number"
                  value={String(formData.limite_credito ?? "")}
                  onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
                />
              </div>
              <div>
                <Label>Días crédito</Label>
                <ModalInput
                  type="number"
                  value={String(formData.dias_credito ?? "")}
                  onChange={(e) => setFormData({ ...formData, dias_credito: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Comentario</Label>
              <textarea
                rows={3}
                value={String(formData.notas || "")}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className={modalTextareaClass}
              />
            </div>
          </FieldGroup>
        </div>
      )}

      {activeTab === "contacto" && (
        <div
          role="tabpanel"
          id={`${tabsId}-panel-contacto`}
          aria-labelledby={`${tabsId}-contacto`}
          className="space-y-5"
        >
          <FieldGroup
            tone="dorado"
            title="Contacto de negocio"
            hint={
              editingCliente?.id
                ? "Este cliente puede tener varios contactos — marca uno como principal."
                : "Persona de contacto que se guardará con este cliente (cotizaciones, órdenes y listados)."
            }
            icon={
              <svg {...iconSvgProps} className="size-4">
                <path d="M20 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H8.4A4.4 4.4 0 0 0 4 19.4V21" />
                <circle cx="12" cy="7.5" r="3.8" />
              </svg>
            }
            extra={
              editingCliente?.id ? null : formData.contacto_id ? (
                <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-[rgba(4,114,77,0.10)] px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]">
                  Principal
                </span>
              ) : (
                <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-[rgba(230,162,60,0.16)] px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A6B15] dark:text-[#E6A23C]">
                  Nuevo
                </span>
              )
            }
          >
            {editingCliente?.id ? (
              <ClienteContactosManager clienteId={editingCliente.id} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label htmlFor={`${tabsId}-contacto-nombre`}>Nombre completo</Label>
                    <ModalInput
                      id={`${tabsId}-contacto-nombre`}
                      value={String(formData.contacto_nombre || "")}
                      onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value.toUpperCase() })}
                      placeholder="Nombre y apellido"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${tabsId}-contacto-puesto`}>Puesto</Label>
                    <ModalInput
                      id={`${tabsId}-contacto-puesto`}
                      value={String(formData.contacto_puesto || "")}
                      onChange={(e) => setFormData({ ...formData, contacto_puesto: e.target.value })}
                      placeholder="Ej. Gerente de compras"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${tabsId}-contacto-telefono`}>Teléfono</Label>
                    <ModalInput
                      id={`${tabsId}-contacto-telefono`}
                      type="tel"
                      value={String(formData.contacto_telefono || "")}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contacto_telefono: (e.target.value || "").replace(/\D/g, ""),
                        })
                      }
                      placeholder="10 dígitos"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`${tabsId}-contacto-correo`}>Correo</Label>
                    <ModalInput
                      id={`${tabsId}-contacto-correo`}
                      type="email"
                      value={String(formData.contacto_correo || "")}
                      onChange={(e) => setFormData({ ...formData, contacto_correo: e.target.value })}
                      placeholder="correo@empresa.com"
                    />
                  </div>
                </div>

                <div className="rounded-[12px] border border-dashed border-[#D3D3D8] bg-white px-3 py-2.5 dark:border-[#3A4661] dark:bg-[#111827]">
                  <p className="text-[11px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
                    Si dejas el nombre vacío, no se crea ni actualiza un contacto. Con nombre, se guarda como contacto principal del cliente. Podrás agregar más contactos una vez guardado.
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-[11px] font-semibold text-[#1B5CFF] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#4B7CFF]"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        contacto_nombre:
                          String(prev.contacto_nombre || "").trim() ||
                          String(prev.representante || prev.nombre || "").trim(),
                        contacto_telefono:
                          String(prev.contacto_telefono || "").trim() ||
                          String(prev.celular || prev.telefono || "").replace(/\D/g, ""),
                        contacto_correo:
                          String(prev.contacto_correo || "").trim() || String(prev.correo || "").trim(),
                      }))
                    }
                  >
                    Rellenar desde datos básicos
                  </button>
                </div>
              </>
            )}
          </FieldGroup>
        </div>
      )}

      {activeTab === "more" && (
        <div
          role="tabpanel"
          id={`${tabsId}-panel-more`}
          aria-labelledby={`${tabsId}-more`}
          className="space-y-5"
        >
          {/* Información fiscal: identificadores para facturación CFDI.
              RFC y CURP viven una sola vez, en "Datos generales" — aquí solo
              lo que es exclusivo de facturación. */}
          <FieldGroup
            tone="azul"
            title="Información fiscal"
            hint="El RFC y CURP se toman de Datos generales."
            icon={
              <svg {...iconSvgProps} className="size-4">
                <path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                <path d="M14 2v4h4" />
                <path d="M8 10h8M8 14h5" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>idCIF</Label>
                <ModalInput value={String(formData.idcif || "")} onChange={(e) => setFormData({ ...formData, idcif: e.target.value })} />
              </div>
              <div>
                <Label>Razón Social</Label>
                <ModalInput
                  value={String(formData.razon_social || "")}
                  onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                />
              </div>
              <div>
                <Label>Régimen Fiscal</Label>
                <ModalInput
                  value={String(formData.regimen_fiscal || "")}
                  onChange={(e) => setFormData({ ...formData, regimen_fiscal: e.target.value })}
                />
              </div>
              <div>
                <Label>Uso CFDI</Label>
                <ModalInput
                  value={String(formData.uso_cfdi || "")}
                  onChange={(e) => setFormData({ ...formData, uso_cfdi: e.target.value })}
                />
              </div>
            </div>
          </FieldGroup>

          {/* Domicilio: libreta de direcciones (varias sucursales) una vez que el
              cliente existe; antes de guardar, una sola dirección con mapa. */}
          <FieldGroup
            tone="dorado"
            title="Domicilio"
            hint={
              editingCliente?.id
                ? "Este cliente puede tener varias direcciones — marca una como predeterminada."
                : undefined
            }
            icon={
              <svg {...iconSvgProps} className="size-4">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            }
            extra={
              !editingCliente?.id ? (
                <button
                  type="button"
                  onClick={onOpenMap}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[rgba(27,92,255,0.08)] px-3 text-[12px] font-medium text-[#1B5CFF] transition-colors hover:bg-[rgba(27,92,255,0.14)] dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF] dark:hover:bg-[rgba(75,124,255,0.22)]"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Seleccionar en mapa
                </button>
              ) : null
            }
          >
            {editingCliente?.id ? (
              <ClienteDireccionesManager clienteId={editingCliente.id} />
            ) : (
              <>
                <div>
                  <Label>Domicilio</Label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={String(formData.direccion || "")}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className={`${modalTextareaClass} pr-12`}
                      placeholder="Dirección, coordenadas o URL de Google Maps"
                    />
                    {!!String(formData.direccion || "").trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          const direccion = String(formData.direccion || "").trim();
                          if (
                            isGoogleMapsLink(direccion) ||
                            direccion.includes("google.com/maps") ||
                            direccion.includes("maps.app.goo.gl")
                          ) {
                            window.open(direccion, "_blank");
                            return;
                          }
                          const coordMatch = direccion.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                          if (coordMatch) {
                            window.open(`https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`, "_blank");
                            return;
                          }
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`,
                            "_blank"
                          );
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] bg-[rgba(27,92,255,0.08)] p-1.5 text-[#1B5CFF] transition-colors hover:bg-[rgba(27,92,255,0.14)] dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF] dark:hover:bg-[rgba(75,124,255,0.22)]"
                        title="Abrir en Google Maps"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label>No. Ext</Label>
                    <ModalInput
                      value={String(formData.numero_exterior || "")}
                      onChange={(e) => setFormData({ ...formData, numero_exterior: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>No. Int</Label>
                    <ModalInput
                      value={String(formData.interior || "")}
                      onChange={(e) => setFormData({ ...formData, interior: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Código Postal</Label>
                    <ModalInput
                      value={String(formData.codigo_postal || "")}
                      onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Colonia</Label>
                    <ModalInput
                      value={String(formData.colonia || "")}
                      onChange={(e) => setFormData({ ...formData, colonia: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Ciudad</Label>
                    <ModalInput
                      value={String(formData.ciudad || "")}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Localidad</Label>
                    <ModalInput
                      value={String(formData.localidad || "")}
                      onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <select
                      value={String(formData.estado || "")}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className={selectLikeClassName}
                    >
                      <option value="">Seleccione</option>
                      {estadosOptions.map((est) => (
                        <option key={est} value={est}>
                          {est}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>País</Label>
                    <select
                      value={String(formData.pais || "México")}
                      onChange={(e) => {
                        const pais = e.target.value;
                        const nextEstados = estadosPorPais[pais] || estadosPorPais["México"] || [];
                        const nextEstado = nextEstados.includes(String(formData.estado || ""))
                          ? formData.estado
                          : "";
                        setFormData({ ...formData, pais, estado: nextEstado });
                      }}
                      className={selectLikeClassName}
                    >
                      {paisOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </FieldGroup>
        </div>
      )}
      </div>
    </div>
  );
}
