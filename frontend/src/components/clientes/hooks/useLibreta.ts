import { useCallback, useEffect, useState } from "react";

type Item = { id?: number; is_principal?: boolean };

export type LibretaApi<T extends Item, I> = {
  list: (clienteId: number, signal?: AbortSignal) => Promise<T[]>;
  create: (clienteId: number, input: I) => Promise<unknown>;
  update: (id: number, input: I) => Promise<unknown>;
  remove: (id: number) => Promise<void>;
  /** Registro → borrador editable. */
  toInput: (item: T) => I;
  /** Borrador vacío (con `is_principal` si es el primero). */
  empty: (overrides: { is_principal: boolean }) => I;
};

const message = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

/**
 * Estado de una libreta del cliente (contactos o direcciones): carga con
 * cancelación, edición en línea, eliminar con confirmación y marcar principal.
 * La lógica es la misma para ambas; solo cambian los campos.
 */
export function useLibreta<T extends Item, I extends { is_principal: boolean }>(clienteId: number, api: LibretaApi<T, I>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<I>(() => api.empty({ is_principal: false }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  /** Renglón con una acción en curso (eliminar o marcar principal). */
  const [busyId, setBusyId] = useState<number | null>(null);

  const { list } = api;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    list(clienteId, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setItems(rows);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoadError(message(err, "No se pudo cargar la información."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [clienteId, list, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const openNew = () => {
    setDraft(api.empty({ is_principal: items.length === 0 }));
    setError("");
    setConfirmDeleteId(null);
    setEditingId("new");
  };

  const openEdit = (item: T) => {
    if (item.id == null) return;
    setDraft(api.toInput(item));
    setError("");
    setConfirmDeleteId(null);
    setEditingId(item.id);
  };

  const closeEditor = () => {
    setEditingId(null);
    setError("");
  };

  /** `validate` devuelve un mensaje si el borrador no es válido. */
  const save = async (validate: (draft: I) => string | null, normalize: (draft: I) => I = (d) => d) => {
    if (saving || editingId === null) return;
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input = normalize(draft);
      if (editingId === "new") await api.create(clienteId, input);
      else await api.update(editingId, input);
      setEditingId(null);
      reload();
    } catch (err) {
      setError(message(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setBusyId(id);
    setError("");
    try {
      await api.remove(id);
      setConfirmDeleteId(null);
      reload();
    } catch (err) {
      setError(message(err, "No se pudo eliminar."));
    } finally {
      setBusyId(null);
    }
  };

  const makePrincipal = async (item: T) => {
    if (item.is_principal || item.id == null) return;
    setBusyId(item.id);
    setError("");
    try {
      await api.update(item.id, { ...api.toInput(item), is_principal: true });
      reload();
    } catch (err) {
      setError(message(err, "No se pudo actualizar."));
    } finally {
      setBusyId(null);
    }
  };

  return {
    items,
    loading,
    loadError,
    reload,
    editingId,
    draft,
    setDraft,
    saving,
    error,
    confirmDeleteId,
    setConfirmDeleteId,
    busyId,
    openNew,
    openEdit,
    closeEditor,
    save,
    remove,
    makePrincipal,
  };
}
