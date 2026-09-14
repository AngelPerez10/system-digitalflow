export function usuarioComboLabel(u: { first_name: string; last_name: string; email: string }): string {
  return u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email;
}

export function clienteComboSelectedKey(
  clienteId: number | null | undefined,
  contactoId: number | null | undefined,
  itemIds: readonly string[],
): string | null {
  if (clienteId == null) return null;
  const nested = contactoId != null ? `${clienteId}::${contactoId}` : "";
  if (nested && itemIds.includes(nested)) return nested;
  const simple = String(clienteId);
  if (itemIds.includes(simple)) return simple;
  const match = itemIds.find((id) => id === simple || id.startsWith(`${simple}::`));
  return match ?? simple;
}

/** HeroUI/RAC ComboBox clears `selectedKey` if it is not in `items`. Keep the chosen row visible. */
export function withSelectedComboItem<T extends { id: string }>(
  items: T[],
  selectedKey: string | null,
  fallback: T | null,
): T[] {
  if (!selectedKey || !fallback) return items;
  if (items.some((item) => item.id === selectedKey)) return items;
  const injected = { ...fallback, id: selectedKey };
  const createIdx = items.findIndex((item) => item.id === "__new__");
  if (createIdx === -1) return [...items, injected];
  const next = items.slice();
  next.splice(createIdx, 0, injected);
  return next;
}

/** Query vacío = toda la lista. RAC defaultFilter a veces deja 0 filas y no abre el menú. */
export function filterOrdenComboItems<T extends { label: string; description?: string }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const haystack = `${item.label} ${item.description ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
}

/** El modal hace scroll-into-view al enfocar; RAC lo toma como scroll y cierra el ComboBox. */
export function shouldIgnoreComboCloseOnScroll(openedAtMs: number, nowMs = Date.now(), windowMs = 220): boolean {
  return nowMs - openedAtMs < windowMs;
}

export function comboSelectedKeyInItems(selectedKey: string | null, itemIds: readonly string[]): string | null {
  if (!selectedKey) return null;
  return itemIds.includes(selectedKey) ? selectedKey : null;
}
