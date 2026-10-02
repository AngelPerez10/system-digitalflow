/** Pestaña «Datos básicos»: identificación, datos generales, contacto directo y condiciones. */
import { Field, FormSection, SelectInput, Switch, TextArea, TextInput } from "../../ui/FormUi";
import { createFieldBinding, digitsOnly, type ClienteFieldsTabProps } from "./fieldBinding";
import { CreditCard, IdCard, Phone, UserRound } from "lucide-react";
import SearchableSelect from "@/components/form/SearchableSelect";
import { phoneCountryOptions } from "../../domain/clienteCatalogos";
import { TIPO_OPTIONS, type ClienteTipo } from "../../domain/clienteTipos";
import { phoneShellClass } from "../../ui/tokens";


const PHONE_DIALS = phoneCountryOptions.map((c) => c.dial).filter((v, i, a) => a.indexOf(v) === i).join(" / ");

export type RepresentanteSelectConfig = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  onSearchChange?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

type Props = ClienteFieldsTabProps & {
  fixedTipo?: ClienteTipo;
  hideContactMeta: boolean;
  representanteSelect?: RepresentanteSelectConfig;
};

export function GeneralFields({ formData, setFormData, errors, fixedTipo, hideContactMeta, representanteSelect }: Props) {
  const { str, set, bind } = createFieldBinding(formData, setFormData);
  return (
    <>
        <FormSection tone="azul" title="Identificación" hint="Cómo se registra este contacto en el sistema." icon={<IdCard className="size-4" />}>
          {!hideContactMeta ? (
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${fixedTipo ? "" : "lg:grid-cols-3"}`}>
              {!fixedTipo ? (
                <Field label="Tipo de contacto">
                  {(c) => (
                    <SelectInput {...c} name="tipo" value={str("tipo") || "EMPRESA"} onChange={(e) => set("tipo", e.target.value as ClienteTipo)}>
                      {TIPO_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </Field>
              ) : null}
              <Field label="Clave" hint="Opcional. Tu código interno.">
                {(c) => <TextInput {...c} {...bind("clave")} maxLength={50} autoComplete="off" />}
              </Field>
              <div className="sm:pt-6">
                <Switch
                  checked={Boolean(formData.is_prospecto)}
                  onChange={(v) => set("is_prospecto", v)}
                  label="Es prospecto"
                  description="Aún no es cliente."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="No. de cliente" hint="Identificador en SICAR.">
                {(c) => <TextInput {...c} value={str("no_cliente")} readOnly disabled />}
              </Field>
              <Field label="Clave">
                {(c) => <TextInput {...c} value={str("clave")} readOnly disabled />}
              </Field>
            </div>
          )}
        </FormSection>

        <FormSection tone="marino" title="Datos generales" icon={<UserRound className="size-4" />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre o razón comercial" required error={errors.nombre}>
              {(c) => (
                <TextInput
                  {...c}
                  {...bind("nombre", (v) => v.toUpperCase())}
                  invalid={Boolean(errors.nombre)}
                  maxLength={200}
                  autoComplete="organization"
                />
              )}
            </Field>
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
              <Field label="Representante">
                {(c) => <TextInput {...c} {...bind("representante", (v) => v.toUpperCase())} maxLength={200} autoComplete="name" />}
              </Field>
            )}
            <Field label="RFC" hint="12 o 13 caracteres.">
              {(c) => (
                <TextInput
                  {...c}
                  {...bind("rfc", (v) => v.toUpperCase().replace(/\s/g, ""))}
                  maxLength={13}
                  autoComplete="off"
                  spellCheck={false}
                  className="uppercase"
                />
              )}
            </Field>
            <Field label="CURP" hint="Solo personas físicas.">
              {(c) => (
                <TextInput
                  {...c}
                  {...bind("curp", (v) => v.toUpperCase().replace(/\s/g, ""))}
                  maxLength={18}
                  autoComplete="off"
                  spellCheck={false}
                  className="uppercase"
                />
              )}
            </Field>
          </div>
        </FormSection>

        <FormSection tone="dorado" title="Contacto directo" icon={<Phone className="size-4" />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Teléfono"
              required
              error={errors.telefono}
              hint={`Elige el país para anteponer su código (${PHONE_DIALS}).`}
            >
              {(c) => (
                <div
                  className={`${phoneShellClass} ${
                    errors.telefono ? "!border-[#C22B2B] focus-within:!ring-[rgba(194,43,43,0.18)] dark:!border-[#F87171]" : ""
                  }`}
                >
                  <div className="relative shrink-0 border-r border-[#E7E7EA] dark:border-[#273244]">
                    <select
                      aria-label="Código de país del teléfono"
                      name="telefono_pais"
                      value={str("telefono_pais") || "MX"}
                      onChange={(e) => set("telefono_pais", e.target.value)}
                      className="h-full appearance-none bg-transparent py-2.5 pl-3 pr-8 text-[14px] font-medium text-[#09090B] outline-none dark:text-[#F8FAFC]"
                    >
                      {phoneCountryOptions.map((pc) => (
                        <option key={pc.code} value={pc.code} className="bg-white text-[#09090B] dark:bg-[#111827] dark:text-[#F8FAFC]">
                          {pc.shortLabel} {pc.dial}
                        </option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#A1A1AA]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <input
                    {...c}
                    {...bind("telefono", (v) => digitsOnly(v, 10))}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="10 dígitos"
                    className="w-full min-w-0 flex-1 bg-transparent px-3 text-[15px] tabular-nums tracking-[-0.1px] text-[#09090B] outline-none placeholder:text-[#A1A1AA] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8]"
                  />
                </div>
              )}
            </Field>
            <Field label="Celular">
              {(c) => (
                <TextInput {...c} {...bind("celular", (v) => digitsOnly(v, 15))} type="tel" inputMode="numeric" autoComplete="tel" />
              )}
            </Field>
            <Field label="Correo" error={errors.correo} className="md:col-span-2">
              {(c) => (
                <TextInput
                  {...c}
                  {...bind("correo", (v) => v.trimStart())}
                  invalid={Boolean(errors.correo)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="nombre@empresa.com"
                />
              )}
            </Field>
          </div>
        </FormSection>

        <FormSection tone="azul" title="Condiciones comerciales" icon={<CreditCard className="size-4" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Lista de precios">
              {(c) => (
                <SelectInput {...c} name="numero_precio" value={str("numero_precio") || "1"} onChange={(e) => set("numero_precio", e.target.value)}>
                  <option value="1">Precio 1</option>
                  <option value="2">Precio 2</option>
                  <option value="3">Precio 3</option>
                </SelectInput>
              )}
            </Field>
            <Field label="Límite de crédito" hint="En pesos, sin comas." error={errors.limite_credito}>
              {(c) => (
                <TextInput
                  {...c}
                  {...bind("limite_credito", (v) => v.replace(/[^\d.]/g, ""))}
                  invalid={Boolean(errors.limite_credito)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="tabular-nums"
                />
              )}
            </Field>
            <Field label="Días de crédito" error={errors.dias_credito}>
              {(c) => (
                <TextInput
                  {...c}
                  {...bind("dias_credito", (v) => digitsOnly(v, 3))}
                  invalid={Boolean(errors.dias_credito)}
                  inputMode="numeric"
                  placeholder="0"
                  className="tabular-nums"
                />
              )}
            </Field>
          </div>
          <Field label="Comentario" hint="Nota interna; no se imprime en documentos.">
            {(c) => <TextArea {...c} {...bind("notas")} rows={3} maxLength={1000} />}
          </Field>
        </FormSection>
    </>
  );
}
