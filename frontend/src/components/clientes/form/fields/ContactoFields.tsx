/**
 * Pestaña «Contacto»: al crear, el contacto principal; al editar un registro
 * guardado, la libreta de contactos (se guarda al instante desde sus tarjetas).
 */
import { Field, FormSection, TextInput } from "../../ui/FormUi";
import { createFieldBinding, digitsOnly, type ClienteFieldsTabProps } from "./fieldBinding";
import { BadgeCheck, UserRound } from "lucide-react";
import { ClienteContactosManager } from "../../libretas/ClienteContactosManager";
import { subtleBtn } from "../../ui/tokens";


export function ContactoFields({ formData, setFormData, errors, editingCliente }: ClienteFieldsTabProps) {
  const { bind } = createFieldBinding(formData, setFormData);
  const isEditingSaved = Boolean(editingCliente?.id);
  return (
    <>
        <FormSection
          tone="dorado"
          title="Contacto de negocio"
          icon={<UserRound className="size-4" />}
          hint={
            isEditingSaved
              ? "Puede tener varios contactos; marca uno como principal."
              : "Persona que se guardará como contacto principal (cotizaciones, órdenes y listados)."
          }
          extra={
            isEditingSaved ? null : (
              <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-[rgba(4,114,77,0.10)] px-2.5 text-[11.5px] font-semibold text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]">
                <BadgeCheck className="size-3.5" aria-hidden />
                Principal
              </span>
            )
          }
        >
          {isEditingSaved && editingCliente ? (
            <ClienteContactosManager clienteId={editingCliente.id} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nombre completo" className="md:col-span-2" hint="Déjalo vacío si no quieres registrar un contacto.">
                  {(c) => (
                    <TextInput
                      {...c}
                      {...bind("contacto_nombre", (v) => v.toUpperCase())}
                      placeholder="Nombre y apellido"
                      maxLength={200}
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field label="Puesto">
                  {(c) => <TextInput {...c} {...bind("contacto_puesto")} placeholder="Ej. Gerente de compras" maxLength={150} />}
                </Field>
                <Field label="Teléfono">
                  {(c) => (
                    <TextInput
                      {...c}
                      {...bind("contacto_telefono", (v) => digitsOnly(v, 15))}
                      type="tel"
                      inputMode="numeric"
                      placeholder="10 dígitos"
                    />
                  )}
                </Field>
                <Field label="Correo" className="md:col-span-2" error={errors.contacto_correo}>
                  {(c) => (
                    <TextInput
                      {...c}
                      {...bind("contacto_correo", (v) => v.trimStart())}
                      invalid={Boolean(errors.contacto_correo)}
                      type="email"
                      inputMode="email"
                      maxLength={254}
                      placeholder="correo@empresa.com"
                    />
                  )}
                </Field>
              </div>

              <div className="flex flex-col gap-2 rounded-[12px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-3.5 py-3 dark:border-[#3A4661] dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12.5px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Podrás agregar más contactos después de guardar.
                </p>
                <button
                  type="button"
                  className={subtleBtn}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      contacto_nombre:
                        String(prev.contacto_nombre || "").trim() || String(prev.representante || prev.nombre || "").trim(),
                      contacto_telefono:
                        String(prev.contacto_telefono || "").trim() || String(prev.celular || prev.telefono || "").replace(/\D/g, ""),
                      contacto_correo: String(prev.contacto_correo || "").trim() || String(prev.correo || "").trim(),
                    }))
                  }
                >
                  Copiar de datos básicos
                </button>
              </div>
            </>
          )}
        </FormSection>
    </>
  );
}
