import { startTransition, useCallback, useEffect, useRef, useState } from "react";

/**
 * Valor local urgente para inputs controlados + commit diferido al padre.
 * Evita que cada tecla re-renderice de inmediato un árbol pesado (listado +
 * pestañas del modal) y mantiene la escritura responsive.
 *
 * Mientras el campo tiene foco, ignora `external` (rellenos externos no pisan
 * lo que se está tecleando). En blur hace flush síncrono para que Guardar /
 * validación vean el valor final.
 */
export function useBufferedTextField(
  external: string,
  commit: (next: string) => void,
): {
  value: string;
  onChange: (next: string) => void;
  onFocus: () => void;
  onBlur: () => void;
} {
  const [value, setValue] = useState(external);
  const focusedRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (!focusedRef.current) {
      setValue(external);
    }
  }, [external]);

  const onChange = useCallback((next: string) => {
    valueRef.current = next;
    setValue(next);
    startTransition(() => {
      commitRef.current(next);
    });
  }, []);

  const onFocus = useCallback(() => {
    focusedRef.current = true;
  }, []);

  const onBlur = useCallback(() => {
    focusedRef.current = false;
    commitRef.current(valueRef.current);
  }, []);

  return { value, onChange, onFocus, onBlur };
}
