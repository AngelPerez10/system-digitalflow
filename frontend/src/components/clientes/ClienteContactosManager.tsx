import { useEffect, useId, useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import type { ClienteContacto } from "@/types/cliente";
import {
  type ClienteContactoInput,
  createClienteContacto,
  deleteClienteContacto,
  emptyClienteContactoInput,
  listClienteContactos,
  updateClienteContacto,
} from "./clienteContactosApi";

type Props = {
  clienteId: number;
};

const personIconSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg {...personIconSvgProps} className={className}>
      <path d="M20 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H8.4A4.4 4.4 0 0 0 4 19.4V21" />
      <circle cx="12" cy="7.5" r="3.8" />
    </svg>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function contactoResumen(c: ClienteContacto): string {
  return [c.area_puesto, c.correo].filter(Boolean).join(" — ") || c.celular.trim() || "Sin datos capturados";
}

function draftFromContacto(c: ClienteContacto): ClienteContactoInput {
  return {
    nombre_apellido: c.nombre_apellido.toUpperCase(),
    titulo: c.titulo,
    area_puesto: c.area_puesto,
    celular: c.celular,
    correo: c.correo,
    is_principal: !!c.is_principal,
  };
}

/**
 * Libreta de contactos del cliente — mismo patrón que la libreta de
 * direcciones: lista de tarjetas, uno marcado como "Principal",
 * agregar/editar/eliminar sin salir del modal.
 */
export function ClienteContactosManager({ clienteId }: Props) {
  const formId = useId();
  const [contactos, setContactos] = useState<ClienteContacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<ClienteContactoInput>(emptyClienteContactoInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const reload = async () => {
    setLoading(true);
    const rows = await listClienteContactos(clienteId);
    setContactos(rows);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const openNew = () => {
    setDraft(emptyClienteContactoInput({ is_principal: contactos.length === 0 }));
    setError("");
    setEditingId("new");
  };

  const openEdit = (c: ClienteContacto) => {
    setDraft(draftFromContacto(c));
    setError("");
    setEditingId(c.id ?? "new");
  };

  const closeForm = () => {
    setEditingId(null);
    setError("");
  };

  const handleSave = async () => {
    if (!draft.nombre_apellido.trim()) {
      setError("Captura el nombre del contacto.");
      return;
    }
    setSaving(true);
    setError("");
    const normalizedDraft = { ...draft, nombre_apellido: draft.nombre_apellido.trim().toUpperCase() };
    try {
      if (editingId === "new") {
        await createClienteContacto(clienteId, normalizedDraft);
      } else if (typeof editingId === "number") {
        await updateClienteContacto(editingId, normalizedDraft);
      }
      await reload();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el contacto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteClienteContacto(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el contacto.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleMakePrincipal = async (c: ClienteContacto) => {
    if (c.is_principal || !c.id) return;
    try {
      await updateClienteContacto(c.id, { ...draftFromContacto(c), is_principal: true });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el contacto principal.");
    }
  };

  return (
    <div className="space-y-3">
      {error && !editingId ? (
        <p className="rounded-[10px] border border-[#F6CFCF] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#C22B2B] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#F87171]" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Cargando contactos…</p>
      ) : contactos.length === 0 && editingId === null ? (
        <p className="rounded-[12px] border border-dashed border-[#D3D3D8] bg-white px-3 py-3 text-[13px] text-[#6E6E77] dark:border-[#3A4661] dark:bg-[#111827] dark:text-[#8EA0B8]">
          Este cliente todavía no tiene contactos registrados.
        </p>
      ) : (
        <ul className="space-y-2">
          {contactos.map((c) => (
            <li
              key={c.id}
              className={`rounded-[14px] border bg-white p-3 transition-colors dark:bg-[#111827] ${
                c.is_principal
                  ? "border-[#BFE6D4] bg-[rgba(4,114,77,0.03)] dark:border-[#1E5A42] dark:bg-[rgba(74,222,128,0.04)]"
                  : "border-[#E7E7EA] dark:border-[#273244]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      c.is_principal
                        ? "bg-[rgba(4,114,77,0.10)] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]"
                        : "bg-[rgba(230,162,60,0.14)] text-[#9A6B15] dark:text-[#E6A23C]"
                    }`}
                    aria-hidden
                  >
                    {initials(c.nombre_apellido || "?")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                        {c.nombre_apellido.trim() || "Sin nombre"}
                      </p>
                      {c.is_principal ? (
                        <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[rgba(4,114,77,0.10)] px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]">
                          Principal
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12px] leading-snug text-[#52525B] dark:text-[#B7C1D1]">
                      {contactoResumen(c)}
                    </p>
                    {c.celular ? (
                      <a
                        href={`tel:${c.celular}`}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B5CFF] hover:underline dark:text-[#4B7CFF]"
                      >
                        {c.celular}
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!c.is_principal ? (
                    <button
                      type="button"
                      onClick={() => void handleMakePrincipal(c)}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#1244D1] underline-offset-2 hover:underline dark:text-[#4B7CFF]"
                    >
                      Marcar principal
                    </button>
                  ) : null}
                  <div className="inline-flex items-center gap-1 rounded-xl bg-[#FAFAFA] p-1 dark:bg-white/6">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      aria-label={`Editar ${c.nombre_apellido || "contacto"}`}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-[#6E6E77] transition-colors hover:bg-white hover:text-[#1B5CFF] dark:text-[#8EA0B8] dark:hover:bg-white/10 dark:hover:text-[#4B7CFF]"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => c.id && setConfirmDeleteId(c.id)}
                      aria-label={`Eliminar ${c.nombre_apellido || "contacto"}`}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-[#6E6E77] transition-colors hover:bg-white hover:text-[#C22B2B] dark:text-[#8EA0B8] dark:hover:bg-white/10 dark:hover:text-[#F87171]"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="m6 6 1 14h10l1-14" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {confirmDeleteId === c.id ? (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#F6CFCF] bg-[#FEF2F2] px-3 py-2 dark:border-[#7F1D1D] dark:bg-[#3F1518]">
                  <p className="text-[12px] text-[#C22B2B] dark:text-[#F87171]">¿Eliminar este contacto?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-xl px-2.5 py-1 text-[12px] font-medium text-[#52525B] hover:bg-white dark:text-[#B7C1D1] dark:hover:bg-white/6"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === c.id}
                      onClick={() => c.id && void handleDelete(c.id)}
                      className="rounded-xl bg-[#C22B2B] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#A82424] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === c.id ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {editingId !== null ? (
        <div className="overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]">
          <div className="flex items-center gap-2.5 border-b border-[#E7E7EA] bg-white px-3.5 py-2.5 dark:border-[#273244] dark:bg-[#111827]">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
              <PersonIcon className="size-4" />
            </span>
            <p className="text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
              {editingId === "new" ? "Nuevo contacto" : "Editar contacto"}
            </p>
          </div>

          <div className="space-y-3 p-3">
            {error ? (
              <p className="rounded-[10px] border border-[#F6CFCF] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#C22B2B] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#F87171]" role="alert">
                {error}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor={`${formId}-nombre`}>Nombre completo</Label>
                <Input
                  id={`${formId}-nombre`}
                  value={draft.nombre_apellido}
                  onChange={(e) => setDraft({ ...draft, nombre_apellido: e.target.value.toUpperCase() })}
                  placeholder="Nombre y apellido"
                />
              </div>
              <div>
                <Label htmlFor={`${formId}-puesto`}>Puesto</Label>
                <Input
                  id={`${formId}-puesto`}
                  value={draft.area_puesto}
                  onChange={(e) => setDraft({ ...draft, area_puesto: e.target.value })}
                  placeholder="Ej. Gerente de compras"
                />
              </div>
              <div>
                <Label htmlFor={`${formId}-celular`}>Teléfono</Label>
                <Input
                  id={`${formId}-celular`}
                  type="tel"
                  value={draft.celular}
                  onChange={(e) => setDraft({ ...draft, celular: e.target.value.replace(/\D/g, "") })}
                  placeholder="10 dígitos"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`${formId}-correo`}>Correo</Label>
                <Input
                  id={`${formId}-correo`}
                  type="email"
                  value={draft.correo}
                  onChange={(e) => setDraft({ ...draft, correo: e.target.value })}
                  placeholder="correo@empresa.com"
                />
              </div>
              <div>
                <Label>Principal</Label>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, is_principal: !draft.is_principal })}
                  aria-pressed={draft.is_principal}
                  className="flex h-11 items-center gap-2.5 text-[13px] font-medium text-[#3d3d3a] dark:text-[#cbd5e1]"
                >
                  <span
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      draft.is_principal ? "bg-[#1B5CFF] dark:bg-[#4B7CFF]" : "bg-[#D3D3D8] dark:bg-[#3A4661]"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        draft.is_principal ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </span>
                  {draft.is_principal ? "Sí, es el contacto principal" : "Usar como principal"}
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[13px] font-medium text-[#09090B] transition-colors hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:bg-white/[0.06]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-4 text-[13px] font-semibold text-white transition-colors hover:border-[#1244D1] hover:bg-[#1244D1] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
              >
                {saving ? "Guardando…" : editingId === "new" ? "Agregar contacto" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openNew}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-[#1B5CFF]/40 bg-white text-[13px] font-semibold text-[#1B5CFF] transition-colors hover:bg-[rgba(27,92,255,0.06)] dark:border-[#4B7CFF]/40 dark:bg-transparent dark:text-[#4B7CFF] dark:hover:bg-[rgba(75,124,255,0.08)]"
        >
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgba(27,92,255,0.10)] dark:bg-[rgba(75,124,255,0.16)]">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </span>
          Agregar otro contacto
        </button>
      )}
    </div>
  );
}
