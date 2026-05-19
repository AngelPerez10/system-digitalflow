import type { Dispatch, SetStateAction } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { estadosPorPais, paisOptions } from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";
import type { Cliente } from "@/types/cliente";
import {
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
  activeTab: "general" | "more";
  setActiveTab: (tab: "general" | "more") => void;
  fixedTipo?: ClienteTipo;
  editingCliente?: Cliente | null;
  onOpenMap: () => void;
};

export function ClienteSimplifiedFormFields({
  formData,
  setFormData,
  activeTab,
  setActiveTab,
  fixedTipo,
  editingCliente,
  onOpenMap,
}: Props) {
  const noClienteLabel = getNoClienteLabelByTipo(fixedTipo || (formData.tipo as ClienteTipo));
  const estadosOptions =
    estadosPorPais[String(formData.pais || "México")] || estadosPorPais["México"] || [];

  return (
    <>
      <div className="inline-flex items-center gap-1 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0f172a]/80">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`${modalTabBaseClass} border ${
            activeTab === "general"
              ? "border-[#ff801f]/30 bg-[#ff801f] text-black shadow-sm"
              : "border-transparent bg-transparent text-gray-700 hover:bg-white dark:text-[#e5e7eb] dark:hover:bg-white/[0.06]"
          }`}
        >
          Datos Básicos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("more")}
          className={`${modalTabBaseClass} border ${
            activeTab === "more"
              ? "border-[#ff801f]/30 bg-[#ff801f] text-black shadow-sm"
              : "border-transparent bg-transparent text-gray-700 hover:bg-white dark:text-[#e5e7eb] dark:hover:bg-white/[0.06]"
          }`}
        >
          Datos Facturación
        </button>
      </div>

      {activeTab === "general" && (
        <div className="space-y-4">
          <div className={`${modalPanelClass} space-y-4`}>
            <p className={modalSectionTitleClass}>Información Comercial</p>
            {!fixedTipo && (
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
            <div className={`grid grid-cols-1 gap-3 ${editingCliente ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
              {editingCliente ? (
                <div>
                  <Label>{noClienteLabel}</Label>
                  <Input
                    value={String(formData.no_cliente || editingCliente.idx || "")}
                    disabled
                    className="opacity-70"
                  />
                  <p className="mt-1 text-[10px] text-[#8b7b69] dark:text-[#8ea0b8]">Número interno del sistema.</p>
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
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_prospecto: !formData.is_prospecto })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_prospecto ? "bg-[#ff801f]" : "bg-gray-300 dark:bg-[#334155]"
                  }`}
                  aria-pressed={!!formData.is_prospecto}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      formData.is_prospecto ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="ml-2 text-xs font-medium text-[#8b7b69] dark:text-[#8ea0b8]">
                  {formData.is_prospecto ? "Sí" : "No"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Representante</Label>
                <Input
                  value={String(formData.representante || "")}
                  onChange={(e) => setFormData({ ...formData, representante: e.target.value })}
                />
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

            <div>
              <Label>Comentario</Label>
              <textarea
                rows={4}
                value={String(formData.notas || "")}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className={modalTextareaClass}
              />
            </div>

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
          </div>
        </div>
      )}

      {activeTab === "more" && (
        <div className="space-y-4">
          <div className={`${modalPanelClass} space-y-4`}>
            <p className={modalSectionTitleClass}>Información Fiscal</p>
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

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <Label>Domicilio</Label>
                <button
                  type="button"
                  onClick={onOpenMap}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#ff801f] transition-colors hover:text-[#ff6a00] dark:text-[#fb923c] dark:hover:text-[#fdba74]"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Seleccionar en mapa
                </button>
              </div>
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-[#fff3e8] p-1.5 text-[#ff801f] transition-colors hover:bg-[#ffe2cc] dark:bg-[#7c2d12]/30 dark:text-[#fb923c] dark:hover:bg-[#9a3412]/35"
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
          </div>
        </div>
      )}
    </>
  );
}
