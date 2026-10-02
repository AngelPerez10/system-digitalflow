/**
 * Libreta de contactos del cliente: tarjetas, uno marcado «Principal»,
 * agregar / editar / eliminar sin salir del modal.
 */
import { UserRound } from "lucide-react";
import { canDeleteInModule } from "@/pages/Configuracion/usuarios/usuariosModel";
import { useAuth } from "@/context/AuthContext";
import type { ClienteContacto } from "@/types/cliente";
import { type ClienteContactoInput, contactoToInput, emptyClienteContactoInput } from "../domain/clienteContacto";
import { createClienteContacto, deleteClienteContacto, listClienteContactos, updateClienteContacto } from "../api/contactosApi";
import { Field, Notice, Switch, TextInput } from "../ui/FormUi";
import { LibretaAddButton, LibretaCard, LibretaEditor, LibretaEmpty, LibretaLoadError, LibretaLoading } from "../ui/LibretaUi";
import { isValidEmail, mailHref, telHref } from "../domain/clienteLinks";
import { useLibreta, type LibretaApi } from "../hooks/useLibreta";

const CONTACTOS_API: LibretaApi<ClienteContacto, ClienteContactoInput> = {
  list: listClienteContactos,
  create: createClienteContacto,
  update: updateClienteContacto,
  remove: deleteClienteContacto,
  empty: (o) => emptyClienteContactoInput(o),
  toInput: contactoToInput,
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const validate = (d: ClienteContactoInput) => {
  if (!d.nombre_apellido.trim()) return "Escribe el nombre del contacto.";
  if (d.correo.trim() && !isValidEmail(d.correo)) return "Revisa el correo; debe ser como nombre@empresa.com.";
  return null;
};

const normalize = (d: ClienteContactoInput): ClienteContactoInput => ({
  ...d,
  nombre_apellido: d.nombre_apellido.trim().toUpperCase(),
  area_puesto: d.area_puesto.trim(),
  correo: d.correo.trim(),
});

const linkClass = "font-medium text-[#1244D1] hover:underline dark:text-[#7FA2FF]";

export function ClienteContactosManager({ clienteId }: { clienteId: number }) {
  const { permissions, isAdmin } = useAuth();
  // El servidor exige `clientes.delete` para borrar contactos: sin él no se ofrece el botón.
  const canDelete = canDeleteInModule(permissions, isAdmin, "clientes");
  const lib = useLibreta(clienteId, CONTACTOS_API);
  const { draft, setDraft } = lib;
  const patch = (p: Partial<ClienteContactoInput>) => setDraft((prev) => ({ ...prev, ...p }));

  return (
    <div className="space-y-3">
      {lib.error && lib.editingId === null ? <Notice tone="error">{lib.error}</Notice> : null}

      {lib.loading ? (
        <LibretaLoading label="Cargando contactos…" />
      ) : lib.loadError ? (
        <LibretaLoadError message={lib.loadError} onRetry={lib.reload} />
      ) : lib.items.length === 0 && lib.editingId === null ? (
        <LibretaEmpty>Este registro todavía no tiene contactos.</LibretaEmpty>
      ) : (
        <ul className="space-y-2" aria-label="Contactos registrados">
          {lib.items.map((c, i) => {
            const tel = telHref(c.celular);
            const mail = mailHref(c.correo);
            return (
              <LibretaCard
                key={c.id}
                index={i}
                leading={
                  <span
                    className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                      c.is_principal
                        ? "bg-[rgba(4,114,77,0.10)] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]"
                        : "bg-[rgba(230,162,60,0.14)] text-[#8A5D0F] dark:text-[#F0B860]"
                    }`}
                    aria-hidden
                  >
                    {initials(c.nombre_apellido || "?")}
                  </span>
                }
                title={c.nombre_apellido.trim() || "Sin nombre"}
                principal={Boolean(c.is_principal)}
                principalLabel="Principal"
                makePrincipalLabel="Marcar como principal"
                details={
                  <>
                    {c.area_puesto ? <p>{c.area_puesto}</p> : null}
                    {c.correo || c.celular ? (
                      <p className="flex flex-wrap gap-x-3">
                        {c.correo ? (mail ? <a href={mail} className={linkClass}>{c.correo}</a> : <span>{c.correo}</span>) : null}
                        {c.celular ? (tel ? <a href={tel} className={`${linkClass} tabular-nums`}>{c.celular}</a> : <span>{c.celular}</span>) : null}
                      </p>
                    ) : (
                      <p className="text-[#8E8E96]">Sin teléfono ni correo</p>
                    )}
                  </>
                }
                busy={lib.busyId === c.id}
                canDelete={canDelete}
                confirmingDelete={lib.confirmDeleteId === c.id}
                deleteMessage="¿Eliminar este contacto?"
                onEdit={() => lib.openEdit(c)}
                onAskDelete={() => c.id != null && lib.setConfirmDeleteId(c.id)}
                onCancelDelete={() => lib.setConfirmDeleteId(null)}
                onConfirmDelete={() => c.id != null && void lib.remove(c.id)}
                onMakePrincipal={() => void lib.makePrincipal(c)}
              />
            );
          })}
        </ul>
      )}

      {lib.editingId !== null ? (
        <LibretaEditor
          title={lib.editingId === "new" ? "Nuevo contacto" : "Editar contacto"}
          icon={<UserRound className="size-4" />}
          error={lib.error}
          saving={lib.saving}
          submitLabel={lib.editingId === "new" ? "Agregar contacto" : "Guardar contacto"}
          onSubmit={() => void lib.save(validate, normalize)}
          onCancel={lib.closeEditor}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" required className="sm:col-span-2">
              {(ctl) => (
                <TextInput
                  {...ctl}
                  value={draft.nombre_apellido}
                  onChange={(e) => patch({ nombre_apellido: e.target.value.toUpperCase() })}
                  placeholder="Nombre y apellido"
                  maxLength={200}
                  autoFocus
                />
              )}
            </Field>
            <Field label="Puesto">
              {(ctl) => (
                <TextInput {...ctl} value={draft.area_puesto} onChange={(e) => patch({ area_puesto: e.target.value })} placeholder="Ej. Gerente de compras" maxLength={150} />
              )}
            </Field>
            <Field label="Teléfono">
              {(ctl) => (
                <TextInput
                  {...ctl}
                  type="tel"
                  inputMode="numeric"
                  value={draft.celular}
                  onChange={(e) => patch({ celular: e.target.value.replace(/\D/g, "").slice(0, 15) })}
                  placeholder="10 dígitos"
                />
              )}
            </Field>
            <Field label="Correo" className="sm:col-span-2">
              {(ctl) => (
                <TextInput
                  {...ctl}
                  type="email"
                  inputMode="email"
                  value={draft.correo}
                  onChange={(e) => patch({ correo: e.target.value.trimStart() })}
                  placeholder="correo@empresa.com"
                  maxLength={254}
                />
              )}
            </Field>
          </div>
          <Switch
            checked={draft.is_principal}
            onChange={(v) => patch({ is_principal: v })}
            label="Contacto principal"
            description="Se usa por defecto en cotizaciones y órdenes."
          />
        </LibretaEditor>
      ) : (
        <LibretaAddButton label={lib.items.length === 0 ? "Agregar contacto" : "Agregar otro contacto"} onClick={lib.openNew} />
      )}
    </div>
  );
}
