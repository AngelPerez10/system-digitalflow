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
