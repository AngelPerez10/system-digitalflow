/**
 * Pestaña «Facturación y domicilio»: información fiscal y, al crear, el
 * domicilio (con mapa); al editar, la libreta de direcciones.
 */
import { Field, FormSection, SelectInput, TextArea, TextInput } from "../../ui/FormUi";
import { createFieldBinding, digitsOnly, type ClienteFieldsTabProps } from "./fieldBinding";
import { FileText, MapPin } from "lucide-react";
import { estadosPorPais, paisOptions } from "../../domain/clienteCatalogos";
import { mapsUrlFor } from "../../domain/clienteLinks";
import { ClienteDireccionesManager } from "../../libretas/ClienteDireccionesManager";
import { subtleBtn } from "../../ui/tokens";


type Props = ClienteFieldsTabProps & { onOpenMap: () => void };

export function FacturacionFields({ formData, setFormData, editingCliente, onOpenMap }: Props) {
  const { str, set, bind } = createFieldBinding(formData, setFormData);
  const isEditingSaved = Boolean(editingCliente?.id);
  const pais = str("pais") || "México";
  const estadosOptions = estadosPorPais[pais] || estadosPorPais["México"] || [];
  const direccionUrl = mapsUrlFor(str("direccion"));
  return (
    <>
        <FormSection tone="azul" title="Información fiscal" hint="El RFC y la CURP se toman de Datos básicos." icon={<FileText className="size-4" />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Razón social" hint="Como aparece en la constancia fiscal.">
              {(c) => <TextInput {...c} {...bind("razon_social")} maxLength={250} autoComplete="organization" />}
            </Field>
            <Field label="idCIF">
              {(c) => <TextInput {...c} {...bind("idcif", (v) => v.replace(/\s/g, ""))} maxLength={30} autoComplete="off" />}
            </Field>
            <Field label="Régimen fiscal" hint="Clave SAT, p. ej. 601.">
              {(c) => <TextInput {...c} {...bind("regimen_fiscal")} maxLength={100} />}
            </Field>
            <Field label="Uso CFDI" hint="Clave SAT, p. ej. G03.">
              {(c) => <TextInput {...c} {...bind("uso_cfdi", (v) => v.toUpperCase())} maxLength={10} />}
            </Field>
          </div>
        </FormSection>

        <FormSection
          tone="dorado"
          title="Domicilio"
          icon={<MapPin className="size-4" />}
          hint={isEditingSaved ? "Puede tener varias direcciones; marca una como predeterminada." : undefined}
          extra={
            !isEditingSaved ? (
              <button type="button" onClick={onOpenMap} className={subtleBtn}>
                <MapPin className="size-3.5" aria-hidden />
                Elegir en el mapa
              </button>
            ) : null
          }
        >
          {isEditingSaved && editingCliente ? (
            <ClienteDireccionesManager clienteId={editingCliente.id} />
          ) : (
            <>
              <Field
                label="Referencia o ubicación"
                hint="Dirección en texto, coordenadas o liga de Google Maps."
                labelAside={
                  direccionUrl ? (
                    <a href={direccionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#1244D1] hover:underline dark:text-[#7FA2FF]">
                      <MapPin className="size-3.5" aria-hidden />
                      Ver en Google Maps
                      <span className="sr-only"> (abre en una pestaña nueva)</span>
                    </a>
                  ) : null
                }
              >
                {(c) => <TextArea {...c} {...bind("direccion")} rows={2} maxLength={500} />}
              </Field>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Calle" className="col-span-2">
                  {(c) => <TextInput {...c} {...bind("calle")} autoComplete="address-line1" />}
                </Field>
                <Field label="No. ext.">
                  {(c) => <TextInput {...c} {...bind("numero_exterior")} maxLength={20} />}
                </Field>
                <Field label="No. int.">
                  {(c) => <TextInput {...c} {...bind("interior")} maxLength={20} />}
                </Field>
                <Field label="Código postal">
                  {(c) => (
                    <TextInput {...c} {...bind("codigo_postal", (v) => digitsOnly(v, 5))} inputMode="numeric" autoComplete="postal-code" />
                  )}
                </Field>
                <Field label="Colonia">
                  {(c) => <TextInput {...c} {...bind("colonia")} />}
                </Field>
                <Field label="Ciudad">
                  {(c) => <TextInput {...c} {...bind("ciudad")} autoComplete="address-level2" />}
                </Field>
                <Field label="Localidad">
                  {(c) => <TextInput {...c} {...bind("localidad")} />}
                </Field>
                <Field label="País" className="col-span-2">
                  {(c) => (
                    <SelectInput
                      {...c}
                      name="pais"
                      value={pais}
                      autoComplete="country-name"
                      onChange={(e) => {
                        const nextPais = e.target.value;
                        setFormData((prev) => {
                          const nextEstados = estadosPorPais[nextPais] || estadosPorPais["México"] || [];
                          const estado = nextEstados.includes(String(prev.estado || "")) ? prev.estado : "";
                          return { ...prev, pais: nextPais, estado };
                        });
                      }}
                    >
                      {paisOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </Field>
                <Field label="Estado" className="col-span-2">
                  {(c) => (
                    <SelectInput {...c} name="estado" value={str("estado")} onChange={(e) => set("estado", e.target.value)} autoComplete="address-level1">
                      <option value="">Selecciona…</option>
                      {estadosOptions.map((est) => (
                        <option key={est} value={est}>
                          {est}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </Field>
              </div>
            </>
          )}
        </FormSection>
    </>
  );
}
