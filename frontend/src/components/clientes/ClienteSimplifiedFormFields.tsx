import type { Dispatch, SetStateAction, ReactNode } from "react";
import { useId } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SearchableSelect from "@/components/form/SearchableSelect";
import { estadosPorPais, paisOptions } from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";
import type { Cliente } from "@/types/cliente";
import {
  type ClienteFormTab,
  ClienteTipo,
  TIPO_OPTIONS,
  getNoClienteLabelByTipo,
  isGoogleMapsLink,
  modalPanelClass,
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

const TABS: { id: ClienteFormTab; label: string }[] = [
  { id: "general", label: "Datos Básicos" },
  { id: "contacto", label: "Contacto" },
  { id: "more", label: "Datos Facturación" },
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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] ${sectionIconTone[tone]}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <p className={modalSectionTitleClass}>{title}</p>
            {hint ? <p className="mt-0.5 text-[12px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">{hint}</p> : null}
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
  const noClienteLabel = getNoClienteLabelByTipo(fixedTipo || (formData.tipo as ClienteTipo));
  const estadosOptions =
    estadosPorPais[String(formData.pais || "México")] || estadosPorPais["México"] || [];

  return (
    <>
      {!hideTabs ? (
        <div
          role="tablist"
          aria-label="Secciones del formulario de cliente"
          className="inline-flex flex-wrap items-center gap-1 rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] p-1 dark:border-[#273244] dark:bg-[#1B2539]"
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
                className={`${modalTabBaseClass} border ${
                  selected
                    ? "border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
                    : "border-transparent bg-transparent text-[#52525B] hover:bg-white dark:text-[#B7C1D1] dark:hover:bg-white/[0.06]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {activeTab === "general" && (
        <div
          role="tabpanel"
          id={`${tabsId}-panel-general`}
          aria-labelledby={`${tabsId}-general`}
          className="space-y-4"
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
              {!hideContactMeta && !fixedTipo && (
                <div className="grid grid-cols-1 gap-3 md:max-w-md">
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
                </div>
              )}

              {!hideContactMeta ? (
                <div className={`grid grid-cols-1 gap-3 ${editingCliente ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
                  {editingCliente ? (
                    <div>
                      <Label>{noClienteLabel}</Label>
                      <Input
                        value={String(formData.no_cliente || editingCliente.idx || "")}
                        disabled
                        className="opacity-70"
                      />
                      <p className="mt-1 text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">Número interno del sistema.</p>
                    </div>
                  ) : null}
                  <div>
                    <Label>Clave</Label>
                    <Input
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
                    <Input
                      value={String(formData.no_cliente || "")}
                      disabled
                      className="opacity-70"
                    />
                    <p className="mt-1 text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">Identificador en SICAR.</p>
                  </div>
                  <div>
                    <Label>Clave</Label>
                    <Input
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
                    <Input
                      value={String(formData.representante || "")}
                      onChange={(e) => setFormData({ ...formData, representante: e.target.value })}
                    />
                  </>
                )}
              </div>
              <div>
                <Label>Nombre</Label>
                <Input
                  value={String(formData.nombre || "")}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>RFC</Label>
                <Input value={String(formData.rfc || "")} onChange={(e) => setFormData({ ...formData, rfc: e.target.value })} />
              </div>
              <div>
                <Label>CURP</Label>
                <Input value={String(formData.curp || "")} onChange={(e) => setFormData({ ...formData, curp: e.target.value })} />
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
                <Input
                  value={String(formData.telefono || "")}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: (e.target.value || "").replace(/\D/g, "") })
                  }
                />
              </div>
              <div>
                <Label>Celular</Label>
                <Input
                  value={String(formData.celular || "")}
                  onChange={(e) =>
                    setFormData({ ...formData, celular: (e.target.value || "").replace(/\D/g, "") })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Correo</Label>
              <Input
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
                <Input
                  type="number"
                  value={String(formData.limite_credito ?? "")}
                  onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
                />
              </div>
              <div>
                <Label>Días crédito</Label>
                <Input
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
          className="space-y-4"
        >
          <FieldGroup
            tone="dorado"
            title="Contacto de negocio"
            hint="Persona de contacto que se guardará con este cliente (cotizaciones, órdenes y listados)."
            icon={
              <svg {...iconSvgProps} className="size-4">
                <path d="M20 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H8.4A4.4 4.4 0 0 0 4 19.4V21" />
                <circle cx="12" cy="7.5" r="3.8" />
              </svg>
            }
            extra={
              formData.contacto_id ? (
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor={`${tabsId}-contacto-nombre`}>Nombre completo</Label>
                <Input
                  id={`${tabsId}-contacto-nombre`}
                  value={String(formData.contacto_nombre || "")}
                  onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                  placeholder="Nombre y apellido"
                />
              </div>
              <div>
                <Label htmlFor={`${tabsId}-contacto-puesto`}>Puesto</Label>
                <Input
                  id={`${tabsId}-contacto-puesto`}
                  value={String(formData.contacto_puesto || "")}
                  onChange={(e) => setFormData({ ...formData, contacto_puesto: e.target.value })}
                  placeholder="Ej. Gerente de compras"
                />
              </div>
              <div>
                <Label htmlFor={`${tabsId}-contacto-telefono`}>Teléfono</Label>
                <Input
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
                <Input
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
                Si dejas el nombre vacío, no se crea ni actualiza un contacto. Con nombre, se guarda como contacto principal del cliente.
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
          </FieldGroup>
        </div>
      )}

      {activeTab === "more" && (
        <div
          role="tabpanel"
          id={`${tabsId}-panel-more`}
          aria-labelledby={`${tabsId}-more`}
          className="space-y-4"
        >
          {/* Información fiscal: identificadores para facturación CFDI. */}
          <FieldGroup
            tone="azul"
            title="Información fiscal"
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
                <Label>RFC</Label>
                <Input
                  value={String(formData.rfc_fiscal || "")}
                  onChange={(e) => setFormData({ ...formData, rfc_fiscal: e.target.value })}
                />
              </div>
              <div>
                <Label>idCIF</Label>
                <Input value={String(formData.idcif || "")} onChange={(e) => setFormData({ ...formData, idcif: e.target.value })} />
              </div>
              <div>
                <Label>Razón Social</Label>
                <Input
                  value={String(formData.razon_social || "")}
                  onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                />
              </div>
              <div>
                <Label>CURP</Label>
                <Input
                  value={String(formData.curp_fiscal || "")}
                  onChange={(e) => setFormData({ ...formData, curp_fiscal: e.target.value })}
                />
              </div>
              <div>
                <Label>Régimen Fiscal</Label>
                <Input
                  value={String(formData.regimen_fiscal || "")}
                  onChange={(e) => setFormData({ ...formData, regimen_fiscal: e.target.value })}
                />
              </div>
              <div>
                <Label>Uso CFDI</Label>
                <Input
                  value={String(formData.uso_cfdi || "")}
                  onChange={(e) => setFormData({ ...formData, uso_cfdi: e.target.value })}
                />
              </div>
            </div>
          </FieldGroup>

          {/* Domicilio fiscal: dirección completa, con acceso rápido al mapa. */}
          <FieldGroup
            tone="dorado"
            title="Domicilio fiscal"
            icon={
              <svg {...iconSvgProps} className="size-4">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            }
            extra={
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
            }
          >
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
                <Input
                  value={String(formData.numero_exterior || "")}
                  onChange={(e) => setFormData({ ...formData, numero_exterior: e.target.value })}
                />
              </div>
              <div>
                <Label>No. Int</Label>
                <Input
                  value={String(formData.interior || "")}
                  onChange={(e) => setFormData({ ...formData, interior: e.target.value })}
                />
              </div>
              <div>
                <Label>Código Postal</Label>
                <Input
                  value={String(formData.codigo_postal || "")}
                  onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                />
              </div>
              <div>
                <Label>Colonia</Label>
                <Input
                  value={String(formData.colonia || "")}
                  onChange={(e) => setFormData({ ...formData, colonia: e.target.value })}
                />
              </div>
              <div>
                <Label>Ciudad</Label>
                <Input
                  value={String(formData.ciudad || "")}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                />
              </div>
              <div>
                <Label>Localidad</Label>
                <Input
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
          </FieldGroup>
        </div>
      )}
    </>
  );
}
