/**
 * Tras elegir una opción `isAction` (p. ej. «Nuevo Cliente») el padre suele abrir
 * otro modal. Si re-enfocamos el combobox, `onFocus` volvería a abrir el listbox
 * (portal con z-index por encima del modal) y tapa el diálogo.
 *
 * Para opciones normales sí se mantiene el foco en el input, pero el listbox
 * debe quedarse cerrado (SearchableSelect suprime el open en ese focus).
 */
export function shouldKeepComboboxFocusAfterCommit(
  option?: { isAction?: boolean } | null,
): boolean {
  return !option?.isAction;
}
