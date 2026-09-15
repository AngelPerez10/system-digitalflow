/**
 * Tras elegir una opción `isAction` (p. ej. «Nuevo Cliente») el padre suele abrir
 * otro modal. Si re-enfocamos el combobox, `onFocus` vuelve a abrir el listbox
 * (portal con z-index por encima del modal) y tapa el diálogo.
 */
export function shouldKeepComboboxFocusAfterCommit(
  option?: { isAction?: boolean } | null,
): boolean {
  return !option?.isAction;
}
