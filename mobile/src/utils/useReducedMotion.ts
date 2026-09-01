import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Preferencia de movimiento reducido del sistema. Se consulta una vez y se
 * escucha el cambio: el usuario puede activarla con la app abierta.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let activo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (activo) setReduced(valor);
      })
      .catch(() => undefined);

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (valor) => {
      if (activo) setReduced(valor);
    });

    return () => {
      activo = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
