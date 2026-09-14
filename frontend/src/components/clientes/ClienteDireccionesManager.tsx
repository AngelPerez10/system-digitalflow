import { useEffect, useId, useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import type { ClienteDireccion } from "@/types/cliente";
import { estadosPorPais, paisOptions } from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";
import {
  type ClienteDireccionInput,
  createClienteDireccion,
  deleteClienteDireccion,
  emptyClienteDireccionInput,
  listClienteDirecciones,
  updateClienteDireccion,
} from "./clienteDireccionesApi";
import { isGoogleMapsLink, modalTextareaClass, selectLikeClassName } from "./clienteFormShared";

type Props = {
  clienteId: number;
};

function direccionResumen(d: ClienteDireccion): string {
  const linea1 = [d.calle, d.numero_exterior].filter(Boolean).join(" ");
  const linea2 = [d.colonia, d.ciudad, d.estado].filter(Boolean).join(", ");
  const resumen = [linea1, linea2].filter(Boolean).join(" — ");
  if (resumen) return resumen;
  return d.direccion.trim() || "Sin datos capturados";
}

function draftFromDireccion(d: ClienteDireccion): ClienteDireccionInput {
  return {
    etiqueta: d.etiqueta,
    direccion: d.direccion,
    calle: d.calle,
    numero_exterior: d.numero_exterior,
    interior: d.interior,
    colonia: d.colonia,
    localidad: d.localidad,
    municipio: d.municipio,
    codigo_postal: d.codigo_postal,
    ciudad: d.ciudad,
    pais: d.pais,
    estado: d.estado,
    is_principal: d.is_principal,
  };
}

/**
 * Libreta de direcciones del cliente — mismo patrón que Mercado Libre / Amazon:
 * lista de tarjetas (una por sucursal/domicilio), "Predeterminada" marcada,
 * agregar/editar/eliminar sin salir del modal.
 */
export function ClienteDireccionesManager({ clienteId }: Props) {
  const formId = useId();
  const [direcciones, setDirecciones] = useState<ClienteDireccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<ClienteDireccionInput>(emptyClienteDireccionInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const reload = async () => {
    setLoading(true);
    const rows = await listClienteDirecciones(clienteId);
    setDirecciones(rows);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const estadosOptions = estadosPorPais[draft.pais] || estadosPorPais["México"] || [];

  const openNew = () => {
    setDraft(emptyClienteDireccionInput({ is_principal: direcciones.length === 0 }));
    setError("");
    setEditingId("new");
  };

  const openEdit = (d: ClienteDireccion) => {
    setDraft(draftFromDireccion(d));
    setError("");
    setEditingId(d.id);
  };

  const closeForm = () => {
    setEditingId(null);
    setError("");
  };

  const handleSave = async () => {
    if (!draft.etiqueta.trim() && !draft.calle.trim() && !draft.direccion.trim()) {
      setError("Captura al menos la etiqueta o la calle de la dirección.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId === "new") {
        await createClienteDireccion(clienteId, draft);
      } else if (typeof editingId === "number") {
        await updateClienteDireccion(editingId, draft);
      }
      await reload();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la dirección.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteClienteDireccion(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la dirección.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleMakePrincipal = async (d: ClienteDireccion) => {
    if (d.is_principal) return;
    try {
      await updateClienteDireccion(d.id, { ...draftFromDireccion(d), is_principal: true });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la dirección predeterminada.");
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
        <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Cargando direcciones…</p>
      ) : direcciones.length === 0 && editingId === null ? (
        <p className="rounded-[12px] border border-dashed border-[#D3D3D8] bg-white px-3 py-3 text-[13px] text-[#6E6E77] dark:border-[#3A4661] dark:bg-[#111827] dark:text-[#8EA0B8]">
          Este cliente todavía no tiene direcciones registradas.
        </p>
      ) : (
        <ul className="space-y-2">
          {direcciones.map((d) => (
            <li
              key={d.id}
              className="rounded-[12px] border border-[#E7E7EA] bg-white p-3 dark:border-[#273244] dark:bg-[#111827]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                      {d.etiqueta.trim() || "Sin nombre"}
                    </p>
                    {d.is_principal ? (
                      <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[rgba(4,114,77,0.10)] px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]">
                        Predeterminada
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#52525B] dark:text-[#B7C1D1]">
                    {direccionResumen(d)}
                  </p>
                  {isGoogleMapsLink(d.direccion) ? (
                    <a
                      href={d.direccion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B5CFF] hover:underline dark:text-[#4B7CFF]"
                    >
                      Ver en Google Maps
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!d.is_principal ? (
                    <button
                      type="button"
                      onClick={() => void handleMakePrincipal(d)}
                      className="rounded-[8px] px-2 py-1 text-[11px] font-semibold text-[#1244D1] underline-offset-2 hover:underline dark:text-[#4B7CFF]"
                    >
                      Marcar predeterminada
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openEdit(d)}
                    aria-label={`Editar ${d.etiqueta || "dirección"}`}
                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-[#6E6E77] transition-colors hover:bg-[#FAFAFA] hover:text-[#1B5CFF] dark:text-[#8EA0B8] dark:hover:bg-white/[0.06] dark:hover:text-[#4B7CFF]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(d.id)}
                    aria-label={`Eliminar ${d.etiqueta || "dirección"}`}
                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-[#6E6E77] transition-colors hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:text-[#8EA0B8] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="m6 6 1 14h10l1-14" />
                    </svg>
                  </button>
                </div>
              </div>

              {confirmDeleteId === d.id ? (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#F6CFCF] bg-[#FEF2F2] px-3 py-2 dark:border-[#7F1D1D] dark:bg-[#3F1518]">
                  <p className="text-[12px] text-[#C22B2B] dark:text-[#F87171]">¿Eliminar esta dirección?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-[8px] px-2.5 py-1 text-[12px] font-medium text-[#52525B] hover:bg-white dark:text-[#B7C1D1] dark:hover:bg-white/[0.06]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === d.id}
                      onClick={() => void handleDelete(d.id)}
                      className="rounded-[8px] bg-[#C22B2B] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#A82424] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === d.id ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {editingId !== null ? (
        <div className="space-y-3 rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] p-3 dark:border-[#273244] dark:bg-[#1B2539]">
          {error ? (
            <p className="rounded-[10px] border border-[#F6CFCF] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#C22B2B] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#F87171]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-etiqueta`}>Nombre de la dirección</Label>
              <Input
                id={`${formId}-etiqueta`}
                value={draft.etiqueta}
                onChange={(e) => setDraft({ ...draft, etiqueta: e.target.value })}
                placeholder="Ej. Sucursal Centro, Bodega Norte"
              />
            </div>
            <div className="flex items-end">
              <label className="flex h-11 items-center gap-2 text-[13px] font-medium text-[#3d3d3a] dark:text-[#cbd5e1]">
                <input
                  type="checkbox"
                  checked={draft.is_principal}
                  onChange={(e) => setDraft({ ...draft, is_principal: e.target.checked })}
                  className="h-4 w-4 rounded border-[#D3D3D8] text-[#1B5CFF] focus:ring-[#1B5CFF] focus:ring-offset-0"
                />
                Usar como predeterminada
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor={`${formId}-direccion`}>Referencia / link de Google Maps</Label>
            <textarea
              id={`${formId}-direccion`}
              rows={2}
              value={draft.direccion}
              onChange={(e) => setDraft({ ...draft, direccion: e.target.value })}
              className={modalTextareaClass}
              placeholder="Dirección, coordenadas o URL de Google Maps"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-calle`}>Calle</Label>
              <Input
                id={`${formId}-calle`}
                value={draft.calle}
                onChange={(e) => setDraft({ ...draft, calle: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`${formId}-ext`}>No. Ext</Label>
                <Input
                  id={`${formId}-ext`}
                  value={draft.numero_exterior}
                  onChange={(e) => setDraft({ ...draft, numero_exterior: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`${formId}-int`}>No. Int</Label>
                <Input
                  id={`${formId}-int`}
                  value={draft.interior}
                  onChange={(e) => setDraft({ ...draft, interior: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-cp`}>Código Postal</Label>
              <Input
                id={`${formId}-cp`}
                value={draft.codigo_postal}
                onChange={(e) => setDraft({ ...draft, codigo_postal: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`${formId}-colonia`}>Colonia</Label>
              <Input
                id={`${formId}-colonia`}
                value={draft.colonia}
                onChange={(e) => setDraft({ ...draft, colonia: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-ciudad`}>Ciudad</Label>
              <Input
                id={`${formId}-ciudad`}
                value={draft.ciudad}
                onChange={(e) => setDraft({ ...draft, ciudad: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`${formId}-localidad`}>Localidad</Label>
              <Input
                id={`${formId}-localidad`}
                value={draft.localidad}
                onChange={(e) => setDraft({ ...draft, localidad: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-estado`}>Estado</Label>
              <select
                id={`${formId}-estado`}
                value={draft.estado}
                onChange={(e) => setDraft({ ...draft, estado: e.target.value })}
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
              <Label htmlFor={`${formId}-pais`}>País</Label>
              <select
                id={`${formId}-pais`}
                value={draft.pais}
                onChange={(e) => {
                  const pais = e.target.value;
                  const nextEstados = estadosPorPais[pais] || estadosPorPais["México"] || [];
                  const nextEstado = nextEstados.includes(draft.estado) ? draft.estado : "";
                  setDraft({ ...draft, pais, estado: nextEstado });
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
              {saving ? "Guardando…" : editingId === "new" ? "Agregar dirección" : "Guardar cambios"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openNew}
          className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-dashed border-[#1B5CFF]/40 bg-white px-3.5 text-[13px] font-semibold text-[#1B5CFF] transition-colors hover:bg-[rgba(27,92,255,0.06)] dark:border-[#4B7CFF]/40 dark:bg-transparent dark:text-[#4B7CFF] dark:hover:bg-[rgba(75,124,255,0.08)]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Agregar otra dirección
        </button>
      )}
    </div>
  );
}
